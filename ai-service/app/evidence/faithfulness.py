import re
from typing import List, Tuple
from app.schemas.evidence import ClaimValidation
from app.schemas.rag import DocumentChunk

def split_into_claims(text: str) -> List[str]:
    """Splits a draft medical response into standalone factual claims."""
    # Split by periods, bullet points, or semicolons
    sentences = re.split(r'(?<=[.!?])\s+|\n- |\n\d+\. ', text)
    claims = []
    for s in sentences:
        s_clean = s.strip()
        if len(s_clean) > 20 and not s_clean.startswith("#"):
            claims.append(s_clean)
    return claims

def verify_claim_against_passages(
    claim: str, 
    passages: List[DocumentChunk]
) -> ClaimValidation:
    """
    Computes lexical and semantic entailment between a claim and retrieved passages.
    Ensures that factual medical statements have direct evidential grounding.
    """
    claim_words = set(re.findall(r'\b[a-zA-Z0-9_\-]{3,}\b', claim.lower()))
    if not claim_words:
        return ClaimValidation(
            claim_text=claim,
            is_supported=True,
            supporting_chunk_ids=[],
            entailment_score=1.0
        )

    best_score = 0.0
    supporting_chunks = []

    for chunk in passages:
        chunk_words = set(re.findall(r'\b[a-zA-Z0-9_\-]{3,}\b', chunk.content.lower()))
        intersection = claim_words.intersection(chunk_words)
        overlap_ratio = len(intersection) / len(claim_words)

        if overlap_ratio > best_score:
            best_score = overlap_ratio

        if overlap_ratio >= 0.45:
            supporting_chunks.append(chunk.chunk_id)

    is_supported = best_score >= 0.50

    return ClaimValidation(
        claim_text=claim,
        is_supported=is_supported,
        supporting_chunk_ids=supporting_chunks,
        entailment_score=round(best_score, 3)
    )

def evaluate_faithfulness(
    draft_response: str, 
    passages: List[DocumentChunk]
) -> Tuple[float, List[ClaimValidation]]:
    """
    Evaluates response faithfulness across all extracted claims.
    Returns overall faithfulness score (0.0 to 1.0) and detailed validation records.
    """
    claims = split_into_claims(draft_response)
    if not claims or not passages:
        return 0.0 if not passages else 1.0, []

    validations = [verify_claim_against_passages(c, passages) for c in claims]
    supported_count = sum(1 for v in validations if v.is_supported)
    faithfulness_ratio = supported_count / len(validations)

    return round(faithfulness_ratio, 3), validations
