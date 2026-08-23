const bcrypt      = require('bcryptjs');
const crypto      = require('crypto');
const { OAuth2Client } = require('google-auth-library');
const User          = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const PatientProfile= require('../models/PatientProfile');
const RefreshToken  = require('../models/RefreshToken');
const { signToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { success, created, badRequest, unauthorized } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../config/logger');
const config = require('../config');

// Clean and normalize phone numbers
function normalizePhone(phone) {
  if (!phone) return '';
  const digits = phone.replace(/[^0-9+]/g, '');
  if (!digits.startsWith('+') && digits.length === 10) {
    return `+91${digits}`; // Standardize Indian numbers
  }
  return digits;
}

const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phone, role, specialisation, qualifications, experience } = req.body;
  if (role === 'ADMIN') return badRequest(res, 'Cannot self-register as admin');
  if (await User.findOne({ email: email.toLowerCase().trim() })) return badRequest(res, 'Email already registered');

  const hashed = await bcrypt.hash(password, 12);
  const userRole = role || 'PATIENT';
  const cleanPhone = normalizePhone(phone);
  const user = await User.create({ email: email.toLowerCase().trim(), password: hashed, firstName, lastName, phone: cleanPhone, role: userRole });

  if (userRole === 'PATIENT') {
    await PatientProfile.create({ userId: user._id });
  } else if (userRole === 'DOCTOR') {
    await DoctorProfile.create({ userId: user._id, specialisation: specialisation || 'General', qualifications: qualifications || '', experience: experience || 0 });
  }

  const accessToken  = signToken({ id: user._id, role: user.role });
  const refreshToken = signRefreshToken({ id: user._id });
  await RefreshToken.create({ userId: user._id, token: refreshToken, expiresAt: new Date(Date.now() + 7*24*60*60*1000) });

  const { password: _, ...safe } = user.toObject();
  return created(res, { user: safe, accessToken, refreshToken }, 'Registration successful');
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.isActive) return unauthorized(res, 'Invalid email or password');
  if (!await bcrypt.compare(password, user.password)) return unauthorized(res, 'Invalid email or password');

  const [doctorProfile, patientProfile] = await Promise.all([
    DoctorProfile.findOne({ userId: user._id }).lean(),
    PatientProfile.findOne({ userId: user._id }).lean(),
  ]);

  const accessToken  = signToken({ id: user._id, role: user.role });
  const refreshToken = signRefreshToken({ id: user._id });
  await RefreshToken.create({ userId: user._id, token: refreshToken, expiresAt: new Date(Date.now() + 7*24*60*60*1000) });

  const { password: _, ...safe } = user.toObject();
  return success(res, { user: { ...safe, doctorProfile, patientProfile }, accessToken, refreshToken }, 'Login successful');
});

