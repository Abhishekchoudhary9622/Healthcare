"""
OKF (Open Knowledge Formulation) API Endpoints
Manages structured medical YAML/Markdown guidelines, versioning, clinical reviews, and sync.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from app.dependencies import verify_service_auth
from app.schemas.okf import OKFDocument, OKFValidationResult
from app.okf.repository import get_okf_repository
from app.okf.validator import validate_okf_document

router = APIRouter(prefix="/api/okf", tags=["OKF Knowledge Management"])

@router.get("/documents")
async def api_list_okf_documents(
    include_quarantined: bool = False,
    auth: Dict[str, Any] = Depends(verify_service_auth)
):
    """
    Returns all registered OKF structured clinical guidelines and monographs.
    By default, unreviewed / quarantined documents are filtered out.
    """
    repo = get_okf_repository()
    docs = repo.get_all_documents(include_quarantined=include_quarantined)
    return {
        "total": len(docs),
        "documents": [
            {
                "id": d.id,
                "title": d.title,
                "clinical_domain": d.clinical_domain,
                "version": d.version,
                "is_clinically_approved": d.provenance.is_clinically_approved,
                "publication_date": d.provenance.publication_date,
                "reviewed_by": d.provenance.reviewed_by,
                "evidence_level": d.provenance.evidence_level,
                "source_url": d.provenance.url,
                "provenance": d.provenance.model_dump()
            }
            for d in docs
        ]
    }

@router.get("/documents/{document_id}")
async def api_get_okf_document(
    document_id: str,
    auth: Dict[str, Any] = Depends(verify_service_auth)
):
    """Returns a specific OKF guideline by ID."""
    repo = get_okf_repository()
    doc = repo.get_document_by_id(document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"OKF document '{document_id}' not found."
        )
    return doc

@router.post("/validate", response_model=OKFValidationResult)
async def api_validate_okf_document(
    document: OKFDocument,
    auth: Dict[str, Any] = Depends(verify_service_auth)
):
    """
    Validates clinical review status, provenance URLs, and version integrity.
    Never treats unreviewed knowledge as clinically approved.
    """
    result = validate_okf_document(document)
    return result

@router.post("/sync")
async def api_sync_okf_to_rag(
    auth: Dict[str, Any] = Depends(verify_service_auth)
):
    """
    Indexes all clinically approved OKF documents into the RAG vector store
    and GraphRAG Neo4j knowledge network.
    """
    repo = get_okf_repository()
    result = repo.sync_to_rag_and_graph()
    return result
