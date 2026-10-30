/**
 * HealthSync Clinical AI API Routes
 * Authenticated endpoints connecting patient and doctor portals to the Python AI microservice.
 */
const express = require('express');
const router = express.Router();
const aiService = require('../services/ai.service');
const { authenticate } = require('../middleware/auth');
const { success, error } = require('../utils/response');

// Apply authentication to all AI routes
router.use(authenticate);

/**
 * @route   POST /api/ai/ask
 * @desc    Submit general query to multi-agent supervisor (Knowledge, Symptoms, Meds, etc.)
 * @access  Private (Patient, Doctor, Admin)
 */
router.post('/ask', async (req, res) => {
  try {
    const { query, targetAgent, context } = req.body;
    if (!query || typeof query !== 'string') {
      return error(res, 'Valid query string is required', 400);
    }

    const patientContext = {
      ...(context || {}),
      userRole: req.user.role,
      userName: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim()
    };

    const response = await aiService.runAgentWorkflow(
      query,
      req.user.id,
      patientContext,
      targetAgent || null
    );

    return success(res, response, 'AI agent workflow executed successfully');
  } catch (err) {
    return error(res, `AI Assistant failed: ${err.message}`, 500);
  }
});

/**
 * @route   POST /api/ai/symptom-triage
 * @desc    Triage symptoms, evaluate clinical urgency and emergency red-flags
 * @access  Private (Patient)
 */
router.post('/symptom-triage', async (req, res) => {
  try {
    const { symptoms, duration, severity, additionalNotes } = req.body;
    if (!symptoms) {
      return error(res, 'Symptoms description is required', 400);
    }

    const query = `Patient reports symptoms: ${symptoms}. Duration: ${duration || 'unspecified'}. Severity: ${severity || 'unspecified'}. Notes: ${additionalNotes || ''}`;
    const response = await aiService.triageSymptoms(query, req.user.id, { duration, severity });

    return success(res, response, 'Symptom triage completed');
  } catch (err) {
    return error(res, `Symptom triage failed: ${err.message}`, 500);
  }
});

/**
 * @route   POST /api/ai/medication-check
 * @desc    Check drug indications, dosages, contraindications, and drug interactions
 * @access  Private (Patient, Doctor)
 */
router.post('/medication-check', async (req, res) => {
  try {
    const { medication, currentMedications, query } = req.body;
    const prompt = query || `Medication inquiry for: ${medication}. Current medications: ${(currentMedications || []).join(', ')}`;

    const response = await aiService.checkMedication(prompt, req.user.id, {
      medication,
      currentMedications
    });

    return success(res, response, 'Medication analysis completed');
  } catch (err) {
    return error(res, `Medication check failed: ${err.message}`, 500);
  }
});

/**
 * @route   POST /api/ai/appointment-assist
 * @desc    Recommend clinical specialty based on symptoms (requires explicit confirmation)
 * @access  Private (Patient)
 */
router.post('/appointment-assist', async (req, res) => {
  try {
    const { reason, preferredDate, preferredDoctor } = req.body;
    const prompt = `Appointment request: ${reason || 'General consultation'}. Preferred date: ${preferredDate || 'flexible'}. Doctor preference: ${preferredDoctor || 'none'}`;

    const response = await aiService.assistAppointment(prompt, req.user.id, {
      preferredDate,
      preferredDoctor
    });

    return success(res, response, 'Appointment guidance generated');
  } catch (err) {
    return error(res, `Appointment assistant failed: ${err.message}`, 500);
  }
});

/**
 * @route   POST /api/ai/extract-report
 * @desc    Extract biomarkers and lab values from medical document / PDF / image
 * @access  Private (Patient, Doctor)
 */
router.post('/extract-report', async (req, res) => {
  try {
    const { fileName, fileBytesBase64, documentType } = req.body;
    if (!fileName) {
      return error(res, 'fileName is required', 400);
    }

    const response = await aiService.extractReport(
      fileName,
      fileBytesBase64 || null,
      null,
      documentType || 'LAB_REPORT'
    );

    return success(res, response, 'Medical report analyzed successfully');
  } catch (err) {
    return error(res, `Report extraction failed: ${err.message}`, 500);
  }
});

/**
 * @route   POST /api/ai/speech-to-text
 * @desc    Convert patient voice recording to symptom text and extracted findings
 * @access  Private (Patient)
 */
router.post('/speech-to-text', async (req, res) => {
  try {
    const { audioBase64, language } = req.body;
    if (!audioBase64) {
      return error(res, 'audioBase64 payload is required', 400);
    }

    const response = await aiService.transcribeSpeech(audioBase64, language || 'en');
    return success(res, response, 'Voice transcription completed');
  } catch (err) {
    return error(res, `Speech-to-text failed: ${err.message}`, 500);
  }
});

/**
 * @route   GET /api/ai/guidelines
 * @desc    List validated OKF medical guidelines
 * @access  Private (Patient, Doctor, Admin)
 */
router.get('/guidelines', async (req, res) => {
  try {
    const response = await aiService.getOKFGuidelines(false);
    return success(res, response, 'OKF guidelines retrieved');
  } catch (err) {
    return error(res, `Guidelines retrieval failed: ${err.message}`, 500);
  }
});

/**
 * @route   GET /api/ai/health
 * @desc    Check health status of AI microservice and database backends
 * @access  Private (Admin)
 */
router.get('/health', async (req, res) => {
  try {
    const response = await aiService.checkHealth();
    return success(res, response, 'AI Microservice is healthy');
  } catch (err) {
    return error(res, `AI Microservice unreachable: ${err.message}`, 503);
  }
});

module.exports = router;
