from datetime import datetime, timezone
from typing import Dict, Any, Optional
from app.schemas.rag import DocumentChunk

AUTHORITY_WEIGHTS = {
    "Level A": 1.0,  # Randomized controlled trials / Meta-analyses / National guidelines
    "Level B": 0.85, # Well-designed observational or cohort studies
    "Level C": 0.65, # Expert consensus / Clinical monographs
    "Unverified": 0.30
}

AUTHORITY_DOMAINS = [
    ("ahajournals.org", 1.0),
    ("accessdata.fda.gov", 1.0),
    ("cdc.gov", 1.0),
    ("who.int", 1.0),
    ("nejm.org", 1.0),
    ("thelancet.com", 1.0),
    ("nih.gov", 0.95),
    ("ncbi.nlm.nih.gov", 0.95)
]

def score_source_authority(chunk: DocumentChunk) -> float:
    """
    Evaluates evidence authority score based on evidence level,
    institution credentials, and clinical review status.
    """
    meta = chunk.metadata
    if not meta.is_clinically_approved:
        return 0.20

    base_score = AUTHORITY_WEIGHTS.get(meta.evidence_level or "Level B", 0.80)

    # URL domain provenance boost
    if meta.url:
        for domain, d_score in AUTHORITY_DOMAINS:
            if domain in meta.url.lower():
                base_score = max(base_score, d_score)
                break

    return round(base_score, 3)

def score_source_freshness(chunk: DocumentChunk) -> float:
    """
    Evaluates temporal freshness with clinical half-life decay.
    Guidelines published in the last 2 years receive full score;
    older guidelines have graceful decay to favor updated recommendations.
    """
    pub_date_str = chunk.metadata.publication_date
    if not pub_date_str:
        return 0.70

    try:
        # Extract 4-digit year
        import re
        match = re.search(r'\b(19|20)\d{2}\b', pub_date_str)
        if match:
            year = int(match.group(0))
            current_year = datetime.now(timezone.utc).year
            diff = max(0, current_year - year)
            if diff <= 2:
                return 1.0
            elif diff <= 5:
                return 0.85
            elif diff <= 10:
                return 0.65
            else:
                return 0.50
    except Exception:
        pass

    return 0.75
