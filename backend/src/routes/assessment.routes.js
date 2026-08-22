const express = require('express');
const { analyzeHealthRisk } = require('../services/llm.service');
const { authenticate, authorize } = require('../middleware/auth');
const PatientProfile = require('../models/PatientProfile');
const DoctorProfile = require('../models/DoctorProfile');
const HealthAssessment = require('../models/HealthAssessment');

const router = express.Router();

// ML Clinical Risk Calculators
function calculateCVDScore(params) {
  const { age = 45, gender = 'MALE', systolicBP = 120, totalChol = 180, hdl = 50, isSmoker = false, hasDiabetes = false } = params;
  let score = 0;

  // Age points
  if (age < 35) score += 0;
  else if (age < 40) score += 2;
  else if (age < 45) score += 5;
  else if (age < 50) score += 7;
  else if (age < 55) score += 8;
  else if (age < 60) score += 10;
  else if (age < 65) score += 11;
  else score += 13;

  // Total Cholesterol
  if (totalChol >= 240) score += 3;
  else if (totalChol >= 200) score += 2;
  else if (totalChol >= 160) score += 1;

  // HDL (protective if high)
  if (hdl >= 60) score -= 2;
  else if (hdl < 40) score += 2;

  // Systolic BP
  if (systolicBP >= 160) score += 4;
  else if (systolicBP >= 140) score += 3;
  else if (systolicBP >= 130) score += 2;
  else if (systolicBP >= 120) score += 1;

  // Smoking & Diabetes
  if (isSmoker) score += 4;
  if (hasDiabetes) score += 3;

  // Map score to probability %
  const probability = Math.min(85, Math.max(2, Math.round(score * 2.8)));
  let riskLevel = 'LOW';
  if (probability >= 40) riskLevel = 'CRITICAL';
  else if (probability >= 20) riskLevel = 'HIGH';
  else if (probability >= 10) riskLevel = 'MEDIUM';

  const drivers = [];
  if (systolicBP >= 130) drivers.push({ factor: 'Elevated Systolic Blood Pressure', impact: '+18%' });
  if (totalChol >= 200) drivers.push({ factor: 'High Total Cholesterol', impact: '+15%' });
  if (isSmoker) drivers.push({ factor: 'Tobacco / Smoking Exposure', impact: '+25%' });
  if (hdl < 40) drivers.push({ factor: 'Suboptimal HDL (Good) Cholesterol', impact: '+12%' });
  if (age >= 50) drivers.push({ factor: 'Age Bracket Factor', impact: '+14%' });
  if (hasDiabetes) drivers.push({ factor: 'Glycemic Dysregulation', impact: '+22%' });

  return {
    score,
    probability,
    riskLevel,
    drivers: drivers.length > 0 ? drivers : [{ factor: 'Optimal baseline metrics', impact: '-10%' }]
  };
}

function calculateDiabetesScore(params) {
  const { age = 45, bmi = 24, physicalActivityHours = 3, familyHistory = false, highBP = false } = params;
  let points = 0;

  if (age >= 65) points += 4;
  else if (age >= 55) points += 3;
  else if (age >= 45) points += 2;

  if (bmi >= 30) points += 3;
  else if (bmi >= 25) points += 2;

  if (physicalActivityHours < 2) points += 2;
  if (familyHistory) points += 3;
  if (highBP) points += 2;

  const probability = Math.min(80, Math.max(3, Math.round(points * 6.5)));
  let riskLevel = 'LOW';
  if (probability >= 40) riskLevel = 'HIGH';
  else if (probability >= 20) riskLevel = 'MEDIUM';

  const drivers = [];
  if (bmi >= 25) drivers.push({ factor: `Elevated BMI (${bmi})`, impact: '+24%' });
  if (familyHistory) drivers.push({ factor: 'First-degree Family History', impact: '+20%' });
  if (physicalActivityHours < 2) drivers.push({ factor: 'Sedentary Lifestyle (<2h/week)', impact: '+16%' });
  if (highBP) drivers.push({ factor: 'Hypertension Comorbidity', impact: '+15%' });

  return {
    points,
    probability,
    riskLevel,
    drivers: drivers.length > 0 ? drivers : [{ factor: 'Healthy BMI and active lifestyle', impact: '-15%' }]
  };
}

function calculateStrokeScore(params) {
  const { age = 45, systolicBP = 120, hasHypertension = false, hasDiabetes = false, hasHeartDisease = false } = params;
  let points = 0;

  if (age >= 75) points += 2;
  else if (age >= 65) points += 1;

  if (hasHypertension || systolicBP >= 140) points += 1;
  if (hasDiabetes) points += 1;
  if (hasHeartDisease) points += 2;

  const probability = Math.min(65, Math.max(1, Math.round(points * 7.5 + 2)));
  let riskLevel = 'LOW';
  if (probability >= 25) riskLevel = 'HIGH';
  else if (probability >= 10) riskLevel = 'MEDIUM';

  return {
    points,
    probability,
    riskLevel
  };
}

