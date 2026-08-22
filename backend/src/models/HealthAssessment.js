const mongoose = require('mongoose');

const healthAssessmentSchema = new mongoose.Schema({
  patientProfileId: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientProfile', required: true },
  symptoms: { type: String, default: '' },
  vitals: { type: String, default: '{}' },
  riskScore: { type: Number, required: true },
  riskLevel: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], required: true },
  shapExplanations: { type: String, default: '[]' },
  recommendations: { type: String, default: '' },
  recommendedSpecialties: { type: String, default: '[]' }
}, { timestamps: true });

module.exports = mongoose.model('HealthAssessment', healthAssessmentSchema);
