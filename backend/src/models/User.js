const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email:     { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:  { type: String, required: true },
  role:      { type: String, enum: ['PATIENT', 'DOCTOR', 'ADMIN', 'DRIVER'], required: true, default: 'PATIENT' },
  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, required: true, trim: true },
  phone:     { type: String },
  avatar:    { type: String },
  googleId:  { type: String },
  resetOtp:  { type: String },
  resetOtpExpires: { type: Date },
  phoneOtp:  { type: String },
  phoneOtpExpires: { type: Date },
  isActive:  { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);