"""
RAG API Endpoints
Document ingestion, parsing, chunking, embedding generation, and hybrid retrieval.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from app.dependencies import verify_service_auth
from app.schemas.rag import (
    DocumentIngestRequest, IngestResponse,
    RAGQueryRequest, RAGQueryResponse, PassageReference
)
from app.rag.ingestion import ingest_document
from app.rag.hybrid_retriever import hybrid_retrieve
from app.guardrails.clinical_guard import STANDARD_CLINICAL_DISCLAIMER

router = APIRouter(prefix="/api/rag", tags=["RAG"])

@router.post("/ingest", response_model=IngestResponse)
async def api_ingest_document(
    request: DocumentIngestRequest,
    auth: Dict[str, Any] = Depends(verify_service_auth)
):
    """
    Ingests a clinical medical document (PDF, DOCX, Markdown, or raw text),
    chunks it, computes dense embeddings, and stores in PostgreSQL pgvector.
    """
    try:
        response = await ingest_document(request)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ingestion pipeline failed: {str(e)}"
        )

@router.post("/query", response_model=RAGQueryResponse)
async def api_query_rag(
    request: RAGQueryRequest,
    auth: Dict[str, Any] = Depends(verify_service_auth)
):
    """
    Executes hybrid retrieval (Dense embeddings + Lexical BM25 with Reciprocal Rank Fusion)
    over clinically approved documents. Returns ranked passages and source metadata.
    """
    try:
        passages = await hybrid_retrieve(
            query=request.query,
            top_k=request.top_k,
            patient_id=request.patient_id,
            require_clinically_approved=request.require_clinically_approved
        )

        citations = []
        for i, p in enumerate(passages, start=1):
            citations.append(PassageReference(
                citation_id=f"CIT-{i:02d}",
                title=p.title,
                section=p.section,
                url=p.metadata.url if p.metadata else None,
                excerpt=p.content[:200] + "...",
                confidence_score=p.score or 0.85,
                is_approved=p.metadata.is_clinically_approved if p.metadata else True
            ))

        evidence_status = "SUFFICIENT" if passages else "INSUFFICIENT_EVIDENCE"
        answer = ""
        if passages:
            answer = f"Found {len(passages)} verified clinical references matching '{request.query}'. Top guidance: {passages[0].content[:250]}..."
        else:
            answer = "Insufficient approved clinical evidence found to answer this query safely."

        return RAGQueryResponse(
            query=request.query,
            answer=answer,
            passages=passages,
            citations=citations,
            evidence_status=evidence_status,
            disclaimer=STANDARD_CLINICAL_DISCLAIMER.text
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Hybrid retrieval failed: {str(e)}"
        )
