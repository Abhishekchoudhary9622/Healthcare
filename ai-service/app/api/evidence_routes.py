"""
JEV-Style Evidence Evaluation API Endpoints
Authority scoring, freshness decay, claim-passage entailment verification,
cross-evidence contradiction detection, and abstention policy.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from app.dependencies import verify_service_auth
from app.schemas.evidence import EvidenceEvaluationRequest, EvidenceEvaluationResult
from app.evidence.evaluator import get_evidence_evaluator

router = APIRouter(prefix="/api/evidence", tags=["JEV Evidence Evaluation"])

@router.post("/evaluate", response_model=EvidenceEvaluationResult)
async def api_evaluate_evidence(
    request: EvidenceEvaluationRequest,
    auth: Dict[str, Any] = Depends(verify_service_auth)
):
    """
    Evaluates evidence authority, passage freshness, semantic claim-passage faithfulness,
    and conflicting contraindications. Abstains if evidence is insufficient.
    """
    try:
        evaluator = get_evidence_evaluator()
        result = evaluator.evaluate(request)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Evidence evaluation failed: {str(e)}"
        )
