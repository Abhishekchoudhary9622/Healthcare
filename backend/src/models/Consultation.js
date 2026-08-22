const mongoose = require('mongoose');

const prescriptionItemSchema = new mongoose.Schema({
  medicationName: { type: String, required: true },
  dosage:         { type: String, required: true },
  frequency:      { type: String, required: true },
  durationDays:   { type: Number, default: 7 },
  instructions:   { type: String, default: '' },
}, { _id: false });

const chatMessageSchema = new mongoose.Schema({
  senderId:   { type: String, required: true },
  senderName: { type: String, required: true },
  senderRole: { type: String, enum: ['PATIENT', 'DOCTOR', 'SYSTEM'], required: true },
  text:       { type: String, required: true },
  timestamp:  { type: Date, default: Date.now }
}, { _id: false });

const consultationSchema = new mongoose.Schema({
  appointmentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true, index: true },
  roomId:          { type: String, required: true, unique: true, index: true },
  patientUserId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  doctorUserId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  status: {
    type: String,
    enum: ['SCHEDULED', 'WAITING', 'ACTIVE', 'COMPLETED', 'CANCELLED'],
    default: 'SCHEDULED',
    index: true
  },
  startedAt:       { type: Date },
  endedAt:         { type: Date },
  durationSeconds: { type: Number, default: 0 },
  patientJoinedAt: { type: Date },
  doctorJoinedAt:  { type: Date },
  
  // Clinical outcomes
  clinicalNotes:    { type: String, default: '' },
  prescriptions:    [prescriptionItemSchema],
  followUpDate:     { type: Date },
  postVisitSummary: { type: String, default: '' },
  
  // In-call real-time chat history
  chatMessages:     [chatMessageSchema],
}, { timestamps: true });

module.exports = mongoose.model('Consultation', consultationSchema);
