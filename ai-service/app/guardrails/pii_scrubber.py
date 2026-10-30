"""
PII and PHI Privacy Guardrail
Redacts Personally Identifiable Information (PII) and Protected Health Information (PHI)
to maintain HIPAA and clinical confidentiality compliance.
"""
import re
from typing import Dict, Tuple

PII_PATTERNS = [
    # Social Security Number (SSN)
    (r"\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b", "[REDACTED_SSN]"),
    # Phone Numbers (International & US standard)
    (r"\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b", "[REDACTED_PHONE]"),
    # Email Addresses
    (r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b", "[REDACTED_EMAIL]"),
    # Medical Record Number / Patient ID
    (r"\b(?:MRN|mrn|Patient ID|patient_id)[\s:#]+([A-Za-z0-9-]{4,15})\b", "[REDACTED_MRN]"),
    # Dates of Birth (DOB)
    (r"\b(?:DOB|dob|Date of Birth)[\s:#]+(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b", "[REDACTED_DOB]"),
    # Credit Card Numbers
    (r"\b(?:\d{4}[-\s]?){3}\d{4}\b", "[REDACTED_CREDIT_CARD]")
]

def scrub_phi(text: str) -> Tuple[str, int]:
    """
    Scans and redacts PHI/PII entities from text prior to logging or storage.
    Returns:
        (sanitized_text, redaction_count)
    """
    if not text:
        return "", 0

    sanitized = text
    total_redactions = 0

    for pattern, replacement in PII_PATTERNS:
        matches = list(re.finditer(pattern, sanitized))
        if matches:
            total_redactions += len(matches)
            sanitized = re.sub(pattern, replacement, sanitized)

    return sanitized, total_redactions