// POST /api/assessments/ml-predict - Deterministic ML Clinical Risk Prediction & Doctor Matchmaking
router.post('/ml-predict', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { modelType = 'CVD', parameters = {} } = req.body;

    let prediction = {};
    let recommendedSpecialties = ['General Physician'];
    let recommendations = '';

    if (modelType === 'CVD') {
      prediction = calculateCVDScore(parameters);
      recommendedSpecialties = prediction.riskLevel === 'HIGH' || prediction.riskLevel === 'CRITICAL'
        ? ['Cardiologist', 'Cardiac Surgeon', 'General Physician']
        : ['General Physician', 'Cardiologist'];
      recommendations = prediction.riskLevel === 'LOW'
        ? 'Maintain your healthy cardiovascular habits with regular aerobic exercise and a Mediterranean-style diet.'
        : 'Schedule a lipid profile re-check and consult a cardiologist to review blood pressure and cholesterol targets.';
    } else if (modelType === 'DIABETES') {
      prediction = calculateDiabetesScore(parameters);
      recommendedSpecialties = prediction.riskLevel === 'HIGH'
        ? ['Endocrinologist', 'Diabetologist', 'General Physician']
        : ['General Physician', 'Nutritionist'];
      recommendations = prediction.riskLevel === 'LOW'
        ? 'Your risk of developing Type 2 Diabetes is low. Keep up balanced meal intake and active exercise.'
        : 'Consider taking an HbA1c fasting glucose test and consulting an endocrinologist for lifestyle modification advice.';
    } else {
      prediction = calculateStrokeScore(parameters);
      recommendedSpecialties = ['Neurologist', 'Cardiologist', 'General Physician'];
      recommendations = 'Manage blood pressure within optimal limits (<120/80 mmHg) and maintain good hydration and sleep.';
    }

    // Match real doctors in DB
    const regexConditions = recommendedSpecialties.map(spec => ({
      specialisation: { $regex: spec, $options: 'i' }
    }));

    let doctors = await DoctorProfile.find({
      isVerified: true,
      $or: regexConditions
    }).populate('userId', 'firstName lastName avatar email phone').limit(4);

    if (doctors.length === 0) {
      doctors = await DoctorProfile.find({ isVerified: true })
        .populate('userId', 'firstName lastName avatar email phone')
        .limit(3);
    }

    const formattedDoctors = doctors.map(doc => ({
      id: doc._id.toString(),
      specialisation: doc.specialisation,
      experience: doc.experience,
      consultationFee: doc.consultationFee || 75,
      rating: doc.rating || 4.9,
      user: doc.userId
    }));

    res.json({
      success: true,
      data: {
        modelType,
        prediction,
        recommendations,
        recommendedSpecialties,
        recommendedDoctors: formattedDoctors,
        evaluatedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error calculating ML prediction:', error);
    res.status(500).json({ error: 'Failed to calculate ML prediction' });
  }
});

// POST /api/assessments/analyze - Patient creates a new LLM risk assessment
router.post('/analyze', authenticate, authorize('PATIENT'), async (req, res) => {
  try {
    const { symptoms, vitals } = req.body;
    const userId = req.user.id;

    let patientProfile = await PatientProfile.findOne({ userId }).populate('userId', 'firstName lastName phone');
    if (!patientProfile) {
      patientProfile = await PatientProfile.create({ userId });
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

    let recommendedDoctors = [];
    if (analysis.recommendedSpecialties && analysis.recommendedSpecialties.length > 0) {
      const regexConditions = analysis.recommendedSpecialties.map(spec => ({
        specialisation: { $regex: spec, $options: 'i' }
      }));
      
      recommendedDoctors = await DoctorProfile.find({
        isVerified: true,
        $or: regexConditions
      }).populate('userId', 'firstName lastName avatar email phone').limit(5);

      if (recommendedDoctors.length === 0) {
        recommendedDoctors = await DoctorProfile.find({ isVerified: true })
          .populate('userId', 'firstName lastName avatar email phone')
          .limit(3);
      }
    }
    
    const formattedDoctors = recommendedDoctors.map(doc => ({
      id: doc._id.toString(),
      specialisation: doc.specialisation,
      experience: doc.experience,
      consultationFee: doc.consultationFee || 80,
      rating: doc.rating || 4.9,
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
    let patientProfile = await PatientProfile.findOne({ userId });
    if (!patientProfile) {
      patientProfile = await PatientProfile.create({ userId });
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
