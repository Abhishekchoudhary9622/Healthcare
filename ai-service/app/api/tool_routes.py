"""
AI Tools API Endpoints
Medical Report OCR, Speech-to-Text symptom dictation, and Emergency Red-Flag detection.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from app.dependencies import verify_service_auth
from app.schemas.tools import OCRRequest, OCRResult, STTRequest, STTResult
from app.tools.ocr import process_medical_report
from app.tools.stt import process_speech_to_text
from app.tools.red_flags import check_emergency_red_flags
from app.schemas.common import ClinicalUrgency

router = APIRouter(prefix="/api/tools", tags=["AI Tools"])

@router.post("/ocr", response_model=OCRResult)
async def api_process_ocr(
    request: OCRRequest,
    auth: Dict[str, Any] = Depends(verify_service_auth)
):
    """
    Extracts text and structured lab biomarkers (Glucose, HbA1c, Hemoglobin, BP, etc.)
    from uploaded medical documents or base64 streams.
    """
    try:
        result = process_medical_report(
            file_name=request.file_name,
            file_bytes_base64=request.file_bytes_base64,
            file_path=request.file_path,
            document_type=request.document_type
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR extraction failed: {str(e)}"
        )

@router.post("/stt", response_model=STTResult)
async def api_process_stt(
    request: STTRequest,
    auth: Dict[str, Any] = Depends(verify_service_auth)
):
    """
    Transcribes audio voice symptom input and maps to normalized clinical symptoms.
    """
    try:
        result = process_speech_to_text(
            audio_base64=request.audio_base64,
            language=request.language
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Speech transcription failed: {str(e)}"
        )

@router.post("/red-flags")
async def api_check_red_flags(
    payload: Dict[str, str],
    auth: Dict[str, Any] = Depends(verify_service_auth)
):
    """
    Scans patient inputs for life-threatening emergency symptoms.
    """
    text = payload.get("text", "")
    is_emergency, urgency, msg, actions = check_emergency_red_flags(text)
    return {
        "is_emergency": is_emergency,
        "urgency": urgency.value,
        "escalation_message": msg,
        "recommended_actions": actions
    }
