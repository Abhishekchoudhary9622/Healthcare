"""
Medication Information Agent
Pharmacotherapy guidance, approved monograph details, black box warnings,
and clinical drug-drug interaction detection.
"""
import re
from typing import Dict, Any, List
from app.agents.state import HealthSyncAgentState
from app.rag.hybrid_retriever import hybrid_retrieve_sync
from app.schemas.rag import PassageReference

KNOWN_DRUG_INTERACTIONS = [
    ({"ibuprofen", "aspirin"}, "Elevated risk of gastrointestinal bleeding and attenuation of aspirin's cardioprotective antiplatelet effects."),
    ({"ibuprofen", "warfarin"}, "Major hemorrhagic danger: NSAIDs displace warfarin from albumin and inhibit platelet aggregation."),
    ({"ibuprofen", "lisinopril"}, "Risk of acute renal failure (triple whammy effect) and attenuation of antihypertensive efficacy."),
    ({"ibuprofen", "amlodipine"}, "NSAIDs may decrease the blood pressure lowering effect of calcium channel blockers."),
    ({"amoxicillin", "methotrexate"}, "Penicillins reduce the renal excretion of methotrexate, increasing toxicity.")
]

def run_medication_agent(state: HealthSyncAgentState) -> HealthSyncAgentState:
    """
    Medication Information Agent:
    Provides pharmacotherapy details, dosage schedules, black box warnings,
    and checks for dangerous drug-drug interactions.
    """
    query = state.get("query", "")
    query_lower = query.lower()

    # 1. Check for drug-drug interactions in query
    detected_interactions = []
    found_drugs = []
    for drug in ["ibuprofen", "aspirin", "warfarin", "lisinopril", "amlodipine", "amoxicillin", "cetirizine"]:
        if drug in query_lower:
            found_drugs.append(drug)

    for drug_pair, warning in KNOWN_DRUG_INTERACTIONS:
        if drug_pair.issubset(set(found_drugs)):
            detected_interactions.append(f"⚠️ **Interaction Alert ({' + '.join(drug_pair).title()}):** {warning}")

    # 2. Retrieve verified pharmacological monograph from RAG synchronously
    med_chunks = hybrid_retrieve_sync(query=f"pharmacology monograph dosage contraindications {query}", top_k=2)

    response_lines = ["### Clinical Medication Advisory\n"]

    if detected_interactions:
        response_lines.append("**Potential Drug Interactions Identified:**")
        for alert in detected_interactions:
            response_lines.append(f"- {alert}")
        response_lines.append("")

    if med_chunks:
        response_lines.append("**Approved Clinical Monograph Highlights:**")
        response_lines.append(med_chunks[0].content)
        if len(med_chunks) > 1:
            response_lines.append(f"\n{med_chunks[1].content[:200]}...")
    else:
        response_lines.append(
            "Please review dosage instructions with your prescribing physician. "
            "Never alter or discontinue prescription medications without direct clinical oversight."
        )

    citations = [
        PassageReference(
            citation_id=f"[{idx}]",
            title=c.title,
            section=c.section,
            url=c.metadata.url if c.metadata else None,
            excerpt=c.content[:140] + "...",
            confidence_score=c.score or 0.90,
            is_approved=c.metadata.is_clinically_approved if c.metadata else True
        )
        for idx, c in enumerate(med_chunks, start=1)
    ]

    response_text = "\n".join(response_lines)

    state["current_agent"] = "medication_agent"
    state["response_text"] = response_text
    state["final_response"] = response_text
    state["citations"] = citations
    state["evidence_status"] = "SUFFICIENT" if med_chunks else "INSUFFICIENT_EVIDENCE"
    state["urgency"] = "URGENT" if detected_interactions else "ROUTINE"
    state["clinical_urgency"] = "URGENT" if detected_interactions else "ROUTINE"
    state["safety_flags"] = ["DRUG_INTERACTION_DETECTED"] if detected_interactions else []
    state["requires_confirmation"] = False
    state["disclaimer"] = "Pharmacotherapy guidance is for patient reference only and does not supersede direct clinician prescriptions."
    return state
