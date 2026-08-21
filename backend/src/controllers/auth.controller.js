const bcrypt      = require('bcryptjs');
const User          = require('../models/User');
const DoctorProfile = require('../models/DoctorProfile');
const PatientProfile= require('../models/PatientProfile');
const RefreshToken  = require('../models/RefreshToken');
const { signToken, signRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { success, created, badRequest, unauthorized } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');

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

module.exports = { register, login, refreshToken, logout, me, updateProfile, changePassword };