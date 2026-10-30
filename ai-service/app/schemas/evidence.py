from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from app.schemas.rag import DocumentChunk

class ClaimValidation(BaseModel):
    claim_text: str
    is_supported: bool
    supporting_chunk_ids: List[str] = Field(default_factory=list)
    entailment_score: float = Field(..., ge=0.0, le=1.0)
    conflict_detected: bool = False
    conflict_reason: Optional[str] = None

class EvidenceEvaluationRequest(BaseModel):
    query: str
    draft_response: str
    retrieved_chunks: List[DocumentChunk]

class EvidenceEvaluationResult(BaseModel):
    is_safe_to_publish: bool
    overall_confidence: float = Field(..., ge=0.0, le=1.0)
    evidence_status: str  # "SUFFICIENT", "INSUFFICIENT_EVIDENCE", "CONFLICTING_EVIDENCE"
    source_authority_score: float = Field(..., ge=0.0, le=1.0)
    freshness_score: float = Field(..., ge=0.0, le=1.0)
    faithfulness_score: float = Field(..., ge=0.0, le=1.0)
    claims: List[ClaimValidation] = Field(default_factory=list)
    conflicts: List[str] = Field(default_factory=list)
    recommended_action: str  # "PROCEED", "ABSTAIN", "FLAG_WARNING"
    abstain_message: Optional[str] = None
