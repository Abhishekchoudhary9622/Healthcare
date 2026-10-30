"""
Medical Document Ingestion Pipeline
Handles document parsing, section/sliding chunking, dense vector computation,
and vector storage with patient isolation and clinical review metadata.
"""
from typing import Optional, List, Dict, Any
from app.rag.parsers import extract_document_text
from app.rag.chunker import chunk_medical_document
from app.rag.embeddings import embedding_engine
from app.rag.vector_store import vector_store
from app.schemas.rag import DocumentIngestRequest, IngestResponse

def ingest_document_sync(request: DocumentIngestRequest) -> IngestResponse:
    """
    Synchronous clinical document ingestion pipeline.
    """
    raw_chunks = chunk_medical_document(
        doc_id=request.doc_id,
        title=request.title,
        raw_content=request.content
    )

    if not raw_chunks:
        return IngestResponse(
            success=False,
            doc_id=request.doc_id,
            title=request.title,
            chunks_created=0,
            is_clinically_approved=request.is_clinically_approved,
            message="No valid textual content could be extracted."
        )

    # Generate embeddings synchronously
    embeddings = [embedding_engine._generate_dense_vector(c["content"]) for c in raw_chunks]

    records_to_store = []
    for c, emb in zip(raw_chunks, embeddings):
        records_to_store.append({
            "chunk_id": c["chunk_id"],
            "doc_id": c["doc_id"],
            "title": c["title"],
            "section": c["section"],
            "content": c["content"],
            "embedding": emb,
            "is_clinically_approved": request.is_clinically_approved,
            "publication_date": request.publication_date,
            "source_url": request.source_url,
            "patient_id": request.patient_id,
            "version": request.version,
            "reviewed_by": request.reviewed_by,
            "evidence_level": request.evidence_level
        })

    added_count = vector_store.add_chunks_sync(records_to_store)

    return IngestResponse(
        success=True,
        doc_id=request.doc_id,
        title=request.title,
        chunks_created=added_count,
        is_clinically_approved=request.is_clinically_approved,
        message=f"Successfully parsed, embedded, and indexed {added_count} chunks."
    )

async def ingest_document(request: DocumentIngestRequest) -> IngestResponse:
    """
    Asynchronous clinical document ingestion pipeline.
    """
    return ingest_document_sync(request)
