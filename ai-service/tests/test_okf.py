"""
Unit and Integration Tests for OKF Knowledge Management:
Structured YAML parsing, Clinical Review Validation, Quarantine Enforcement, and Repository Sync.
"""
import pytest
from app.okf.loader import load_okf_file, load_all_okf_documents
from app.okf.validator import validate_okf_document
from app.okf.repository import get_okf_repository
from app.schemas.okf import OKFDocument, OKFSection
from app.schemas.common import SourceMetadata

def test_load_okf_guidelines_from_disk():
    repo = get_okf_repository()
    docs = repo.load_repository()
    assert len(docs) >= 3

    cardio_doc = repo.get_document_by_id("OKF-CARD-001")
    assert cardio_doc is not None
    assert "Hypertension" in cardio_doc.title
    assert cardio_doc.provenance.is_clinically_approved is True
    assert cardio_doc.provenance.reviewed_by is not None


def test_okf_validator_approved_document():
    doc = OKFDocument(
        id="OKF-TEST-APPROVED",
        title="Verified Clinical Guideline",
        clinical_domain="Cardiology",
        version="1.0",
        provenance=SourceMetadata(
            source_id="TEST-01",
            title="AHA Guideline",
            url="https://guidelines.heart.org/verified",
            publication_date="2024-01-15",
            is_clinically_approved=True,
            reviewed_by="Dr. Sarah Johnson, MD, FACC",
            evidence_level="Level A"
        ),
        sections=[
            OKFSection(
                heading="Overview",
                content="Clinical guidelines for evidence-based care.",
                key_findings=["Finding 1"],
                contraindications=[],
                red_flags=[]
            )
        ]
    )
    val_res = validate_okf_document(doc)
    assert val_res.valid is True
    assert val_res.is_clinically_approved is True
    assert len(val_res.missing_fields) == 0

def test_okf_quarantine_unreviewed_document():
    # An unreviewed document must NEVER be treated as clinically approved
    unreviewed_doc = OKFDocument(
        id="OKF-UNREVIEWED-01",
        title="Unreviewed Experimental Advice",
        clinical_domain="Alternative Therapy",
        version="0.1",
        provenance=SourceMetadata(
            source_id="BLOG-01",
            title="Random Blog Post",
            url="https://blog.example.com/unverified",
            publication_date="2026-05-01",
            is_clinically_approved=False,
            reviewed_by=None,
            evidence_level="Expert Opinion"
        ),
        sections=[
            OKFSection(
                heading="Advice",
                content="Unverified medical claims from web forums.",
                key_findings=[],
                contraindications=[],
                red_flags=[]
            )
        ]
    )

    val_res = validate_okf_document(unreviewed_doc)
    # Must flag quarantine and cannot be clinically approved
    assert val_res.is_clinically_approved is False
    assert any("quarantine" in w.lower() or "unreviewed" in w.lower() for w in val_res.warnings)

def test_okf_repository_sync():
    repo = get_okf_repository()
    sync_stats = repo.sync_to_rag_and_graph()
    assert sync_stats["success"] is True
    assert sync_stats["rag_documents_indexed"] >= 3
    assert sync_stats["approved_okf_total"] >= 3