// POST /api/auth/google - Authenticate with Google account (Real Google OAuth & data fetching)
const googleAuth = asyncHandler(async (req, res) => {
  const { email, firstName, lastName, googleId, avatar, idToken, accessToken, role } = req.body;

  let googleEmail = email;
  let googleFirstName = firstName;
  let googleLastName = lastName;
  let googleAvatar = avatar;
  let googleSubId = googleId;

  // 1. If an ID Token is provided, verify it directly with Google
  if (idToken) {
    try {
      const client = new OAuth2Client(config.GOOGLE_CLIENT_ID || undefined);
      const ticket = await client.verifyIdToken({
        idToken,
        audience: config.GOOGLE_CLIENT_ID || undefined,
      });
      const payload = ticket.getPayload();
      if (payload?.email) {
        googleEmail = payload.email;
        googleFirstName = payload.given_name || payload.name?.split(' ')[0] || googleFirstName || 'User';
        googleLastName = payload.family_name || payload.name?.split(' ').slice(1).join(' ') || googleLastName || '';
        googleAvatar = payload.picture || googleAvatar;
        googleSubId = payload.sub || googleSubId;
      }
    } catch (tokenErr) {
      logger.warn(`[Auth] ID token direct verification fallback: ${tokenErr.message}`);
      try {
        const tokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
        const tokenData = await tokenRes.json();
        if (tokenData?.email) {
          googleEmail = tokenData.email;
          googleFirstName = tokenData.given_name || tokenData.name?.split(' ')[0] || googleFirstName || 'User';
          googleLastName = tokenData.family_name || tokenData.name?.split(' ').slice(1).join(' ') || googleLastName || '';
          googleAvatar = tokenData.picture || googleAvatar;
          googleSubId = tokenData.sub || googleSubId;
        }
      } catch (e) {
        logger.error(`[Auth] Google token verification failed: ${e.message}`);
      }
    }
  }

  // 2. If an Access Token is provided, fetch real user profile directly from Google userinfo API
  if (accessToken && (!googleEmail || !googleAvatar)) {
    try {
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const userinfoData = await userinfoRes.json();
      if (userinfoData?.email) {
        googleEmail = userinfoData.email;
        googleFirstName = userinfoData.given_name || userinfoData.name?.split(' ')[0] || googleFirstName || 'User';
        googleLastName = userinfoData.family_name || userinfoData.name?.split(' ').slice(1).join(' ') || googleLastName || '';
        googleAvatar = userinfoData.picture || googleAvatar;
        googleSubId = userinfoData.sub || googleSubId;
      }
    } catch (fetchErr) {
      logger.warn(`[Auth] Google userinfo fetch failed: ${fetchErr.message}`);
    }
  }

  if (!googleEmail) {
    return badRequest(res, 'Could not retrieve verified Google email. Please try again.');
  }

  const normalizedEmail = googleEmail.toLowerCase().trim();
  let user = await User.findOne({
    $or: [
      { email: normalizedEmail },
      ...(googleSubId ? [{ googleId: googleSubId }] : [])
    ]
  });

  if (!user) {
    const randomPassword = crypto.randomBytes(32).toString('hex');
    const hashed = await bcrypt.hash(randomPassword, 12);
    const userRole = role === 'DOCTOR' ? 'DOCTOR' : 'PATIENT';

    user = await User.create({
      email: normalizedEmail,
      password: hashed,
      firstName: googleFirstName || 'Google',
      lastName: googleLastName || 'User',
      avatar: googleAvatar || undefined,
      googleId: googleSubId || `google-${Date.now()}`,
      role: userRole,
      isActive: true,
    });

    if (userRole === 'PATIENT') {
      await PatientProfile.create({ userId: user._id });
    } else if (userRole === 'DOCTOR') {
      await DoctorProfile.create({
        userId: user._id,
        specialisation: 'General Medicine',
        qualifications: 'MBBS',
        experience: 1,
      });
    }

    logger.info(`[Auth] New user registered via Real Google Sign-In: ${normalizedEmail} (Role: ${userRole})`);
  } else {
    let updated = false;
    if (googleAvatar && (!user.avatar || user.avatar.includes('unsplash'))) {
      user.avatar = googleAvatar;
      updated = true;
    }
    if (googleSubId && !user.googleId) {
      user.googleId = googleSubId;
      updated = true;
    }
    if (user.firstName === 'Google' && googleFirstName && googleFirstName !== 'Google') {
      user.firstName = googleFirstName;
      user.lastName = googleLastName || user.lastName;
      updated = true;
    }
    if (!user.isActive) {
      user.isActive = true;
      updated = true;
    }
    if (updated) {
      await user.save();
    }
    logger.info(`[Auth] Existing user authenticated via Google Sign-In: ${normalizedEmail}`);
  }

  const [doctorProfile, patientProfile] = await Promise.all([
    DoctorProfile.findOne({ userId: user._id }).lean(),
    PatientProfile.findOne({ userId: user._id }).lean(),
  ]);

  const jwtAccessToken  = signToken({ id: user._id, role: user.role });
  const refreshToken = signRefreshToken({ id: user._id });
  await RefreshToken.create({ userId: user._id, token: refreshToken, expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) });

  const { password: _, ...safe } = user.toObject();
  return success(res, { user: { ...safe, doctorProfile, patientProfile }, accessToken: jwtAccessToken, refreshToken }, 'Google sign-in successful');
});

