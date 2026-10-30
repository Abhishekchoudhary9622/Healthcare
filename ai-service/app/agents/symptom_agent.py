"""
Symptom Assessment Agent
Evaluates symptom presentations, clinical red-flags, and triage urgencies.
Triggers immediate emergency escalation rules for critical conditions.
"""
import re
from typing import Dict, Any, List
from app.agents.state import HealthSyncAgentState
from app.graph.extractor import extract_clinical_entities_from_text
from app.rag.hybrid_retriever import hybrid_retrieve_sync
from app.tools.red_flags import check_emergency_red_flags
from app.schemas.rag import PassageReference

# Red flag emergency keyword patterns
EMERGENCY_CLUSTERS = [
    (r'\b(crushing|radiat.*arm|radiat.*jaw|cold sweat|substernal)\b.*(chest|heart|pain|breath)', "Suspected Acute Coronary Syndrome (Heart Attack)"),
    (r'\b(facial droop|arm weakness|slurred speech|sudden numbness)\b', "Suspected Acute Ischemic Stroke (FAST protocol)"),
    (r'\b(cannot breathe|severe suffocation|stridor|choking|cyanosis)\b', "Acute Respiratory Compromise"),
    (r'\b(uncontrolled bleeding|profuse hemorrhage|coughing blood)\b', "Severe Hemorrhage"),
    (r'\b(anaphylaxis|throat swelling|unable to swallow)\b', "Severe Anaphylactic Shock")
]

SPECIALTY_MAPPING = {
    "cardio": "Cardiology",
    "chest": "Cardiology",
    "heart": "Cardiology",
    "pulse": "Cardiology",
    "blood pressure": "Cardiology",
    "headache": "Neurology",
    "migraine": "Neurology",
    "dizzy": "Neurology",
    "joint": "Orthopedics",
    "knee": "Orthopedics",
    "back": "Orthopedics",
    "bone": "Orthopedics",
    "skin": "Dermatology",
    "rash": "Dermatology",
    "itch": "Dermatology",
    "tooth": "Dentistry",
    "teeth": "Dentistry",
    "child": "Pediatrics",
    "fever": "Internal Medicine / General Practice",
    "cough": "Internal Medicine / General Practice"
}

def run_symptom_agent(state: HealthSyncAgentState) -> HealthSyncAgentState:
    """
    Symptom Assessment Agent:
    Performs clinical triage, red-flag detection, urgency categorization,
    and specialist routing.
    """
    query = state.get("query", "")
    query_lower = query.lower()

    # 1. Emergency Red Flag Detection
    is_emergency = False
    emergency_reasons = []

    # Check emergency red flags tool
    em_tool, em_urgency, em_msg, em_actions = check_emergency_red_flags(query_lower)
    if em_tool:
        is_emergency = True
        emergency_reasons.append(em_msg)

    # Check cluster patterns
    for pattern, reason in EMERGENCY_CLUSTERS:
        if re.search(pattern, query_lower):
            is_emergency = True
            if reason not in emergency_reasons:
                emergency_reasons.append(reason)

    # 2. Specialty Matching
    matched_specialty = "General Practice"
    for keyword, spec in SPECIALTY_MAPPING.items():
        if keyword in query_lower:
            matched_specialty = spec
            break

    # 3. Urgency Determination & Response Formulation
    if is_emergency:
        urgency = "EMERGENCY"
        safety_flags = ["EMERGENCY_ESCALATION", "CRITICAL_RED_FLAG"]
        
        response_text = (
            "⚠️ **CRITICAL MEDICAL EMERGENCY DETECTED** ⚠️\n\n"
            f"Your reported symptoms match clinical indicators for: **{', '.join(emergency_reasons)}**.\n\n"
            "**Immediate Action Required:**\n"
            "1. **Call Emergency Services (911 or 112 / 108)** immediately or proceed to the nearest Emergency Department.\n"
            "2. Do NOT attempt to drive yourself.\n"
            "3. Rest in a seated, comfortable position while emergency responders are en route.\n\n"
            "*Standard online appointment booking is deferred during acute emergencies.*"
        )
    else:
        if any(w in query_lower for w in ["severe", "high fever", "unbearable", "worsening", "blood"]):
            urgency = "URGENT"
            safety_flags = ["URGENT_TRIAGE"]
        else:
            urgency = "ROUTINE"
            safety_flags = []

        # Hybrid knowledge lookup for supportive care guidance synchronously
        guidance_chunks = hybrid_retrieve_sync(query=f"{matched_specialty} symptoms {query}", top_k=2)
        guidance_excerpt = guidance_chunks[0].content[:200] if guidance_chunks else ""

        response_text = (
            f"**Clinical Symptom Triage Assessment**\n\n"
            f"- **Triage Urgency Category**: `{urgency}`\n"
            f"- **Recommended Medical Specialty**: **{matched_specialty}**\n\n"
            f"**Clinical Analysis:**\n"
            f"Your described presentation aligns with standard indications evaluated by **{matched_specialty}** specialists. "
            f"{guidance_excerpt}\n\n"
            f"**Next Steps:**\n"
            f"We recommend scheduling a clinical consultation with a verified {matched_specialty} specialist. "
            f"You can confirm this appointment via the **Book Appointment** workflow."
        )

    state["current_agent"] = "symptom_agent"
    state["response_text"] = response_text
    state["final_response"] = response_text
    state["urgency"] = urgency
    state["clinical_urgency"] = urgency
    state["safety_flags"] = safety_flags
    state["red_flag_alert"] = is_emergency
    state["emergency_details"] = emergency_reasons
    state["evidence_status"] = "SUFFICIENT"
    state["requires_confirmation"] = False
    state["disclaimer"] = "Symptom assessment is an informational triage aid and does not constitute a definitive medical diagnosis."
    return state
