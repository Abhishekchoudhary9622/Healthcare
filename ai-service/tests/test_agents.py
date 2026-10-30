"""
Unit and Integration Tests for LangGraph Multi-Agent Subsystem:
Supervisor routing, Emergency triage, Deterministic appointment confirmation, and State execution.
"""
import pytest
from app.agents.supervisor import supervisor_router, supervisor_app
from app.agents.state import HealthSyncAgentState
from app.schemas.common import ClinicalUrgency

def test_supervisor_router_intent_dispatch():
    # 1. Symptom inquiry -> symptom_agent
    state_symptom: HealthSyncAgentState = {
        "user_id": "u1", "query": "I have a throbbing headache and fever for two days",
        "context": {}, "current_agent": None, "retrieved_passages": [],
        "graph_entities": [], "evidence_eval": {}, "response_text": "",
        "urgency": ClinicalUrgency.ROUTINE.value, "requires_confirmation": False,
        "confirmation_action": None, "safety_flags": [], "citations": []
    }
    assert supervisor_router(state_symptom) == "symptom_agent"

    # 2. Medication inquiry -> medication_agent
    state_med: HealthSyncAgentState = {
        "user_id": "u1", "query": "What is the recommended dose and side effects of ibuprofen?",
        "context": {}, "current_agent": None, "retrieved_passages": [],
        "graph_entities": [], "evidence_eval": {}, "response_text": "",
        "urgency": ClinicalUrgency.ROUTINE.value, "requires_confirmation": False,
        "confirmation_action": None, "safety_flags": [], "citations": []
    }
    assert supervisor_router(state_med) == "medication_agent"

    # 3. Appointment booking inquiry -> appointment_agent
    state_appt: HealthSyncAgentState = {
        "user_id": "u1", "query": "I want to schedule an appointment with a cardiologist next Tuesday",
        "context": {}, "current_agent": None, "retrieved_passages": [],
        "graph_entities": [], "evidence_eval": {}, "response_text": "",
        "urgency": ClinicalUrgency.ROUTINE.value, "requires_confirmation": False,
        "confirmation_action": None, "safety_flags": [], "citations": []
    }
    assert supervisor_router(state_appt) == "appointment_agent"

    # 4. Lab extraction -> document_agent
    state_doc: HealthSyncAgentState = {
        "user_id": "u1", "query": "Extract the blood test and HbA1c lab report",
        "context": {}, "current_agent": None, "retrieved_passages": [],
        "graph_entities": [], "evidence_eval": {}, "response_text": "",
        "urgency": ClinicalUrgency.ROUTINE.value, "requires_confirmation": False,
        "confirmation_action": None, "safety_flags": [], "citations": []
    }
    assert supervisor_router(state_doc) == "document_agent"

def test_appointment_agent_requires_patient_confirmation():
    """
    Requirement 5 & 7: Use deterministic backend logic for bookings.
    Require explicit patient confirmation before making appointments or consequential changes.
    """
    state_appt: HealthSyncAgentState = {
        "user_id": "patient_123",
        "query": "Book an appointment with a cardiologist for high blood pressure check",
        "context": {},
        "current_agent": "appointment_agent",
        "retrieved_passages": [],
        "graph_entities": [],
        "evidence_eval": {},
        "response_text": "",
        "urgency": ClinicalUrgency.ROUTINE.value,
        "requires_confirmation": False,
        "confirmation_action": None,
        "safety_flags": [],
        "citations": []
    }

    result = supervisor_app.invoke(state_appt)
    assert result["requires_confirmation"] is True
    assert result["confirmation_action"] is not None
    assert result["confirmation_action"]["action_type"] == "BOOK_APPOINTMENT"
    assert "Cardiology" in result["confirmation_action"]["details"]["specialty"]
    assert "explicit patient confirmation" in result["response_text"].lower() or "confirm" in result["response_text"].lower()

def test_symptom_agent_critical_emergency_escalation():
    """
    Requirement 7: Emergency escalation rules trigger immediate emergency response.
    """
    state_emergency: HealthSyncAgentState = {
        "user_id": "patient_123",
        "query": "I have crushing chest pain radiating to my left arm and jaw and severe shortness of breath",
        "context": {},
        "current_agent": "symptom_agent",
        "retrieved_passages": [],
        "graph_entities": [],
        "evidence_eval": {},
        "response_text": "",
        "urgency": ClinicalUrgency.ROUTINE.value,
        "requires_confirmation": False,
        "confirmation_action": None,
        "safety_flags": [],
        "citations": []
    }

    result = supervisor_app.invoke(state_emergency)
    assert result["urgency"] == ClinicalUrgency.EMERGENCY.value
    assert "911" in result["response_text"] or "emergency" in result["response_text"].lower()
    assert any("EMERGENCY" in flag for flag in result["safety_flags"])
