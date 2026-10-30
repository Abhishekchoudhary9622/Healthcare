"""
Clinical Safety and Non-Diagnostic Policy Guardrail
Enforces medical safety rules, educational disclaimers, and prevents unauthorized prescribing.
"""
import re
from typing import Dict, Any, List, Optional
from app.schemas.common import ClinicalDisclaimer

STANDARD_CLINICAL_DISCLAIMER = ClinicalDisclaimer(
    text=(
        "HealthSync AI is a medical knowledge and clinical support assistant designed for educational "
        "and informational purposes only. It does not provide medical diagnoses, treatment plans, "
        "or write prescriptions. Always consult a qualified, licensed healthcare professional for medical advice."
    ),
    is_educational_only=True,
    emergency_contact_instructions="In case of acute medical emergencies, immediately call 911, 112, or local emergency services."
)

PROHIBITED_CLINICAL_PHRASES = [
    r"\bi\s+diagnose\s+you\s+with\b",
    r"\byou\s+definitely\s+have\b",
    r"\bi\s+am\s+prescribing\s+you\b",
    r"\btake\s+\d+\s*mg\s+of\s+[a-z]+\s+daily\s+without\s+seeing\s+a\s+doctor\b"
]

def sanitize_clinical_output(answer: str) -> str:
    """
    Substitutes definitive diagnostic assertions with probabilistic educational phrasing.
    """
    sanitized = answer
    for pattern in PROHIBITED_CLINICAL_PHRASES:
        sanitized = re.sub(
            pattern,
            "Clinical evaluation suggests consideration of",
            sanitized,
            flags=re.IGNORECASE
        )
    return sanitized

def validate_clinical_response(
    response_text: str,
    sources: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Validates clinical compliance of the AI response:
    - Verifies non-diagnostic posture
    - Checks that sources are clinician approved (if provided)
    - Returns standardized disclaimer
    """
    flagged = False
    reasons = []

    for pattern in PROHIBITED_CLINICAL_PHRASES:
        if re.search(pattern, response_text, re.IGNORECASE):
            flagged = True
            reasons.append("Response contained definitive diagnostic phrasing; sanitized automatically.")

    sanitized_text = sanitize_clinical_output(response_text)

    # Check source approvals
    unapproved_sources = []
    if sources:
        for s in sources:
            is_approved = s.get("is_clinically_approved", True) if isinstance(s, dict) else getattr(s, "is_clinically_approved", True)
            title = s.get("title", "Unknown Source") if isinstance(s, dict) else getattr(s, "title", "Unknown Source")
            if not is_approved:
                unapproved_sources.append(title)

    if unapproved_sources:
        reasons.append(f"Warning: {len(unapproved_sources)} unreviewed sources were noted.")

    return {
        "valid": True,
        "sanitized_text": sanitized_text,
        "disclaimer": STANDARD_CLINICAL_DISCLAIMER,
        "safety_notes": reasons
    }
