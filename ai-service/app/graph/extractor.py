"""
Clinical Entity Recognizer
Maps unstructured clinical narratives and queries to ontological entity nodes
(Conditions, Symptoms, Medications, Specializations).
"""
import re
from typing import List, Dict, Any
from app.schemas.graph import Entity, Relationship

CLINICAL_ENTITIES_LEXICON = {
    "hypertension": {"id": "COND_HYPERTENSION", "type": "Condition", "name": "Hypertension"},
    "high blood pressure": {"id": "COND_HYPERTENSION", "type": "Condition", "name": "Hypertension"},
    "diabetes": {"id": "COND_DIABETES", "type": "Condition", "name": "Type 2 Diabetes Mellitus"},
    "asthma": {"id": "COND_ASTHMA", "type": "Condition", "name": "Asthma"},
    "chest pain": {"id": "SYMP_CHEST_PAIN", "type": "Symptom", "name": "Chest Pain"},
    "substernal chest pain": {"id": "SYMP_CHEST_PRESSURE", "type": "Symptom", "name": "Substernal Chest Pressure"},
    "shortness of breath": {"id": "SYMP_DYSPNEA", "type": "Symptom", "name": "Shortness of Breath"},
    "dyspnea": {"id": "SYMP_DYSPNEA", "type": "Symptom", "name": "Shortness of Breath"},
    "fever": {"id": "SYMP_FEVER", "type": "Symptom", "name": "Fever"},
    "myocardial infarction": {"id": "COND_MYOCARDIAL_INFARCTION", "type": "Condition", "name": "Acute Myocardial Infarction"},
    "heart attack": {"id": "COND_MYOCARDIAL_INFARCTION", "type": "Condition", "name": "Acute Myocardial Infarction"},
    "headache": {"id": "SYMP_HEADACHE", "type": "Symptom", "name": "Severe Headache"},
    "dizziness": {"id": "SYMP_DIZZINESS", "type": "Symptom", "name": "Dizziness"},
    "migraine": {"id": "COND_MIGRAINE", "type": "Condition", "name": "Migraine"},
    "diaphoresis": {"id": "SYMP_DIAPHORESIS", "type": "Symptom", "name": "Diaphoresis (Cold Sweats)"},
    "cold sweat": {"id": "SYMP_DIAPHORESIS", "type": "Symptom", "name": "Diaphoresis (Cold Sweats)"},
    "ibuprofen": {"id": "MED_IBUPROFEN", "type": "Medication", "name": "Ibuprofen"},
    "amoxicillin": {"id": "MED_AMOXICILLIN", "type": "Medication", "name": "Amoxicillin"},
    "amlodipine": {"id": "MED_AMLODIPINE", "type": "Medication", "name": "Amlodipine"},
    "lisinopril": {"id": "MED_LISINOPRIL", "type": "Medication", "name": "Lisinopril"},
    "peptic ulcer": {"id": "COND_PEPTIC_ULCER", "type": "Condition", "name": "Peptic Ulcer Disease"},
    "stomach bleed": {"id": "SYMP_GI_BLEED", "type": "Symptom", "name": "Gastrointestinal Bleeding"},
    "cardiology": {"id": "SPEC_CARDIOLOGY", "type": "Specialization", "name": "Cardiology"},
    "emergency medicine": {"id": "SPEC_EMERGENCY", "type": "Specialization", "name": "Emergency Medicine"},
    "neurology": {"id": "SPEC_NEUROLOGY", "type": "Specialization", "name": "Neurology"},
    "pulmonology": {"id": "SPEC_PULMONOLOGY", "type": "Specialization", "name": "Pulmonology"}
}

def extract_clinical_entities_from_text(text: str) -> List[Entity]:
    """
    Extracts structured medical entities (Conditions, Symptoms, Medications, Specializations)
    from unstructured medical text using clinical terminology matching.
    """
    found_entities = {}
    lower_text = text.lower()

    for term, data in CLINICAL_ENTITIES_LEXICON.items():
        pattern = r'\b' + re.escape(term) + r'\b'
        if re.search(pattern, lower_text):
            eid = data["id"]
            if eid not in found_entities:
                found_entities[eid] = Entity(
                    id=eid,
                    name=data["name"],
                    type=data["type"],
                    properties={"matched_term": term}
                )

    return list(found_entities.values())
