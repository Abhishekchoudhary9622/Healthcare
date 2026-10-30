"""
JEV (Judge / Evidence Validator) Evaluation Engine
Evaluates source authority, freshness decay, claim-passage entailment verification,
cross-evidence contradiction detection, and abstention policy.
"""
from typing import List, Optional, Union
from app.config import settings
from app.schemas.rag import DocumentChunk
from app.schemas.evidence import EvidenceEvaluationResult, ClaimValidation, EvidenceEvaluationRequest
from app.evidence.authority_scorer import score_source_authority, score_source_freshness
from app.evidence.reranker import rerank_evidence_chunks
from app.evidence.faithfulness import evaluate_faithfulness
from app.evidence.conflict_detector import detect_evidence_conflicts

class EvidenceEvaluator:
    """
    JEV-style Judge / Evidence Validator module.
    Evaluates source authority, freshness, faithfulness, and conflicting evidence.
    Enforces clinical safety and returns INSUFFICIENT_EVIDENCE when criteria are not met.
    """

    def evaluate(
        self,
        query: Optional[Union[str, EvidenceEvaluationRequest]] = None,
        draft_response: Optional[str] = None,
        retrieved_chunks: Optional[List[DocumentChunk]] = None,
        request: Optional[EvidenceEvaluationRequest] = None
    ) -> EvidenceEvaluationResult:
        if isinstance(query, EvidenceEvaluationRequest):
            q_text = query.query
            draft_text = query.draft_response
            chunks = query.retrieved_chunks
        elif request is not None:
            q_text = request.query
            draft_text = request.draft_response
            chunks = request.retrieved_chunks
        else:
            q_text = query or ""
            draft_text = draft_response or ""
            chunks = retrieved_chunks or []

        # 1. Handle empty evidence case
        if not chunks:
            return EvidenceEvaluationResult(
                is_safe_to_publish=False,
                overall_confidence=0.0,
                evidence_status="INSUFFICIENT_EVIDENCE",
                source_authority_score=0.0,
                freshness_score=0.0,
                faithfulness_score=0.0,
                claims=[],
                conflicts=[],
                recommended_action="ABSTAIN",
                abstain_message=(
                    "Insufficient clinical evidence found in approved medical guidelines. "
                    "HealthSync cannot verify factual recommendations for this condition. "
                    "Please consult a licensed medical specialist directly."
                )
            )

        # 2. Rerank evidence
        reranked = rerank_evidence_chunks(q_text, chunks, top_n=5)

        # 3. Source authority & freshness scores
        auth_scores = [score_source_authority(c) for c in reranked]
        fresh_scores = [score_source_freshness(c) for c in reranked]
        avg_auth = sum(auth_scores) / len(auth_scores) if auth_scores else 0.0
        avg_fresh = sum(fresh_scores) / len(fresh_scores) if fresh_scores else 0.0

        # 4. Check faithfulness of draft claims
        faithfulness, claim_validations = evaluate_faithfulness(draft_text, reranked)

        # 5. Check conflicting evidence
        conflicts = detect_evidence_conflicts(reranked)

        # 6. Overall confidence calculation
        overall_confidence = (0.45 * faithfulness) + (0.35 * avg_auth) + (0.20 * avg_fresh)
        if conflicts:
            overall_confidence *= 0.70  # Penalty for conflicting guidance

        # 7. Safety & Abstention rules
        is_safe = True
        status = "SUFFICIENT"
        action = "PROCEED"
        abstain_msg = None

        if conflicts:
            status = "CONFLICTING_EVIDENCE"
            action = "FLAG_WARNING"

        if (
            faithfulness < settings.FAITHFULNESS_THRESHOLD or
            overall_confidence < settings.EVIDENCE_CONFIDENCE_THRESHOLD
        ):
            is_safe = False
            status = "INSUFFICIENT_EVIDENCE"
            action = "ABSTAIN"
            abstain_msg = (
                "Clinical evidence does not sufficiently substantiate the proposed guidance. "
                "The system abstains from making unverified medical claims. "
                "Consultation with a verified physician is strongly advised."
            )

        return EvidenceEvaluationResult(
            is_safe_to_publish=is_safe,
            overall_confidence=round(overall_confidence, 3),
            evidence_status=status,
            source_authority_score=round(avg_auth, 3),
            freshness_score=round(avg_fresh, 3),
            faithfulness_score=round(faithfulness, 3),
            claims=claim_validations,
            conflicts=conflicts,
            recommended_action=action,
            abstain_message=abstain_msg
        )

evidence_evaluator = EvidenceEvaluator()

def get_evidence_evaluator() -> EvidenceEvaluator:
    return evidence_evaluator
