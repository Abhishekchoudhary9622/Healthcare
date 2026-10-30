from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from app.schemas.common import SourceMetadata

class OKFSection(BaseModel):
    heading: str
    content: str
    key_findings: List[str] = Field(default_factory=list)
    contraindications: List[str] = Field(default_factory=list)
    red_flags: List[str] = Field(default_factory=list)

class OKFDocument(BaseModel):
    id: str = Field(..., description="Unique OKF Code e.g. OKF-CARD-001")
    title: str
    clinical_domain: str
    version: str = "1.0"
    provenance: SourceMetadata
    sections: List[OKFSection]
    entities: List[Dict[str, str]] = Field(default_factory=list)
    relationships: List[Dict[str, str]] = Field(default_factory=list)

class OKFValidationResult(BaseModel):
    valid: bool
    doc_id: str
    is_clinically_approved: bool
    evidence_level: Optional[str]
    missing_fields: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    message: str
