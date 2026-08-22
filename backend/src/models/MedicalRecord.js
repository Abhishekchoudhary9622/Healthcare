const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  patientProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientProfile', required: true, index: true },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile' },
  doctorName: { type: String },
  type: {
    type: String,
    enum: ['CONSULTATION', 'BLOOD_TEST', 'PRESCRIPTION', 'ECG', 'X_RAY', 'IMMUNIZATION', 'VITAL_LOG', 'DIAGNOSIS', 'OTHER'],
    required: true
  },
  title: { type: String, required: true },
  description: { type: String },
  date: { type: Date, required: true, default: Date.now },
  fileUrl: { type: String },
  attachments: [{
    fileName: String,
    fileType: String,
    fileSize: String,
    url: String
  }],
  vitals: {
    bloodPressure: String,
    heartRate: Number,
    temperature: Number,
    bloodGlucose: Number,
    bmi: Number,
    weight: Number,
    height: Number
  },
  labResults: [{
    testName: String,
    value: String,
    unit: String,
    referenceRange: String,
    status: { type: String, enum: ['NORMAL', 'LOW', 'HIGH', 'CRITICAL'], default: 'NORMAL' }
  }],
  prescriptions: [{
    medicationName: String,
    dosage: String,
    frequency: String,
    duration: String,
    instructions: String
  }],
  allergies: [{ type: String }],
  metadata: { type: mongoose.Schema.Types.Mixed }
}, { timestamps: true });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
