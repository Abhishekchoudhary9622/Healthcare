"""
HealthSync Multi-Agent Shared State
TypedDict defining the state channels passed through the LangGraph supervisor workflow.
"""
from typing import TypedDict, List, Dict, Any, Optional
from app.schemas.rag import DocumentChunk, PassageReference
from app.schemas.evidence import EvidenceEvaluationResult
from app.schemas.agents import ConfirmationAction

class HealthSyncAgentState(TypedDict, total=False):
    # Core request parameters
    query: str
    user_id: Optional[str]
    patient_id: Optional[str]
    context: Optional[Dict[str, Any]]
    patient_context: Optional[Dict[str, Any]]
    session_id: Optional[str]
    
    # Workflow routing
    current_agent: str
    routing_reason: str
    
    # Clinical & Knowledge state
    entities: List[str]
    graph_entities: List[Any]
    retrieved_evidence: List[DocumentChunk]
    retrieved_passages: List[Any]
    graph_context: str
    evidence_eval: Dict[str, Any]
    
    # Safety, Triage & Actions
    urgency: str  # "ROUTINE", "URGENT", "EMERGENCY"
    clinical_urgency: str  # "ROUTINE", "URGENT", "EMERGENCY"
    red_flag_alert: bool
    emergency_details: List[str]
    requires_confirmation: bool
    confirmation_action: Optional[Any]
    safety_flags: List[str]
    
    # Evaluation & Output
    draft_response: str
    response_text: str
    final_response: str
    evidence_status: str
    citations: List[Any]
    evaluation: Optional[EvidenceEvaluationResult]
    disclaimer: str
