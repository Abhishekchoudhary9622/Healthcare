"""
Evidence Module Exports
"""
from app.evidence.authority_scorer import score_source_authority, score_source_freshness
from app.evidence.reranker import rerank_evidence_chunks
from app.evidence.faithfulness import evaluate_faithfulness, verify_claim_against_passages
from app.evidence.conflict_detector import detect_evidence_conflicts
from app.evidence.evaluator import evidence_evaluator, EvidenceEvaluator, get_evidence_evaluator

__all__ = [
    "score_source_authority", "score_source_freshness",
    "rerank_evidence_chunks",
    "evaluate_faithfulness", "verify_claim_against_passages",
    "detect_evidence_conflicts",
    "evidence_evaluator", "EvidenceEvaluator", "get_evidence_evaluator"
]
