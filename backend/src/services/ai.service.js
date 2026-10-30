/**
 * HealthSync AI Microservice Client Service
 * Bridges Express backend to the Python FastAPI Clinical AI microservice
 * using internal authentication (X-AI-Service-Key).
 */
const logger = require('../config/logger');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_SERVICE_KEY = process.env.AI_SERVICE_API_KEY || 'healthsync_ai_internal_secret_key_2026';

class AIService {
  constructor() {
    this.baseUrl = AI_SERVICE_URL;
    this.apiKey = AI_SERVICE_KEY;
  }

  async _request(endpoint, method = 'POST', body = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      'X-AI-Service-Key': this.apiKey
    };

    const options = {
      method,
      headers
    };

    if (body && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI Microservice error (${response.status}): ${errorText}`);
      }
      return await response.json();
    } catch (err) {
      logger.error(`AI Microservice Request Error [${method} ${endpoint}]: ${err.message}`);
      throw err;
    }
  }

  /**
   * Primary multi-agent query entrypoint routed via LangGraph supervisor
   */
  async runAgentWorkflow(query, patientId = null, patientContext = {}, targetAgent = null) {
    return this._request('/api/agents/run', 'POST', {
      query,
      patient_id: patientId,
      patient_context: patientContext,
      target_agent: targetAgent
    });
  }

  /**
   * Healthcare knowledge query with RAG + GraphRAG + JEV validation
   */
  async queryKnowledge(query, patientId = null, patientContext = {}) {
    return this.runAgentWorkflow(query, patientId, patientContext, 'knowledge_agent');
  }

  /**
   * Symptom triage and clinical red-flag emergency check
   */
  async triageSymptoms(query, patientId = null, patientContext = {}) {
    return this.runAgentWorkflow(query, patientId, patientContext, 'symptom_agent');
  }

  /**
   * Medication monograph & drug interaction check
   */
  async checkMedication(query, patientId = null, patientContext = {}) {
    return this.runAgentWorkflow(query, patientId, patientContext, 'medication_agent');
  }

  /**
   * Appointment assistance with deterministic specialist matching and confirmation check
   */
  async assistAppointment(query, patientId = null, patientContext = {}) {
    return this.runAgentWorkflow(query, patientId, patientContext, 'appointment_agent');
  }

  /**
   * OCR lab report and biomarker extraction
   */
  async extractReport(fileName, fileBytesBase64 = null, filePath = null, documentType = 'LAB_REPORT') {
    return this._request('/api/tools/ocr', 'POST', {
      file_name: fileName,
      file_bytes_base64: fileBytesBase64,
      file_path: filePath,
      document_type: documentType
    });
  }

  /**
   * Speech-to-text symptom input processing
   */
  async transcribeSpeech(audioBase64, language = 'en') {
    return this._request('/api/tools/stt', 'POST', {
      audio_base64: audioBase64,
      language
    });
  }

  /**
   * Query OKF structured guidelines
   */
  async getOKFGuidelines(includeQuarantined = false) {
    return this._request(`/api/okf/documents?include_quarantined=${includeQuarantined}`, 'GET');
  }

  /**
   * Check microservice health and database status
   */
  async checkHealth() {
    return this._request('/health', 'GET');
  }
}

module.exports = new AIService();
