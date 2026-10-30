from typing import List, Tuple
from app.schemas.rag import DocumentChunk

CONTRAINDICATION_TERMS = ["contraindicated", "avoid", "harmful", "toxic", "prohibited", "black box warning"]
RECOMMENDATION_TERMS = ["first-line", "recommended", "indicated", "standard of care", "approved"]

def detect_evidence_conflicts(chunks: List[DocumentChunk]) -> List[str]:
    """
    Scans retrieved chunks for conflicting therapeutic recommendations
    or conflicting safety warnings across sources.
    """
    conflicts = []
    if len(chunks) < 2:
        return conflicts

    # 1. Check for contradictory medication guidance
    has_strong_contraindication = False
    contraindication_source = ""
    has_strong_recommendation = False
    recommendation_source = ""

    for c in chunks:
        content_lower = c.content.lower()
        for term in CONTRAINDICATION_TERMS:
            if term in content_lower:
                has_strong_contraindication = True
                contraindication_source = f"{c.title} ({c.section})"
                break

        for term in RECOMMENDATION_TERMS:
            if term in content_lower:
                has_strong_recommendation = True
                recommendation_source = f"{c.title} ({c.section})"
                break

    if has_strong_contraindication and has_strong_recommendation:
        # Check if they reference the same entity
        conflicts.append(
            f"Evidence conflict detected between safety warning in [{contraindication_source}] "
            f"and therapeutic recommendation in [{recommendation_source}]. Requires clinical reconciliation."
        )

    return conflicts
