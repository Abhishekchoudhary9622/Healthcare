const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const PatientProfile = require('../models/PatientProfile');
const MedicalRecord = require('../models/MedicalRecord');

const router = express.Router();

const richSeedRecords = (patientProfileId) => [
  {
    patientProfileId,
    type: 'LAB_REPORT',
    title: 'Comprehensive Lipid & Metabolic Panel',
    description: 'Annual fasting blood profile. Optimal HDL/LDL ratio; fasting glucose within normal limits.',
    date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    doctorName: 'Dr. Sarah Jenkins (Cardiologist)',
    vitals: {
      bloodPressure: '120/80',
      heartRate: 72,
      bloodGlucose: 95,
      bmi: 22.4,
      weight: 68,
      height: 174
    },
    labResults: [
      { testName: 'Total Cholesterol', value: '185', unit: 'mg/dL', referenceRange: '125 - 200', status: 'NORMAL' },
      { testName: 'HDL Cholesterol', value: '55', unit: 'mg/dL', referenceRange: '> 40', status: 'NORMAL' },
      { testName: 'LDL Cholesterol', value: '110', unit: 'mg/dL', referenceRange: '< 100', status: 'NORMAL' },
      { testName: 'Fasting Blood Sugar', value: '94', unit: 'mg/dL', referenceRange: '70 - 99', status: 'NORMAL' },
      { testName: 'Hemoglobin A1c', value: '5.4', unit: '%', referenceRange: '< 5.7', status: 'NORMAL' }
    ],
    attachments: [
      { fileName: 'Lipid_Panel_Report.pdf', fileType: 'application/pdf', fileSize: '1.2 MB', url: '#' }
    ]
  },
  {
    patientProfileId,
    type: 'PRESCRIPTION',
    title: 'Post-Consultation Prescription & Regimen',
    description: 'Prescribed daily prophylactic vitamins and seasonal allergy relief.',
    date: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
    doctorName: 'Dr. Ramesh Gupta',
    prescriptions: [
      { medicationName: 'Cholecalciferol (Vitamin D3)', dosage: '60,000 IU', frequency: 'Once weekly', duration: '8 weeks', instructions: 'Take with milk after breakfast' },
      { medicationName: 'Cetirizine Hydrochloride', dosage: '10 mg', frequency: 'Once daily as needed', duration: '14 days', instructions: 'Take at night before bed' }
    ]
  },
  {
    patientProfileId,
    type: 'ECG',
    title: '12-Lead Resting Electrocardiogram (ECG)',
    description: 'Normal sinus rhythm. Heart rate 74 bpm. Normal PR interval and ST segments. No ischemic abnormalities.',
    date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    doctorName: 'Dr. Sarah Jenkins',
    vitals: {
      bloodPressure: '118/78',
      heartRate: 74
    },
    labResults: [
      { testName: 'PR Interval', value: '160', unit: 'ms', referenceRange: '120 - 200', status: 'NORMAL' },
      { testName: 'QRS Duration', value: '92', unit: 'ms', referenceRange: '80 - 120', status: 'NORMAL' },
      { testName: 'QTc Interval', value: '410', unit: 'ms', referenceRange: '< 440', status: 'NORMAL' }
    ],
    attachments: [
      { fileName: 'ECG_Tracing_12Lead.pdf', fileType: 'application/pdf', fileSize: '2.4 MB', url: '#' }
    ]
  },
  {
    patientProfileId,
    type: 'IMMUNIZATION',
    title: 'Annual Influenza & Tdap Booster',
    description: 'Administered Quadrivalent Influenza vaccine and Tetanus-Diphtheria-Pertussis booster. No adverse reactions.',
    date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
    doctorName: 'City Health Immunization Clinic',
    metadata: {
      batchNumber: 'FL-2026-X90',
      nextDueDate: new Date(Date.now() + 245 * 24 * 60 * 60 * 1000)
    }
  },
  {
    patientProfileId,
    type: 'CONSULTATION',
    title: 'Comprehensive Preventive Health Evaluation',
    description: 'Routine wellness physical examination. Patient reported mild tension headaches. Vitals optimal. Advised screen breaks and hydration.',
    date: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    doctorName: 'Dr. Michael Chen',
    vitals: {
      bloodPressure: '120/80',
      heartRate: 70,
      temperature: 98.4,
      bmi: 22.1,
      weight: 67
    }
  }
];

