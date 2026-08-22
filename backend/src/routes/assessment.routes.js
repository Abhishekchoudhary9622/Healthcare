const express = require('express');
const { analyzeHealthRisk } = require('../services/llm.service');
const { authenticate, authorize } = require('../middleware/auth');
const PatientProfile = require('../models/PatientProfile');
const DoctorProfile = require('../models/DoctorProfile');
const HealthAssessment = require('../models/HealthAssessment');

const router = express.Router();

// POST /api/assessments/analyze - Patient creates a new risk assessment
router.post('/analyze', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { symptoms, vitals } = req.body;
    const userId = req.user.id; // user id from Mongoose auth token

    // Get patient profile
    const patientProfile = await PatientProfile.findOne({ userId }).populate('userId', 'firstName lastName phone');

    if (!patientProfile) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    // Call LLM for analysis
    const analysis = await analyzeHealthRisk(patientProfile, symptoms, vitals);

    // Save assessment to database
    const assessment = await HealthAssessment.create({
      patientProfileId: patientProfile._id,
      symptoms: symptoms || '',
      vitals: JSON.stringify(vitals || {}),
      riskScore: analysis.riskScore,
      riskLevel: analysis.riskLevel,
      shapExplanations: JSON.stringify(analysis.shapExplanations),
      recommendations: analysis.recommendations,
      recommendedSpecialties: JSON.stringify(analysis.recommendedSpecialties)
    });

    // Find recommended doctors based on specialties
    let recommendedDoctors = [];
    if (analysis.recommendedSpecialties && analysis.recommendedSpecialties.length > 0) {
      // Basic regex search for specialties
      const regexConditions = analysis.recommendedSpecialties.map(spec => ({
        specialisation: { $regex: spec, $options: 'i' }
      }));
      
      recommendedDoctors = await DoctorProfile.find({
        isVerified: true,
        $or: regexConditions
      }).populate('userId', 'firstName lastName avatar').limit(5);

      // Fallback if none found with exact match, get random top doctors
      if (recommendedDoctors.length === 0) {
        recommendedDoctors = await DoctorProfile.find({ isVerified: true })
          .populate('userId', 'firstName lastName avatar')
          .limit(3);
      }
    }
    
    // Structure like what the frontend expects
    const formattedDoctors = recommendedDoctors.map(doc => ({
      id: doc._id.toString(),
      specialisation: doc.specialisation,
      experience: doc.experience,
      user: doc.userId
    }));

    res.status(201).json({
      assessment: {
        id: assessment._id.toString(),
        patientProfileId: assessment.patientProfileId,
        symptoms: assessment.symptoms,
        vitals: JSON.parse(assessment.vitals),
        riskScore: assessment.riskScore,
        riskLevel: assessment.riskLevel,
        shapExplanations: JSON.parse(assessment.shapExplanations),
        recommendations: assessment.recommendations,
        recommendedSpecialties: JSON.parse(assessment.recommendedSpecialties),
        createdAt: assessment.createdAt
      },
      recommendedDoctors: formattedDoctors
    });
  } catch (error) {
    console.error('Error analyzing health risk:', error);
    res.status(500).json({ error: 'Failed to analyze health risk' });
  }
});

// GET /api/assessments/history - Get patient's assessment history
router.get('/history', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const userId = req.user.id;
    const patientProfile = await PatientProfile.findOne({ userId });

    if (!patientProfile) {
      return res.status(404).json({ error: 'Patient profile not found' });
    }

    const assessments = await HealthAssessment.find({ patientProfileId: patientProfile._id })
      .sort({ createdAt: -1 });

    const formatted = assessments.map(a => ({
      id: a._id.toString(),
      patientProfileId: a.patientProfileId,
      symptoms: a.symptoms,
      vitals: a.vitals ? JSON.parse(a.vitals) : {},
      riskScore: a.riskScore,
      riskLevel: a.riskLevel,
      shapExplanations: a.shapExplanations ? JSON.parse(a.shapExplanations) : [],
      recommendations: a.recommendations,
      recommendedSpecialties: a.recommendedSpecialties ? JSON.parse(a.recommendedSpecialties) : [],
      createdAt: a.createdAt
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching assessment history:', error);
    res.status(500).json({ error: 'Failed to fetch assessment history' });
  }
});

module.exports = router;
