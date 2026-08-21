const mongoose = require('mongoose');
const s = new mongoose.Schema({ doctorProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile', required: true }, scheduledAt: { type: Date, required: true }, patientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, expiresAt: { type: Date, required: true } }, { timestamps: true });
s.index({ doctorProfileId: 1, scheduledAt: 1 }, { unique: true });
s.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('SlotHold', s);