const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  patientProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientProfile', required: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile' },
  type: { type: String, enum: ['CONSULTATION', 'BLOOD_TEST', 'PRESCRIPTION', 'ECG', 'X_RAY', 'OTHER'], required: true },
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true, default: Date.now },
  fileUrl: { type: String }, // For uploaded reports
  metadata: { type: mongoose.Schema.Types.Mixed } // Flexible for extra data (e.g. meds prescribed)
}, { timestamps: true });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
