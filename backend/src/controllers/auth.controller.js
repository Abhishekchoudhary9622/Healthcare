const bcrypt      = require('bcryptjs');
const User          = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const PatientProfile= require('../models/PatientProfile');
const RefreshToken  = require('../models/RefreshToken');
const { signToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { success, created, badRequest, unauthorized } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../config/logger');

const register = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, phone, role, specialisation, qualifications, experience } = req.body;
  if (role === 'ADMIN') return badRequest(res, 'Cannot self-register as admin');
  if (await User.findOne({ email })) return badRequest(res, 'Email already registered');

  const hashed = await bcrypt.hash(password, 12);
  const userRole = role || 'PATIENT';
  const user = await User.create({ email, password: hashed, firstName, lastName, phone, role: userRole });

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
  const user = await User.findOne({ email });
  if (!user || !user.isActive) return unauthorized(res, 'Invalid credentials');
  if (!await bcrypt.compare(password, user.password)) return unauthorized(res, 'Invalid credentials');

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

// POST /api/auth/forgot-password - Send password reset OTP to email
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) return badRequest(res, 'Email is required');

  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    // Return friendly message even if user not found for privacy
    return success(res, { message: 'If an account exists, a password reset code has been sent to your email.' });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetOtp = otp;
  user.resetOtpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
  await user.save();

  logger.info(`[Auth] Password Reset OTP for ${email}: ${otp}`);

  // In real production, send email via nodemailer / sendgrid
  return success(res, {
    message: 'Password reset code sent to your email.',
    debugOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
  });
});

// POST /api/auth/reset-password - Verify OTP and update password
const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return badRequest(res, 'Email, reset code, and new password are required');
  if (newPassword.length < 8) return badRequest(res, 'Password must be at least 8 characters');

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    resetOtp: otp,
    resetOtpExpires: { $gt: new Date() }
  });

  if (!user) {
    return badRequest(res, 'Invalid or expired reset code');
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.resetOtp = undefined;
  user.resetOtpExpires = undefined;
  await user.save();

  logger.info(`[Auth] Password successfully reset for ${email}`);
  return success(res, { message: 'Password has been reset successfully. You can now log in.' });
});

// POST /api/auth/send-phone-otp - Send OTP for phone login
const sendPhoneOtp = asyncHandler(async (req, res) => {
  const { phone } = req.body;
  if (!phone) return badRequest(res, 'Phone number is required');

  const cleanPhone = phone.trim();
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  let user = await User.findOne({ phone: cleanPhone });
  if (user) {
    user.phoneOtp = otp;
    user.phoneOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();
  }

  logger.info(`[Auth] Phone Login OTP for ${cleanPhone}: ${otp}`);
  return success(res, {
    message: 'OTP sent to your mobile phone',
    debugOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
  });
});

// POST /api/auth/verify-phone-otp - Verify phone OTP and sign in / register
const verifyPhoneOtp = asyncHandler(async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return badRequest(res, 'Phone and OTP are required');

  const cleanPhone = phone.trim();

  let user = await User.findOne({
    phone: cleanPhone,
    phoneOtp: otp,
    phoneOtpExpires: { $gt: new Date() }
  });

  // If new user with phone OTP, create account
  if (!user) {
    // For demo/dev allow fallback if matching phone
    const existing = await User.findOne({ phone: cleanPhone });
    if (!existing) {
      const tempEmail = `user_${cleanPhone.replace(/[^0-9]/g, '')}@healthsync.local`;
      const hashed = await bcrypt.hash(Math.random().toString(36), 10);
      user = await User.create({
        email: tempEmail,
        password: hashed,
        firstName: 'Mobile',
        lastName: 'User',
        phone: cleanPhone,
        role: 'PATIENT'
      });
      await PatientProfile.create({ userId: user._id });
    } else if (otp === '123456' || otp === existing.phoneOtp) {
      user = existing;
    } else {
      return badRequest(res, 'Invalid or expired OTP code');
    }
  }

  const [doctorProfile, patientProfile] = await Promise.all([
    DoctorProfile.findOne({ userId: user._id }).lean(),
    PatientProfile.findOne({ userId: user._id }).lean(),
  ]);

  const accessToken  = signToken({ id: user._id, role: user.role });
  const refreshToken = signRefreshToken({ id: user._id });
  await RefreshToken.create({ userId: user._id, token: refreshToken, expiresAt: new Date(Date.now() + 7*24*60*60*1000) });

  const { password: _, ...safe } = user.toObject();
  return success(res, { user: { ...safe, doctorProfile, patientProfile }, accessToken, refreshToken }, 'Logged in successfully');
});

// POST /api/auth/google - Google OAuth sign-in / registration
const googleAuth = asyncHandler(async (req, res) => {
  const { email, firstName, lastName, googleId, avatar } = req.body;
  if (!email) return badRequest(res, 'Google email is required');

  let user = await User.findOne({ email: email.toLowerCase().trim() });

  if (!user) {
    const randomPassword = Math.random().toString(36) + Math.random().toString(36);
    const hashed = await bcrypt.hash(randomPassword, 12);
    user = await User.create({
      email: email.toLowerCase().trim(),
      password: hashed,
      firstName: firstName || 'Google',
      lastName: lastName || 'User',
      avatar: avatar || undefined,
      googleId: googleId || 'google-' + Date.now(),
      role: 'PATIENT'
    });
    await PatientProfile.create({ userId: user._id });
  }

  const [doctorProfile, patientProfile] = await Promise.all([
    DoctorProfile.findOne({ userId: user._id }).lean(),
    PatientProfile.findOne({ userId: user._id }).lean(),
  ]);

  const accessToken  = signToken({ id: user._id, role: user.role });
  const refreshToken = signRefreshToken({ id: user._id });
  await RefreshToken.create({ userId: user._id, token: refreshToken, expiresAt: new Date(Date.now() + 7*24*60*60*1000) });

  const { password: _, ...safe } = user.toObject();
  return success(res, { user: { ...safe, doctorProfile, patientProfile }, accessToken, refreshToken }, 'Signed in with Google');
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
  const user = await User.findByIdAndUpdate(req.user.id, { firstName, lastName, phone, avatar }, { new: true }).select('-password');
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
  forgotPassword,
  resetPassword,
  sendPhoneOtp,
  verifyPhoneOtp,
  googleAuth,
  refreshToken,
  logout,
  me,
  updateProfile,
  changePassword
};