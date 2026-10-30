"""
GraphRAG Pydantic Data Models
"""
from pydantic import BaseModel, Field, model_validator
from typing import Optional, List, Dict, Any

class Entity(BaseModel):
    id: str
    name: str
    type: str = "ClinicalConcept"  # "Condition", "Symptom", "Medication", "Specialization", "ClinicalFinding"
    properties: Dict[str, Any] = Field(default_factory=dict)

class Relationship(BaseModel):
    source_id: str = ""
    target_id: str = ""
    type: str = "RELATED_TO"  # "PRESENTS_WITH", "TREATS", "CONTRAINDICATED_IN", "BELONGS_TO_SPECIALTY"
    properties: Dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def populate_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "source" in data and not data.get("source_id"):
                data["source_id"] = data["source"]
            if "target" in data and not data.get("target_id"):
                data["target_id"] = data["target"]
        return data

class SubgraphResult(BaseModel):
    entities: List[Entity] = Field(default_factory=list)
    relationships: List[Relationship] = Field(default_factory=list)
    matched_paths: List[str] = Field(default_factory=list)

class KnowledgeGraphQuery(BaseModel):
    query: str = ""
    entity_names: List[str] = Field(default_factory=list)
    max_hops: int = 2
    relationship_types: Optional[List[str]] = None