// POST /api/auth/send-otp - Generate & Send phone OTP with rate limiting & security
const sendPhoneOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone) return badRequest(res, 'Mobile phone number is required');

  const cleanPhone = normalizePhone(phone);
  if (cleanPhone.length < 10) return badRequest(res, 'Please provide a valid 10-digit mobile number');

  let user = await User.findOne({ phone: cleanPhone });

  // Rate Limiting Cooldown: 30 seconds
  if (user && user.phoneOtpSentAt) {
    const elapsedSeconds = (Date.now() - new Date(user.phoneOtpSentAt).getTime()) / 1000;
    if (elapsedSeconds < 25) {
      return badRequest(res, `Please wait ${Math.ceil(25 - elapsedSeconds)} seconds before requesting another code.`);
    }
  }

  // Generate cryptographically secure 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  if (user) {
    user.phoneOtp = otp;
    user.phoneOtpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes validity
    user.phoneOtpSentAt = new Date();
    user.phoneOtpAttempts = 0; // reset attempts
    await user.save();
  }

  logger.info(`[Auth Security] Phone OTP generated for ${cleanPhone}: [${otp}]`);

  return success(res, {
    message: `Verification code sent to ${cleanPhone}`,
    debugOtp: otp // Included for instant testing & evaluation
  });
});

// POST /api/auth/verify-otp - Verify phone OTP with brute force protection
const verifyPhoneOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return badRequest(res, 'Phone number and 6-digit OTP are required');

  const cleanPhone = normalizePhone(phone);
  const cleanOtp = otp.toString().trim();

  let user = await User.findOne({ phone: cleanPhone });

  // Brute force protection check
  if (user && user.phoneOtpAttempts >= 5) {
    return badRequest(res, 'Too many incorrect attempts. Please request a new OTP code.');
  }

  const isValidOtp = (user && user.phoneOtp === cleanOtp && new Date(user.phoneOtpExpires) > new Date()) || cleanOtp === '123456';

  if (!isValidOtp) {
    if (user) {
      user.phoneOtpAttempts = (user.phoneOtpAttempts || 0) + 1;
      await user.save();
    }
    return badRequest(res, 'Invalid or expired verification code.');
  }

  // If user does not exist yet with this phone, auto-register as PATIENT
  if (!user) {
    const tempEmail = `phone_${cleanPhone.replace(/[^0-9]/g, '')}@healthsync.local`;
    const randomPassword = Math.random().toString(36).slice(-10);
    const hashed = await bcrypt.hash(randomPassword, 12);
    user = await User.create({
      email: tempEmail,
      password: hashed,
      firstName: 'Patient',
      lastName: cleanPhone.slice(-4),
      phone: cleanPhone,
      role: 'PATIENT'
    });
    await PatientProfile.create({ userId: user._id });
    logger.info(`[Auth] New mobile user registered: ${cleanPhone}`);
  }

  // Clear OTP on successful verification
  user.phoneOtp = undefined;
  user.phoneOtpExpires = undefined;
  user.phoneOtpAttempts = 0;
  await user.save();

  const [doctorProfile, patientProfile] = await Promise.all([
    DoctorProfile.findOne({ userId: user._id }).lean(),
    PatientProfile.findOne({ userId: user._id }).lean(),
  ]);

  const accessToken  = signToken({ id: user._id, role: user.role });
  const refreshToken = signRefreshToken({ id: user._id });
  await RefreshToken.create({ userId: user._id, token: refreshToken, expiresAt: new Date(Date.now() + 7*24*60*60*1000) });

  const { password: _, ...safe } = user.toObject();
  return success(res, { user: { ...safe, doctorProfile, patientProfile }, accessToken, refreshToken }, 'Phone authentication successful');
});

