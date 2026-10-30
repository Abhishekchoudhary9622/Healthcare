from enum import Enum

class NodeLabel(str, Enum):
    CONDITION = "Condition"
    SYMPTOM = "Symptom"
    MEDICATION = "Medication"
    SPECIALIZATION = "Specialization"
    RED_FLAG_SYMPTOM = "RedFlagSymptom"
    CLINICAL_CONCEPT = "ClinicalConcept"

class RelationType(str, Enum):
    PRESENTS_WITH = "PRESENTS_WITH"
    TREATS = "TREATS"
    CONTRAINDICATED_IN = "CONTRAINDICATED_IN"
    BELONGS_TO_SPECIALTY = "BELONGS_TO_SPECIALTY"
    ESCALATES_TO_EMERGENCY = "ESCALATES_TO_EMERGENCY"
    DRUG_INTERACTION_WITH = "DRUG_INTERACTION_WITH"
