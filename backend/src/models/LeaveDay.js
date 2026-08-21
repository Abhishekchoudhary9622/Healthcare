const mongoose = require('mongoose');
const s = new mongoose.Schema({ doctorProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile', required: true }, date: { type: Date, required: true }, reason: String }, { timestamps: true });
s.index({ doctorProfileId: 1, date: 1 }, { unique: true });
module.exports = mongoose.model('LeaveDay', s);