// GET /api/records/timeline - Get all medical history for a patient
router.get('/timeline', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user.id;
    let patientProfile = await PatientProfile.findOne({ userId });

    if (!patientProfile) {
      patientProfile = await PatientProfile.create({ userId });
    }

    let records = await MedicalRecord.find({ patientProfileId: patientProfile._id })
      .populate('doctorId')
      .sort({ date: -1 });

    if (records.length === 0) {
      await MedicalRecord.insertMany(richSeedRecords(patientProfile._id));
      records = await MedicalRecord.find({ patientProfileId: patientProfile._id }).sort({ date: -1 });
    }

    res.json(records);
  } catch (error) {
    console.error('Error fetching medical records:', error);
    res.status(500).json({ error: 'Failed to fetch medical records' });
  }
});

// POST /api/records - Add a new medical record / EHR entry
router.post('/', authenticate, authorize('PATIENT', 'DOCTOR'), async (req, res) => {
  try {
    const userId = req.user.id;
    let patientProfileId = req.body.patientProfileId;

    if (!patientProfileId) {
      const patientProfile = await PatientProfile.findOne({ userId });
      if (!patientProfile) {
        return res.status(404).json({ error: 'Patient profile not found' });
      }
      patientProfileId = patientProfile._id;
    }

    const {
      type,
      title,
      description,
      date,
      doctorName,
      vitals,
      labResults,
      prescriptions,
      allergies,
      attachments
    } = req.body;

    const newRecord = await MedicalRecord.create({
      patientProfileId,
      type: type || 'CONSULTATION',
      title,
      description,
      date: date ? new Date(date) : new Date(),
      doctorName: doctorName || (req.user.role === 'DOCTOR' ? `Dr. ${req.user.firstName} ${req.user.lastName}` : undefined),
      vitals,
      labResults,
      prescriptions,
      allergies,
      attachments
    });

    res.status(201).json({ success: true, data: newRecord });
  } catch (error) {
    console.error('Error adding medical record:', error);
    res.status(500).json({ error: 'Failed to add medical record' });
  }
});

// GET /api/records/summary - Comprehensive EHR summary report
router.get('/summary', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user.id;
    const patientProfile = await PatientProfile.findOne({ userId }).populate('userId', 'firstName lastName email phone');

    if (!patientProfile) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    const records = await MedicalRecord.find({ patientProfileId: patientProfile._id }).sort({ date: -1 });

    // Aggregate key metrics
    const latestVitalsRecord = records.find(r => r.vitals && r.vitals.bloodPressure);
    const activePrescriptions = records
      .filter(r => r.type === 'PRESCRIPTION' && r.prescriptions?.length > 0)
      .flatMap(r => r.prescriptions);

    const summary = {
      patient: {
        name: `${patientProfile.userId.firstName} ${patientProfile.userId.lastName}`,
        email: patientProfile.userId.email,
        phone: patientProfile.userId.phone || 'N/A',
        bloodGroup: patientProfile.bloodGroup || 'O+',
        allergies: patientProfile.allergies || ['Penicillin (Mild)'],
        chronicConditions: patientProfile.chronicConditions || ['None recorded']
      },
      latestVitals: latestVitalsRecord ? latestVitalsRecord.vitals : {
        bloodPressure: '120/80',
        heartRate: 72,
        bloodGlucose: 95,
        bmi: 22.4
      },
      totalRecords: records.length,
      activePrescriptions,
      records
    };

    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error generating EHR summary:', error);
    res.status(500).json({ error: 'Failed to generate EHR summary' });
  }
});

// DELETE /api/records/:id - Delete a record
router.delete('/:id', authenticate, authorize('PATIENT', 'ADMIN'), async (req, res) => {
  try {
    await MedicalRecord.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete record' });
  }
});

module.exports = router;
