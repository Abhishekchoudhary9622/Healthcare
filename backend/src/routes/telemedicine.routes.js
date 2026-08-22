const express = require('express');
const router = express.Router();
const TelemedicineSession = require('../models/TelemedicineSession');
const DoctorProfile = require('../models/DoctorProfile');
const PatientProfile = require('../models/PatientProfile');
const { authenticate } = require('../middleware/auth');

// POST /api/telemedicine/session - Create or retrieve a telemedicine room
router.post('/session', authenticate, async (req, res) => {
  try {
    const { appointmentId, doctorId, patientId, roomId } = req.body;
    const finalRoomId = roomId || `room-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

    let session = await TelemedicineSession.findOne({ roomId: finalRoomId });
    if (!session) {
      session = await TelemedicineSession.create({
        roomId: finalRoomId,
        appointmentId,
        doctorId,
        patientId,
        status: 'IN_PROGRESS',
        startedAt: new Date()
      });
    }

    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/telemedicine/session/:roomId - Get room session details
router.get('/session/:roomId', authenticate, async (req, res) => {
  try {
    let session = await TelemedicineSession.findOne({ roomId: req.params.roomId })
      .populate({ path: 'doctorId', populate: { path: 'userId', select: 'firstName lastName email avatar' } })
      .populate({ path: 'patientId', populate: { path: 'userId', select: 'firstName lastName email' } });

    if (!session) {
      // Auto-create room for testing if not existing
      session = await TelemedicineSession.create({
        roomId: req.params.roomId,
        status: 'IN_PROGRESS',
        startedAt: new Date()
      });
    }

    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/telemedicine/session/:roomId/message - Send in-call chat message
router.post('/session/:roomId/message', authenticate, async (req, res) => {
  try {
    const { text, senderRole, senderName } = req.body;
    const session = await TelemedicineSession.findOne({ roomId: req.params.roomId });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    session.chatMessages.push({
      senderRole: senderRole || req.user.role,
      senderName: senderName || `${req.user.firstName} ${req.user.lastName}`,
      text,
      timestamp: new Date()
    });

    await session.save();
    res.json({ success: true, data: session.chatMessages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/telemedicine/session/:roomId/update-notes - Doctor updates live prescription & notes
router.put('/session/:roomId/update-notes', authenticate, async (req, res) => {
  try {
    const { inCallNotes, prescribedMeds, diagnosis, followUpRecommendation } = req.body;
    const session = await TelemedicineSession.findOne({ roomId: req.params.roomId });

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (inCallNotes !== undefined) session.inCallNotes = inCallNotes;
    if (prescribedMeds !== undefined) session.prescribedMeds = prescribedMeds;
    if (diagnosis !== undefined) session.diagnosis = diagnosis;
    if (followUpRecommendation !== undefined) session.followUpRecommendation = followUpRecommendation;

    await session.save();
    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/telemedicine/session/:roomId/end - End consultation session
router.put('/session/:roomId/end', authenticate, async (req, res) => {
  try {
    const session = await TelemedicineSession.findOne({ roomId: req.params.roomId });
    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    session.status = 'COMPLETED';
    session.endedAt = new Date();
    await session.save();

    res.json({ success: true, data: session });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
