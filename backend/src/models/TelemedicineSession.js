const mongoose = require('mongoose');

const telemedicineSessionSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'DoctorProfile' },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'PatientProfile' },
  status: {
    type: String,
    enum: ['WAITING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
    default: 'WAITING'
  },
  startedAt: { type: Date },
  endedAt: { type: Date },
  inCallNotes: { type: String, default: '' },
  prescribedMeds: [{
    name: String,
    dosage: String,
    frequency: String,
    duration: String,
    instructions: String
  }],
  diagnosis: { type: String, default: '' },
  followUpRecommendation: { type: String, default: '' },
  chatMessages: [{
    senderRole: { type: String, enum: ['DOCTOR', 'PATIENT'] },
    senderName: String,
    text: String,
    timestamp: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('TelemedicineSession', telemedicineSessionSchema);
