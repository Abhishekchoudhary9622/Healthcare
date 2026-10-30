"""
OKF Knowledge Document Validator
Enforces schema requirements, clinical provenance integrity, and reviewer verification.
Guarantees unreviewed knowledge is never certified as clinically approved.
"""
from typing import Union, List
from app.schemas.okf import OKFDocument, OKFValidationResult

def validate_okf_document(doc_or_dict: Union[dict, OKFDocument]) -> OKFValidationResult:
    """
    Validates OKF knowledge document structure, provenance, and clinical review status.
    Enforces that unreviewed documents are NEVER certified as clinically approved.
    """
    if isinstance(doc_or_dict, OKFDocument):
        doc_dict = doc_or_dict.model_dump()
    else:
        doc_dict = doc_or_dict

    missing_fields = []
    warnings = []
    doc_id = doc_dict.get("id", "UNKNOWN_DOC")

    # 1. Structural check
    for req in ["id", "title", "clinical_domain", "provenance", "sections"]:
        if req not in doc_dict or not doc_dict[req]:
            missing_fields.append(req)

    if missing_fields:
        return OKFValidationResult(
            valid=False,
            doc_id=doc_id,
            is_clinically_approved=False,
            evidence_level=None,
            missing_fields=missing_fields,
            warnings=["Document is structurally invalid."],
            message=f"Missing required fields: {', '.join(missing_fields)}"
        )

    prov = doc_dict.get("provenance", {})
    is_approved = prov.get("is_clinically_approved", False)
    reviewed_by = prov.get("reviewed_by")
    review_date = prov.get("publication_date") or prov.get("review_date")
    evidence_level = prov.get("evidence_level")

    # 2. Safety Rule: Never treat unreviewed knowledge as clinically approved
    if not is_approved or not reviewed_by:
        warnings.append("Document lacks verified clinical review. Quarantined from treatment decisions.")
        is_approved = False

    if not prov.get("url"):
        warnings.append("Document lacks clinical provenance URL / DOI citation.")

    if not doc_dict.get("sections"):
        warnings.append("Document has no clinical content sections.")

    return OKFValidationResult(
        valid=len(missing_fields) == 0,
        doc_id=doc_id,
        is_clinically_approved=is_approved,
        evidence_level=evidence_level,
        missing_fields=missing_fields,
        warnings=warnings,
        message="Validated successfully." if is_approved else "Validated with clinical review warnings."
    )
