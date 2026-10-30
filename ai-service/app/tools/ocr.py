"""
OCR and Clinical Lab Report Extraction Tool
Extracts textual content and parses structured laboratory findings from medical reports.
"""
import re
import base64
import io
from typing import List, Dict, Any, Optional
from app.schemas.tools import LabFinding, OCRResult
from pypdf import PdfReader

# Clinical lab parameter regex rules and normal reference ranges
LAB_PATTERNS = [
    {
        "name": "Hemoglobin",
        "pattern": r"(?:hemoglobin|hb|hgb)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(g/dl|g/l)?",
        "unit": "g/dL",
        "ref": "12.0 - 17.5 g/dL",
        "normal_min": 12.0,
        "normal_max": 17.5,
    },
    {
        "name": "Fasting Blood Glucose",
        "pattern": r"(?:fasting\s+(?:blood\s+)?glucose|fbs|glucose\s*\(fasting\))\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(mg/dl|mmol/l)?",
        "unit": "mg/dL",
        "ref": "70 - 99 mg/dL",
        "normal_min": 70.0,
        "normal_max": 99.0,
    },
    {
        "name": "HbA1c",
        "pattern": r"(?:hba1c|glycated\s+hemoglobin)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(%)?",
        "unit": "%",
        "ref": "< 5.7 %",
        "normal_min": 4.0,
        "normal_max": 5.6,
    },
    {
        "name": "White Blood Cell Count",
        "pattern": r"(?:wbc|white\s+blood\s+cells?|total\s+leukocyte\s+count|tlc)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:x10\^?3/ul|/cumm|k/ul)?",
        "unit": "x10^3/uL",
        "ref": "4.5 - 11.0 x10^3/uL",
        "normal_min": 4.5,
        "normal_max": 11.0,
    },
    {
        "name": "Platelets",
        "pattern": r"(?:platelets?|plt)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(?:x10\^?3/ul|k/ul|lakhs?/cumm)?",
        "unit": "x10^3/uL",
        "ref": "150 - 450 x10^3/uL",
        "normal_min": 150.0,
        "normal_max": 450.0,
    },
    {
        "name": "Total Cholesterol",
        "pattern": r"(?:total\s+cholesterol|cholesterol\s+total)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(mg/dl|mmol/l)?",
        "unit": "mg/dL",
        "ref": "< 200 mg/dL",
        "normal_min": 125.0,
        "normal_max": 199.0,
    },
    {
        "name": "Serum Creatinine",
        "pattern": r"(?:creatinine|serum\s+creatinine)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(mg/dl|umol/l)?",
        "unit": "mg/dL",
        "ref": "0.7 - 1.3 mg/dL",
        "normal_min": 0.7,
        "normal_max": 1.3,
    },
    {
        "name": "Blood Pressure Systolic",
        "pattern": r"(?:blood\s+pressure|bp)\s*[:=]?\s*(\d{2,3})\s*/\s*(\d{2,3})",
        "unit": "mmHg",
        "ref": "< 120/80 mmHg",
        "normal_min": 90.0,
        "normal_max": 120.0,
    }
]

def extract_structured_findings(text: str) -> List[LabFinding]:
    """Parse medical text for standardized lab biomarkers and abnormal flags."""
    findings: List[LabFinding] = []
    text_clean = text.lower()

    for item in LAB_PATTERNS:
        match = re.search(item["pattern"], text_clean)
        if match:
            raw_val = match.group(1)
            try:
                num_val = float(raw_val)
                min_n = item["normal_min"]
                max_n = item["normal_max"]
                
                if num_val < min_n:
                    status = "LOW"
                elif num_val > max_n * 1.5:
                    status = "CRITICAL"
                elif num_val > max_n:
                    status = "HIGH"
                else:
                    status = "NORMAL"

                # Check if blood pressure dual reading
                if "blood pressure" in item["name"].lower() and match.lastindex and match.lastindex >= 2:
                    raw_val = f"{match.group(1)}/{match.group(2)}"
                    dia = float(match.group(2))
                    if num_val >= 180 or dia >= 120:
                        status = "CRITICAL"
                    elif num_val >= 140 or dia >= 90:
                        status = "HIGH"

                findings.append(LabFinding(
                    test_name=item["name"],
                    value=str(raw_val),
                    unit=item["unit"],
                    reference_range=item["ref"],
                    status=status
                ))
            except (ValueError, TypeError):
                continue

    return findings

def extract_text_from_report(file_bytes_base64: Optional[str] = None, file_path: Optional[str] = None) -> str:
    """Extract textual content from a report file or base64 stream."""
    if file_bytes_base64:
        try:
            raw_data = base64.b64decode(file_bytes_base64)
            # Try parsing as PDF stream
            try:
                reader = PdfReader(io.BytesIO(raw_data))
                text_parts = [page.extract_text() or "" for page in reader.pages]
                full_text = "\n".join(text_parts).strip()
                if full_text:
                    return full_text
            except Exception:
                pass

            # Try parsing as UTF-8 plaintext / OCR text stream
            return raw_data.decode("utf-8", errors="ignore")
        except Exception as e:
            return f"Error decoding base64 payload: {str(e)}"

    if file_path:
        try:
            if file_path.endswith(".pdf"):
                reader = PdfReader(file_path)
                return "\n".join([page.extract_text() or "" for page in reader.pages]).strip()
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        except Exception as e:
            return f"Error reading file {file_path}: {str(e)}"

    return ""

def process_medical_report(
    file_name: str,
    file_bytes_base64: Optional[str] = None,
    file_path: Optional[str] = None,
    document_type: str = "LAB_REPORT"
) -> OCRResult:
    """
    Executes OCR text extraction and structured biomarker parsing.
    """
    extracted_text = extract_text_from_report(file_bytes_base64, file_path)
    
    if not extracted_text:
        return OCRResult(
            success=False,
            extracted_text="",
            structured_findings=[],
            confidence=0.0,
            message="No textual content could be extracted from the provided medical document."
        )

    findings = extract_structured_findings(extracted_text)
    
    return OCRResult(
        success=True,
        extracted_text=extracted_text,
        structured_findings=findings,
        confidence=0.92 if findings else 0.75,
        message=f"Extracted {len(findings)} structured biomarkers from {file_name}."
    )
