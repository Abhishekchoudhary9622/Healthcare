const Consultation = require('../models/Consultation');
const Appointment = require('../models/Appointment');
const DoctorProfile = require('../models/DoctorProfile');
const PatientProfile = require('../models/PatientProfile');
const MedicalRecord = require('../models/MedicalRecord');
const User = require('../models/User');
const { success, badRequest, notFound, forbidden } = require('../utils/response');
const asyncHandler = require('../utils/asyncHandler');
const { generatePostVisitSummary } = require('../services/llm.service');
const logger = require('../config/logger');

// Standard Public STUN Servers & WebRTC ICE Configuration
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' }
];

// GET /api/consultation/room/:roomId - Get or create consultation session & verify permissions
const getRoomDetails = asyncHandler(async (req, res) => {
  const { roomId } = req.params;
  const currentUserId = req.user.id;

  let consultation = await Consultation.findOne({ roomId })
    .populate({ path: 'appointmentId' })
    .populate({ path: 'patientUserId', select: 'firstName lastName email avatar phone' })
    .populate({ path: 'doctorUserId', select: 'firstName lastName email avatar phone' });

  // If consultation does not exist yet, extract appointmentId and create it
  if (!consultation) {
    const appointmentId = roomId.replace('consultation_', '').replace('room_', '');
    const appointment = await Appointment.findById(appointmentId)
      .populate({ path: 'doctorProfileId', populate: { path: 'userId' } })
      .populate({ path: 'patientProfileId', populate: { path: 'userId' } });

    if (!appointment) {
      return notFound(res, 'Appointment associated with this consultation room was not found.');
    }

    const patientUserId = appointment.patientProfileId?.userId?._id;
    const doctorUserId = appointment.doctorProfileId?.userId?._id;

    if (!patientUserId || !doctorUserId) {
      return badRequest(res, 'Invalid appointment configuration');
    }

    consultation = await Consultation.create({
      appointmentId: appointment._id,
      roomId,
      patientUserId,
      doctorUserId,
      status: 'SCHEDULED'
    });

    consultation = await Consultation.findById(consultation._id)
      .populate({ path: 'appointmentId' })
      .populate({ path: 'patientUserId', select: 'firstName lastName email avatar phone' })
      .populate({ path: 'doctorUserId', select: 'firstName lastName email avatar phone' });
  }

  // Security Check: Verify user is the patient, doctor, or admin
  const isPatient = consultation.patientUserId?._id?.toString() === currentUserId;
  const isDoctor = consultation.doctorUserId?._id?.toString() === currentUserId;
  const isAdmin = req.user.role === 'ADMIN';

  if (!isPatient && !isDoctor && !isAdmin) {
    return forbidden(res, 'You are not authorized to join this consultation session.');
  }

  // Fetch doctor's specialisation
  const doctorProfile = await DoctorProfile.findOne({ userId: consultation.doctorUserId?._id }).lean();

  return success(res, {
    consultation,
    doctorProfile,
    role: isDoctor ? 'DOCTOR' : (isPatient ? 'PATIENT' : 'ADMIN'),
    iceServers: ICE_SERVERS
  });
});

// POST /api/consultation/complete - Doctor submits clinical notes, prescriptions & wraps up
const completeConsultation = asyncHandler(async (req, res) => {
  const { roomId, clinicalNotes, prescriptions = [], followUpDate } = req.body;
  const currentUserId = req.user.id;

  const consultation = await Consultation.findOne({ roomId })
    .populate('appointmentId')
    .populate('patientUserId');

  if (!consultation) return notFound(res, 'Consultation not found');

  if (consultation.doctorUserId.toString() !== currentUserId && req.user.role !== 'ADMIN') {
    return forbidden(res, 'Only the attending doctor can complete the consultation notes.');
  }

  const now = new Date();
  consultation.status = 'COMPLETED';
  consultation.endedAt = now;
  consultation.clinicalNotes = clinicalNotes || '';
  consultation.prescriptions = prescriptions;
  if (followUpDate) consultation.followUpDate = new Date(followUpDate);

  if (consultation.startedAt) {
    consultation.durationSeconds = Math.round((now - consultation.startedAt) / 1000);
  }
  await consultation.save();

  // Update Appointment status and attach prescriptions
  await Appointment.updateOne(
    { _id: consultation.appointmentId._id },
    {
      status: 'COMPLETED',
      clinicalNotes: clinicalNotes || '',
      prescriptions: prescriptions
    }
  );

  // Auto-generate EHR Medical Record for Patient
  const patientProfile = await PatientProfile.findOne({ userId: consultation.patientUserId._id });
  if (patientProfile) {
    const doctorUser = await User.findById(consultation.doctorUserId);
    await MedicalRecord.create({
      patientProfileId: patientProfile._id,
      title: `Telemedicine Consultation with Dr. ${doctorUser?.lastName || 'Specialist'}`,
      category: 'CONSULTATION',
      recordDate: now,
      doctorName: `Dr. ${doctorUser?.firstName} ${doctorUser?.lastName}`,
      hospitalName: 'HealthSync Virtual Clinic',
      notes: clinicalNotes || 'Virtual consultation completed.',
      prescriptions: prescriptions
    });
  }

  // Trigger post-visit summary generation asynchronously
  generatePostVisitSummary(consultation.appointmentId._id.toString(), clinicalNotes).catch(err => {
    logger.error(`[Post-Visit LLM Error] ${err.message}`);
  });

  return success(res, {
    message: 'Consultation successfully recorded and synced to Patient EHR.',
    consultation
  });
});

// GET /api/consultation/active-for-user - Check if logged in user has upcoming / active video call
const getActiveConsultation = asyncHandler(async (req, res) => {
  const currentUserId = req.user.id;
  const isDoctor = req.user.role === 'DOCTOR';

  const query = {
    status: { $in: ['WAITING', 'ACTIVE'] },
    ...(isDoctor ? { doctorUserId: currentUserId } : { patientUserId: currentUserId })
  };

  const activeConsultation = await Consultation.findOne(query)
    .populate({ path: 'appointmentId' })
    .populate({ path: 'patientUserId', select: 'firstName lastName email avatar' })
    .populate({ path: 'doctorUserId', select: 'firstName lastName email avatar' })
    .sort({ updatedAt: -1 });

  return success(res, { activeConsultation });
});

module.exports = {
  getRoomDetails,
  completeConsultation,
  getActiveConsultation
};
