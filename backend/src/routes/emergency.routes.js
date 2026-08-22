const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const PatientProfile = require('../models/PatientProfile');

const router = express.Router();

// POST /api/emergency/sos - Trigger emergency SOS
router.post('/sos', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user.id;
    const patientProfile = await PatientProfile.findOne({ userId }).populate('userId', 'firstName lastName phone');

    if (!patientProfile) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    const { latitude, longitude } = req.body;

    // In a real application, this would trigger external services (SMS, Hospital routing, etc.)
    // For now, we mock the emergency workflow response.
    
    // Mock nearest hospital
    const nearestHospital = {
      name: "City Central Hospital",
      distance: "2.4 km",
      eta: "8 mins",
      phone: "+1 800-EMERGENCY"
    };

    res.json({
      success: true,
      message: 'SOS Activated. Emergency contacts and nearest hospital notified.',
      patientProfile: {
        bloodGroup: patientProfile.bloodGroup || 'Unknown',
        allergies: patientProfile.allergies || 'None recorded',
        medicalHistory: patientProfile.medicalHistory || 'None recorded',
        emergencyContact: patientProfile.emergencyContact || 'Not set',
      },
      nearestHospital,
      location: { latitude, longitude }
    });
  } catch (error) {
    console.error('Error triggering SOS:', error);
    res.status(500).json({ error: 'Failed to trigger SOS' });
  }
});

module.exports = router;
