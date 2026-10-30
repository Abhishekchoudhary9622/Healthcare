"""
Hybrid Retrieval Engine
Combines dense vector cosine similarity with lexical BM25/term frequency search
using Reciprocal Rank Fusion (RRF) with k=60.
"""
from typing import List, Optional, Dict
from app.schemas.rag import DocumentChunk
from app.rag.embeddings import embedding_engine
from app.rag.vector_store import vector_store

def hybrid_retrieve_sync(
    query: str,
    top_k: int = 5,
    patient_id: Optional[str] = None,
    require_clinically_approved: bool = True,
    rrf_k: int = 60
) -> List[DocumentChunk]:
    """
    Synchronous Hybrid Retrieval combining Dense Vector Similarity and Lexical Search with RRF.
    """
    # 1. Generate query embedding synchronously
    query_vector = embedding_engine._generate_dense_vector(query)

    # 2. Parallel candidate retrieval
    fetch_k = max(top_k * 2, 10)
    dense_results = vector_store.dense_search_sync(
        query_vector=query_vector,
        top_k=fetch_k,
        patient_id=patient_id,
        require_clinically_approved=require_clinically_approved
    )

    lexical_results = vector_store.lexical_search_sync(
        query_text=query,
        top_k=fetch_k,
        patient_id=patient_id,
        require_clinically_approved=require_clinically_approved
    )

    # 3. Reciprocal Rank Fusion (RRF)
    rrf_scores: Dict[str, float] = {}
    chunk_map: Dict[str, DocumentChunk] = {}

    for rank, chunk in enumerate(dense_results, start=1):
        cid = chunk.chunk_id
        chunk_map[cid] = chunk
        rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (rrf_k + rank))

    for rank, chunk in enumerate(lexical_results, start=1):
        cid = chunk.chunk_id
        if cid not in chunk_map:
            chunk_map[cid] = chunk
        rrf_scores[cid] = rrf_scores.get(cid, 0.0) + (1.0 / (rrf_k + rank))

    # 4. Sort by blended RRF score
    sorted_chunk_ids = sorted(rrf_scores.keys(), key=lambda cid: rrf_scores[cid], reverse=True)

    final_chunks: List[DocumentChunk] = []
    for cid in sorted_chunk_ids[:top_k]:
        chunk = chunk_map[cid]
        chunk.score = round(rrf_scores[cid] * 100, 4)
        chunk.retrieval_method = "hybrid_rrf"
        final_chunks.append(chunk)

    return final_chunks

async def hybrid_retrieve(
    query: str,
    top_k: int = 5,
    patient_id: Optional[str] = None,
    require_clinically_approved: bool = True,
    rrf_k: int = 60
) -> List[DocumentChunk]:
    """
    Asynchronous Hybrid Retrieval interface.
    """
    return hybrid_retrieve_sync(
        query=query,
        top_k=top_k,
        patient_id=patient_id,
        require_clinically_approved=require_clinically_approved,
        rrf_k=rrf_k
    )
