from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from app.schemas.evidence import EvidenceEvaluationResult
from app.schemas.rag import PassageReference

class SupervisorRequest(BaseModel):
    query: str
    patient_id: Optional[str] = None
    target_agent: Optional[str] = None  # None for auto-route
    patient_context: Optional[Dict[str, Any]] = None
    session_id: Optional[str] = None

class ConfirmationAction(BaseModel):
    action_type: str  # "SCHEDULE_APPOINTMENT", "ORDER_PRESCRIPTION", "UPDATE_EHR"
    description: str
    parameters: Dict[str, Any] = Field(default_factory=dict)
    requires_explicit_confirmation: bool = True

class AgentResponse(BaseModel):
    agent_used: str  # "knowledge_agent", "symptom_agent", "medication_agent", etc.
    query: str
    answer: str
    clinical_urgency: str = "ROUTINE"  # "ROUTINE", "URGENT", "EMERGENCY"
    red_flag_alert: bool = False
    evidence_status: str = "SUFFICIENT"
    citations: List[PassageReference] = Field(default_factory=list)
    evaluation: Optional[EvidenceEvaluationResult] = None
    confirmation_action: Optional[ConfirmationAction] = None
    disclaimer: str
