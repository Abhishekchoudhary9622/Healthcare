"""
Common Clinical Pydantic Data Models and Enums
"""
from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
from enum import Enum

class ClinicalUrgency(str, Enum):
    ROUTINE = "ROUTINE"
    URGENT = "URGENT"
    EMERGENCY = "EMERGENCY"

class SourceMetadata(BaseModel):
    source_id: str = Field(..., description="Unique source document ID")
    title: str = Field(..., description="Source title or guideline name")
    url: Optional[str] = Field(None, description="Clinical provenance URL or DOI")
    publication_date: Optional[str] = Field(None, description="Publication or revision date")
    version: str = Field("1.0", description="Document version")
    is_clinically_approved: bool = Field(True, description="True only if verified by medical review")
    reviewed_by: Optional[str] = Field(None, description="Reviewing clinician or institution")
    evidence_level: Optional[str] = Field(None, description="e.g. Level A (RCTs), Level B, Level C")

class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    services: Dict[str, str] = Field(default_factory=dict)

class ClinicalDisclaimer(BaseModel):
    notice: str = (
        "HealthSync AI provides clinical information for healthcare reference and patient guidance. "
        "It does not replace professional medical diagnosis, prescription, or emergency clinical intervention."
    )
    text: Optional[str] = None
    is_educational_only: bool = True
    is_emergency: bool = False
    emergency_contact: str = "Call 911 / 108 or proceed to the nearest emergency room immediately."
    emergency_contact_instructions: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def populate_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "text" in data and not data.get("notice"):
                data["notice"] = data["text"]
            elif "notice" in data and not data.get("text"):
                data["text"] = data["notice"]
            if "emergency_contact_instructions" in data and not data.get("emergency_contact"):
                data["emergency_contact"] = data["emergency_contact_instructions"]
            elif "emergency_contact" in data and not data.get("emergency_contact_instructions"):
                data["emergency_contact_instructions"] = data["emergency_contact"]
        return data