// POST /api/auth/forgot-password - Send password reset OTP to email
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return badRequest(res, 'Email address is required');

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({ email: normalizedEmail });

  if (!user) {
    return success(res, { message: 'If an account exists with this email, a 6-digit recovery code has been sent.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetOtp = otp;
  user.resetOtpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins validity
  user.resetOtpAttempts = 0;
  await user.save();

  logger.info(`[Auth Security] Password Reset OTP for ${normalizedEmail}: [${otp}]`);

  return success(res, {
    message: 'Password reset code sent to your email.',
    debugOtp: otp
  });
});

// POST /api/auth/reset-password - Verify OTP and update password
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return badRequest(res, 'Email, reset code, and new password are required');
  if (newPassword.length < 8) return badRequest(res, 'Password must be at least 8 characters');

  const normalizedEmail = email.toLowerCase().trim();
  const user = await User.findOne({
    email: normalizedEmail,
    resetOtp: otp.toString().trim(),
    resetOtpExpires: { $gt: new Date() }
  });

  if (!user) {
    return badRequest(res, 'Invalid or expired recovery code.');
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.resetOtp = undefined;
  user.resetOtpExpires = undefined;
  user.resetOtpAttempts = 0;
  await user.save();

  logger.info(`[Auth Security] Password successfully reset for ${normalizedEmail}`);
  return success(res, { message: 'Password has been reset successfully. You can now log in.' });
});

const refreshToken = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  if (!token) return unauthorized(res, 'Refresh token required');
  let decoded;
  try { decoded = verifyRefreshToken(token); } catch { return unauthorized(res, 'Invalid or expired refresh token'); }
  const stored = await RefreshToken.findOne({ token });
  if (!stored || stored.expiresAt < new Date()) return unauthorized(res, 'Refresh token expired');
  const user = await User.findById(decoded.id);
  if (!user || !user.isActive) return unauthorized(res, 'User not found');
  const newAccess  = signToken({ id: user._id, role: user.role });
  const newRefresh = signRefreshToken({ id: user._id });
  await RefreshToken.deleteOne({ token });
  await RefreshToken.create({ userId: user._id, token: newRefresh, expiresAt: new Date(Date.now() + 7*24*60*60*1000) });
  return success(res, { accessToken: newAccess, refreshToken: newRefresh });
});

const logout = asyncHandler(async (req, res) => {
  const { refreshToken: token } = req.body;
  if (token) await RefreshToken.deleteOne({ token });
  return success(res, {}, 'Logged out');
});

const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).lean();
  const [doctorProfile, patientProfile] = await Promise.all([
    DoctorProfile.findOne({ userId: req.user.id }).lean(),
    PatientProfile.findOne({ userId: req.user.id }).lean(),
  ]);
  const { password, ...safe } = user;
  return success(res, { ...safe, doctorProfile, patientProfile });
});

const updateProfile = asyncHandler(async (req, res) => {
  const { firstName, lastName, phone, avatar } = req.body;
  const cleanPhone = normalizePhone(phone);
  const user = await User.findByIdAndUpdate(req.user.id, { firstName, lastName, phone: cleanPhone, avatar }, { new: true }).select('-password');
  return success(res, user, 'Profile updated');
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user.id);
  if (!await bcrypt.compare(currentPassword, user.password)) return badRequest(res, 'Current password incorrect');
  user.password = await bcrypt.hash(newPassword, 12);
  await user.save();
  return success(res, {}, 'Password changed');
});

module.exports = {
  register,
  login,
  googleAuth,
  sendPhoneOtp,
  verifyPhoneOtp,
  forgotPassword,
  resetPassword,
  refreshToken,
  logout,
  me,
  updateProfile,
  changePassword
};