"""
Unit and Integration Tests for JEV (Judge / Evidence Validator) Subsystem:
Authority Scoring, Freshness Decay, Claim Entailment, Conflict Detection, and Abstention.
"""
import pytest
from app.evidence.authority_scorer import score_source_authority, score_source_freshness
from app.evidence.reranker import rerank_evidence_chunks
from app.evidence.faithfulness import evaluate_faithfulness
from app.evidence.conflict_detector import detect_evidence_conflicts
from app.evidence.evaluator import EvidenceEvaluator
from app.schemas.rag import DocumentChunk
from app.schemas.common import SourceMetadata

def test_source_authority_and_freshness():
    chunk_high_auth = DocumentChunk(
        chunk_id="CHK-01",
        doc_id="DOC-01",
        title="ACC/AHA Guideline",
        section="Overview",
        content="Clinical evidence",
        metadata=SourceMetadata(
            source_id="DOC-01",
            title="ACC/AHA",
            url="https://guidelines.acc.org/guideline",
            publication_date="2024-05-10",
            evidence_level="Level A",
            is_clinically_approved=True
        )
    )

    chunk_low_auth = DocumentChunk(
        chunk_id="CHK-02",
        doc_id="DOC-02",
        title="Unreviewed Source",
        section="Advice",
        content="Alternative claims",
        metadata=SourceMetadata(
            source_id="DOC-02",
            title="Blog",
            url="https://wellness-forum.xyz",
            publication_date="2010-01-01",
            evidence_level="Level C",
            is_clinically_approved=False
        )
    )

    score_high = score_source_authority(chunk_high_auth)
    score_low = score_source_authority(chunk_low_auth)
    assert score_high > score_low
    assert score_high >= 0.85

    fresh_high = score_source_freshness(chunk_high_auth)
    fresh_low = score_source_freshness(chunk_low_auth)
    assert fresh_high > fresh_low

def test_conflict_detection():
    chunk1 = DocumentChunk(
        chunk_id="C1",
        doc_id="D1",
        title="Ibuprofen Guideline",
        section="Contraindications",
        content="Ibuprofen is strictly contraindicated in patients with active peptic ulcer disease.",
        metadata=SourceMetadata(source_id="D1", title="FDA Monograph")
    )

    chunk2 = DocumentChunk(
        chunk_id="C2",
        doc_id="D2",
        title="Pain Management",
        section="Recommendations",
        content="Ibuprofen is recommended for mild pain in patients with active peptic ulcer disease.",
        metadata=SourceMetadata(source_id="D2", title="Unreviewed Forum")
    )

    conflicts = detect_evidence_conflicts([chunk1, chunk2])
    assert len(conflicts) > 0
    assert any("contraindicated" in c.lower() or "conflict" in c.lower() for c in conflicts)

def test_evidence_evaluator_abstention_on_empty_evidence():
    evaluator = EvidenceEvaluator()
    result = evaluator.evaluate(
        query="What is the dose of a fictional unapproved drug xyz?",
        draft_response="Take 500mg daily.",
        retrieved_chunks=[]
    )

    assert result.is_safe_to_publish is False
    assert result.evidence_status == "INSUFFICIENT_EVIDENCE"
    assert result.recommended_action == "ABSTAIN"
    assert "abstain_message" in result.model_dump()
    assert result.abstain_message is not None

def test_evidence_evaluator_sufficient_evidence():
    chunk = DocumentChunk(
        chunk_id="C1",
        doc_id="D1",
        title="Hypertension Guideline",
        section="Treatment",
        content="First-line treatment for stage 1 hypertension includes lifestyle changes, DASH diet, and ACE inhibitors.",
        metadata=SourceMetadata(
            source_id="D1",
            title="ACC/AHA",
            url="https://guidelines.acc.org",
            publication_date="2024-01-01",
            evidence_level="Level A",
            is_clinically_approved=True
        )
    )

    evaluator = EvidenceEvaluator()
    result = evaluator.evaluate(
        query="What is first-line therapy for hypertension?",
        draft_response="First-line treatment for stage 1 hypertension includes lifestyle changes, DASH diet, and ACE inhibitors.",
        retrieved_chunks=[chunk]
    )

    assert result.is_safe_to_publish is True
    assert result.evidence_status == "SUFFICIENT"
    assert result.faithfulness_score >= 0.70
