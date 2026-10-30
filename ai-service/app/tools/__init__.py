"""
HealthSync AI Tools Subsystem
"""
from app.tools.ocr import process_medical_report, extract_structured_findings, extract_text_from_report
from app.tools.stt import process_speech_to_text, extract_symptoms_from_transcript
from app.tools.red_flags import check_emergency_red_flags, RED_FLAG_PATTERNS

__all__ = [
    "process_medical_report",
    "extract_structured_findings",
    "extract_text_from_report",
    "process_speech_to_text",
    "extract_symptoms_from_transcript",
    "check_emergency_red_flags",
    "RED_FLAG_PATTERNS"
]
