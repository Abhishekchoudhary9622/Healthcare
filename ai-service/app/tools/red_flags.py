"""
Emergency Red-Flag Escalation Engine
Evaluates clinical urgency and triggers immediate emergency intervention workflows.
"""
from typing import List, Dict, Any, Tuple
from app.schemas.common import ClinicalUrgency

RED_FLAG_PATTERNS = [
    {
        "category": "CARDIAC_EMERGENCY",
        "keywords": [
            "crushing chest pain", "chest pressure", "radiating to jaw",
            "radiating to left arm", "diaphoresis with chest pain", "cardiac arrest"
        ],
        "escalation_message": (
            "CRITICAL EMERGENCY ALERT: The described symptoms (crushing chest pain / radiation) "
            "are consistent with acute coronary syndrome or myocardial infarction. "
            "DO NOT WAIT. Call emergency services (911 / 112 / 999) or proceed immediately to the nearest Emergency Department."
        ),
        "actions": ["CALL_911", "ADMINISTER_ASPIRIN_IF_NOT_CONTRAINDICATED", "REMAIN_SEATED"]
    },
    {
        "category": "STROKE_FAST",
        "keywords": [
            "facial drooping", "arm weakness", "slurred speech", "sudden numbness one side",
            "loss of vision sudden", "sudden severe thunderclap headache"
        ],
        "escalation_message": (
            "CRITICAL EMERGENCY ALERT: FAST stroke criteria detected (sudden neurological deficit). "
            "Time is brain tissue. Call emergency services immediately. Note the exact time symptoms started."
        ),
        "actions": ["CALL_911", "NOTE_TIME_OF_ONSET", "DO_NOT_CONSUME_FOOD_OR_WATER"]
    },
    {
        "category": "ANAPHYLAXIS",
        "keywords": [
            "throat swelling", "stridor", "difficulty swallowing with hives",
            "tongue swelling", "anaphylaxis", "severe allergic reaction"
        ],
        "escalation_message": (
            "CRITICAL EMERGENCY ALERT: Potential anaphylactic reaction. "
            "Use Epinephrine Auto-Injector (EpiPen) immediately if available and call emergency services."
        ),
        "actions": ["CALL_911", "ADMINISTER_EPIPEN", "LIE_FLAT_WITH_LEGS_ELEVATED"]
    },
    {
        "category": "SEVERE_RESPIRATORY",
        "keywords": [
            "cannot speak in full sentences", "gasping for air", "cyanosis", "blue lips",
            "oxygen saturation below 90", "severe asthma attack"
        ],
        "escalation_message": (
            "CRITICAL EMERGENCY ALERT: Severe acute respiratory distress detected. "
            "Emergency medical evaluation is required immediately."
        ),
        "actions": ["CALL_911", "USE_RESCUE_INHALER", "SIT_UPRIGHT"]
    }
]

def check_emergency_red_flags(text: str) -> Tuple[bool, ClinicalUrgency, str, List[str]]:
    """
    Scans text for life-threatening clinical red flags.
    Returns:
        (is_emergency, ClinicalUrgency, escalation_message, recommended_actions)
    """
    text_clean = text.lower()

    for item in RED_FLAG_PATTERNS:
        for kw in item["keywords"]:
            if kw in text_clean:
                return (
                    True,
                    ClinicalUrgency.EMERGENCY,
                    item["escalation_message"],
                    item["actions"]
                )

    # Secondary check for moderate urgent keywords
    urgent_keywords = ["high fever for 4 days", "persistent vomiting", "deep wound", "suspected fracture", "blood in stool"]
    for kw in urgent_keywords:
        if kw in text_clean:
            return (
                False,
                ClinicalUrgency.URGENT,
                "Urgent medical evaluation recommended within 12-24 hours.",
                ["SCHEDULE_SAME_DAY_APPOINTMENT", "MONITOR_VITALS"]
            )

    return (
        False,
        ClinicalUrgency.ROUTINE,
        "No acute emergency red flags identified.",
        ["ROUTINE_FOLLOW_UP"]
    )
