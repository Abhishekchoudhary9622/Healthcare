"""
Appointment Assistance Agent
Recommends medical specialists deterministically based on clinical symptom profile.
Enforces strict deterministic safety rules: Requires explicit patient confirmation
before committing any booking or consequential action.
"""
from typing import Dict, Any
from app.agents.state import HealthSyncAgentState
from app.schemas.agents import ConfirmationAction

SPECIALIST_DIR = {
    "cardio": {"name": "Dr. Emily Williams, MD, FACC", "specialty": "Cardiology", "fee": "₹800"},
    "heart": {"name": "Dr. Emily Williams, MD, FACC", "specialty": "Cardiology", "fee": "₹800"},
    "blood pressure": {"name": "Dr. Emily Williams, MD, FACC", "specialty": "Cardiology", "fee": "₹800"},
    "neuro": {"name": "Dr. Michael Chen, MD, DM", "specialty": "Neurology", "fee": "₹1000"},
    "headache": {"name": "Dr. Michael Chen, MD, DM", "specialty": "Neurology", "fee": "₹1000"},
    "ortho": {"name": "Dr. Robert Johnson, MS", "specialty": "Orthopedics", "fee": "₹900"},
    "knee": {"name": "Dr. Robert Johnson, MS", "specialty": "Orthopedics", "fee": "₹900"},
    "bone": {"name": "Dr. Robert Johnson, MS", "specialty": "Orthopedics", "fee": "₹900"},
    "derma": {"name": "Dr. Priya Patel, MD", "specialty": "Dermatology", "fee": "₹700"},
    "skin": {"name": "Dr. Priya Patel, MD", "specialty": "Dermatology", "fee": "₹700"},
    "general": {"name": "Dr. James Brown, MBBS", "specialty": "General Practice", "fee": "₹500"}
}

def run_appointment_agent(state: HealthSyncAgentState) -> HealthSyncAgentState:
    """
    Appointment Assistance Agent:
    Applies deterministic backend logic for doctor scheduling and consultation mode.
    Enforces that consequential actions require explicit patient confirmation.
    """
    query = state.get("query", "").lower()

    # Determine matched specialist
    matched = SPECIALIST_DIR["general"]
    for key, doc in SPECIALIST_DIR.items():
        if key in query:
            matched = doc
            break

    # Determine consultation mode
    mode = "VIDEO" if "video" in query else "IN_PERSON"

    action_details = {
        "doctor_name": matched["name"],
        "specialty": matched["specialty"],
        "consultation_fee": matched["fee"],
        "mode": mode,
        "patient_id": state.get("patient_id")
    }

    action_dict = {
        "action_type": "BOOK_APPOINTMENT",
        "description": f"Book a {mode} consultation with {matched['name']} ({matched['specialty']}) for clinical evaluation.",
        "parameters": action_details,
        "details": action_details,
        "requires_explicit_confirmation": True
    }

    response_text = (
        f"### Appointment Scheduling Proposal\n\n"
        f"Based on your symptoms and clinical request, we have identified the following specialist match:\n\n"
        f"- **Doctor**: **{matched['name']}**\n"
        f"- **Department**: {matched['specialty']}\n"
        f"- **Consultation Mode**: {'📹 HD Video Call' if mode == 'VIDEO' else '🏥 In-Clinic Visit'}\n"
        f"- **Consultation Fee**: {matched['fee']}\n\n"
        f"⚠️ **Explicit Patient Confirmation Required:**\n"
        f"In accordance with clinical safety guidelines, HealthSync does not automatically book slots without your approval. "
        f"Please click **Confirm Booking** in your portal or reply with explicit patient confirmation to finalize this appointment."
    )

    state["current_agent"] = "appointment_agent"
    state["response_text"] = response_text
    state["final_response"] = response_text
    state["urgency"] = "ROUTINE"
    state["clinical_urgency"] = "ROUTINE"
    state["requires_confirmation"] = True
    state["confirmation_action"] = action_dict
    state["safety_flags"] = ["APPOINTMENT_CONFIRMATION_REQUIRED"]
    state["disclaimer"] = "Appointment proposals require explicit patient confirmation before slot reservation."
    return state
