"""
Unit and Integration Tests for GraphRAG:
Neo4j / NetworkX graph operations, Entity Extraction, k-hop Subgraph Traversal, and Graph Contextualization.
"""
import pytest
from app.graph.client import MedicalGraphClient, get_graph_client
from app.graph.extractor import extract_clinical_entities_from_text
from app.graph.graph_rag import GraphRAGEngine
from app.schemas.graph import Entity, Relationship


def test_medical_graph_client_operations():
    client = MedicalGraphClient()

    # Add entities
    client.add_entity(Entity(id="COND_HTN", name="Hypertension", type="Condition"))
    client.add_entity(Entity(id="SYMP_HEADACHE", name="Headache", type="Symptom"))
    client.add_entity(Entity(id="MED_LISINOPRIL", name="Lisinopril", type="Medication"))
    client.add_entity(Entity(id="SPEC_CARDIOLOGY", name="Cardiology", type="Specialization"))

    # Add relationships
    client.add_relationship(Relationship(source_id="COND_HTN", target_id="SYMP_HEADACHE", type="PRESENTS_WITH"))
    client.add_relationship(Relationship(source_id="MED_LISINOPRIL", target_id="COND_HTN", type="TREATS"))
    client.add_relationship(Relationship(source_id="COND_HTN", target_id="SPEC_CARDIOLOGY", type="BELONGS_TO_SPECIALTY"))

    stats = client.get_graph_stats()
    assert stats["total_nodes"] >= 4
    assert stats["total_edges"] >= 3

    # Query 2-hop subgraph around Lisinopril
    subgraph = client.get_k_hop_subgraph(["MED_LISINOPRIL"], max_hops=2)
    entity_names = [e.name for e in subgraph.entities]
    assert "Lisinopril" in entity_names
    assert "Hypertension" in entity_names

def test_clinical_entity_extraction():
    query = "Patient has severe chest pain, shortness of breath, and takes ibuprofen for fever."
    entities = extract_clinical_entities_from_text(query)
    names = [e.name.lower() for e in entities]

    assert any("chest pain" in n for n in names)
    assert any("shortness of breath" in n for n in names)
    assert any("ibuprofen" in n for n in names)
    assert any("fever" in n for n in names)

def test_graph_rag_contextualization_and_red_flags():
    client = get_graph_client()
    # Add acute coronary syndrome emergency relationship

    client.add_entity(Entity(id="COND_ACS", name="Acute Coronary Syndrome", type="Condition"))
    client.add_entity(Entity(id="SYMP_CHEST_PAIN", name="Chest Pain", type="Symptom"))
    client.add_relationship(Relationship(
        source_id="SYMP_CHEST_PAIN",
        target_id="COND_ACS",
        type="ESCALATES_TO_EMERGENCY"
    ))

    engine = GraphRAGEngine()
    res = engine.contextualize_query("Patient has crushing chest pain radiating to arm")

    assert "subgraph" in res
    assert "graph_context" in res
    assert res["is_emergency_flagged"] is True
    assert len(res["emergency_details"]) > 0
