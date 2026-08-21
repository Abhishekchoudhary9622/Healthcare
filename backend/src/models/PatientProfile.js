const mongoose = require('mongoose');
const s = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true }, dateOfBirth: Date, gender: String, bloodGroup: String, allergies: String, medicalHistory: String, address: String, emergencyContact: String }, { timestamps: true });
module.exports = mongoose.model('PatientProfile', s);