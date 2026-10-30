import re
from typing import List
from app.schemas.rag import DocumentChunk
from app.evidence.authority_scorer import score_source_authority, score_source_freshness

def rerank_evidence_chunks(
    query: str,
    chunks: List[DocumentChunk],
    top_n: int = 5
) -> List[DocumentChunk]:
    """
    Reranks retrieved chunks combining lexical/semantic score, source authority,
    temporal freshness, and section prominence.
    """
    if not chunks:
        return []

    q_words = set(re.findall(r'\b[a-zA-Z0-9_\-]{3,}\b', query.lower()))
    scored_chunks = []

    for chunk in chunks:
        base_score = (chunk.score or 0.5) / 100.0 if (chunk.score and chunk.score > 1.0) else (chunk.score or 0.5)
        authority = score_source_authority(chunk)
        freshness = score_source_freshness(chunk)

        # Content relevance boost
        content_words = set(re.findall(r'\b[a-zA-Z0-9_\-]{3,}\b', chunk.content.lower()))
        overlap = len(q_words.intersection(content_words)) / max(len(q_words), 1)

        # Weighted composite score: 40% retrieval relevance, 30% authority, 20% query overlap, 10% freshness
        composite_score = (
            (0.40 * base_score) +
            (0.30 * authority) +
            (0.20 * overlap) +
            (0.10 * freshness)
        )

        chunk.score = round(composite_score, 4)
        scored_chunks.append((composite_score, chunk))

    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    return [c for _, c in scored_chunks[:top_n]]
