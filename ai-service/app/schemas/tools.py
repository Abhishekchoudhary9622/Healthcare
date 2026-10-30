from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class OCRRequest(BaseModel):
    file_name: str
    file_bytes_base64: Optional[str] = None
    file_path: Optional[str] = None
    document_type: str = "LAB_REPORT"  # "LAB_REPORT", "PRESCRIPTION", "DISCHARGE_SUMMARY"

class LabFinding(BaseModel):
    test_name: str
    value: str
    unit: str
    reference_range: str
    status: str  # "NORMAL", "HIGH", "LOW", "CRITICAL"

class OCRResult(BaseModel):
    success: bool
    extracted_text: str
    structured_findings: List[LabFinding] = Field(default_factory=list)
    confidence: float
    message: str

class STTRequest(BaseModel):
    audio_base64: Optional[str] = None
    language: str = "en"

class STTResult(BaseModel):
    transcription: str
    confidence: float
    detected_symptoms: List[str] = Field(default_factory=list)
