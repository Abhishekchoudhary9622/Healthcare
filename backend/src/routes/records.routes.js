const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const PatientProfile = require('../models/PatientProfile');
const MedicalRecord = require('../models/MedicalRecord');
const Appointment = require('../models/Appointment'); // Assuming Appointment exists

const router = express.Router();

// GET /api/records/timeline - Get all medical history for a patient
router.get('/timeline', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user.id;
    const patientProfile = await PatientProfile.findOne({ userId });

    if (!patientProfile) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    // Fetch medical records
    let records = await MedicalRecord.find({ patientProfileId: patientProfile._id })
      .populate('doctorId')
      .sort({ date: -1 });
    
    // Seed some mock data if none exist (for demo purposes as requested by user's ChatGPT chat!)
    if (records.length === 0) {
      const mockRecords = [
        {
          patientProfileId: patientProfile._id,
          type: 'BLOOD_TEST',
          title: 'Complete Blood Count (CBC)',
          description: 'Routine annual blood test. All levels normal except slightly low Vitamin D.',
          date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 1 month ago
        },
        {
          patientProfileId: patientProfile._id,
          type: 'PRESCRIPTION',
          title: 'Vitamin D Supplements',
          description: 'Prescribed Cholecalciferol 60,000 IU weekly for 8 weeks.',
          date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
        },
        {
          patientProfileId: patientProfile._id,
          type: 'CONSULTATION',
          title: 'General Checkup',
          description: 'Patient reported minor fatigue. Advised better diet and sun exposure.',
          date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 3 months ago
        }
      ];
      await MedicalRecord.insertMany(mockRecords);
      records = await MedicalRecord.find({ patientProfileId: patientProfile._id }).sort({ date: -1 });
    }

    res.json(records);
  } catch (error) {
    console.error('Error fetching medical records:', error);
    res.status(500).json({ error: 'Failed to fetch medical records' });
  }
});

module.exports = router;
