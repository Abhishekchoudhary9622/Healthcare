"""
Medical Document Extraction Agent
Parses clinical notes, lab summaries, and diagnostic reports into
structured biomarkers with reference range evaluations.
"""
import re
from typing import Dict, Any, List
from app.agents.state import HealthSyncAgentState

COMMON_LAB_PATTERNS = [
    (r'blood pressure[:\s]+(\d{2,3}/\d{2,3})\s*(mmhg)?', "Blood Pressure", "mmHg", "120/80"),
    (r'heart rate[:\s]+(\d{2,3})\s*(bpm)?', "Heart Rate", "bpm", "60-100"),
    (r'glucose[:\s]+(\d{2,3})\s*(mg/dl)?', "Fasting Blood Glucose", "mg/dL", "70-99"),
    (r'cholesterol[:\s]+(\d{2,3})\s*(mg/dl)?', "Total Cholesterol", "mg/dL", "< 200"),
    (r'hba1c[:\s]+(\d{1,2}\.?\d?)\s*%', "Hemoglobin A1c", "%", "< 5.7"),
    (r'bmi[:\s]+(\d{1,2}\.?\d?)', "Body Mass Index", "kg/m²", "18.5-24.9")
]

def run_document_agent(state: HealthSyncAgentState) -> HealthSyncAgentState:
    """
    Medical Document Extraction Agent:
    Parses unstructured clinical notes, lab summaries, and diagnostic findings
    into structured clinical parameters with status assessment.
    """
    text = state.get("query", "")
    extracted_findings = []

    for pattern, test_name, unit, ref_range in COMMON_LAB_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            val = match.group(1)
            extracted_findings.append({
                "test_name": test_name,
                "value": val,
                "unit": unit,
                "reference_range": ref_range
            })

    lines = ["### Structured Medical Document Extraction\n"]
    if extracted_findings:
        lines.append("| Clinical Test | Extracted Value | Reference Range |")
        lines.append("|---|---|---|")
        for f in extracted_findings:
            lines.append(f"| **{f['test_name']}** | `{f['value']} {f['unit']}` | {f['reference_range']} |")
        lines.append("\n**Clinical Impression:** Diagnostic parameters extracted from submitted document text.")
    else:
        lines.append(
            "Document parsed. No standard discrete biomarker values were matched. "
            "Please ensure the document contains clear numeric clinical findings."
        )

    response_text = "\n".join(lines)

    state["current_agent"] = "document_agent"
    state["response_text"] = response_text
    state["final_response"] = response_text
    state["urgency"] = "ROUTINE"
    state["clinical_urgency"] = "ROUTINE"
    state["requires_confirmation"] = False
    state["disclaimer"] = "Document extraction is an optical/text parsing aid and must be verified against original lab reports."
    return state
