"""
Unit and Integration Tests for RAG Pipeline:
Chunking, Embeddings, Ingestion, Dual-Mode Vector Storage, and Hybrid Retrieval.
"""
import asyncio
import numpy as np
from app.rag.chunker import chunk_medical_document, split_text_with_overlap
from app.rag.embeddings import ClinicalEmbeddingEngine
from app.rag.vector_store import VectorStore
from app.rag.ingestion import ingest_document
from app.rag.hybrid_retriever import hybrid_retrieve
from app.schemas.rag import DocumentIngestRequest

def test_sliding_window_chunker():
    text = (
        "# Hypertension Guidelines\n\n"
        "Stage 1 hypertension is defined as systolic BP 130-139 or diastolic 80-89 mm Hg.\n\n"
        "## Lifestyle Modifications\n"
        "First-line therapy for stage 1 hypertension includes sodium restriction, DASH diet, and aerobic exercise.\n\n"
        "## Pharmacotherapy\n"
        "First-line agents include thiazide diuretics, calcium channel blockers, and ACE inhibitors."
    )
    chunks = chunk_medical_document("HYP-01", "Hypertension", text, target_chunk_size=120, overlap=30)
    assert len(chunks) >= 2
    assert all("chunk_id" in c for c in chunks)
    assert any("Lifestyle Modifications" in c["section"] for c in chunks)
    assert any("Pharmacotherapy" in c["section"] for c in chunks)

def test_clinical_embedding_engine():
    async def _test():
        engine = ClinicalEmbeddingEngine(dimension=384)
        text1 = "Acute myocardial infarction with ST-segment elevation."
        text2 = "Heart attack with severe chest pain and troponin elevation."
        text3 = "Dermatitis with itchy erythematous cutaneous lesions."

        vec1 = await engine.get_embedding(text1)
        vec2 = await engine.get_embedding(text2)
        vec3 = await engine.get_embedding(text3)

        assert len(vec1) == 384
        norm1 = np.linalg.norm(vec1)
        assert abs(norm1 - 1.0) < 1e-4

        sim_1_2 = float(np.dot(vec1, vec2))
        sim_1_3 = float(np.dot(vec1, vec3))
        assert sim_1_2 > sim_1_3

    asyncio.run(_test())

def test_vector_store_isolation_and_retrieval(tmp_path):
    async def _test():
        store_file = str(tmp_path / "test_store.jsonl")
        vstore = VectorStore(persistence_file=store_file)
        engine = ClinicalEmbeddingEngine(dimension=384)

        emb_shared = await engine.get_embedding("Metformin is initial oral therapy for type 2 diabetes mellitus.")
        emb_patient_a = await engine.get_embedding("Patient John Doe has severe penicillin allergy and diabetes.")

        await vstore.add_chunks([
            {
                "chunk_id": "GUIDE-001",
                "doc_id": "DOC-METFORMIN",
                "title": "Diabetes Guidelines",
                "section": "Therapy",
                "content": "Metformin is initial oral therapy for type 2 diabetes mellitus.",
                "embedding": emb_shared,
                "is_clinically_approved": True,
                "patient_id": None
            },
            {
                "chunk_id": "PATIENT-A-01",
                "doc_id": "EHR-JOHN",
                "title": "John Doe EHR",
                "section": "Allergies",
                "content": "Patient John Doe has severe penicillin allergy and diabetes.",
                "embedding": emb_patient_a,
                "is_clinically_approved": True,
                "patient_id": "patient_123"
            }
        ])

        q_vec = await engine.get_embedding("diabetes therapy")

        res_shared = await vstore.dense_search(q_vec, top_k=5, patient_id=None)
        assert any(c.chunk_id == "GUIDE-001" for c in res_shared)
        assert not any(c.chunk_id == "PATIENT-A-01" for c in res_shared)

        res_patient_a = await vstore.dense_search(q_vec, top_k=5, patient_id="patient_123")
        assert any(c.chunk_id == "PATIENT-A-01" for c in res_patient_a)

        res_patient_b = await vstore.dense_search(q_vec, top_k=5, patient_id="patient_999")
        assert not any(c.chunk_id == "PATIENT-A-01" for c in res_patient_b)

    asyncio.run(_test())

def test_end_to_end_ingest_and_hybrid_retrieve():
    async def _test():
        req = DocumentIngestRequest(
            doc_id="TEST-ASTHMA-01",
            title="Asthma Management Guidelines",
            content=(
                "# Asthma Inhaler Guidelines\n\n"
                "Inhaled corticosteroids (ICS) combined with formoterol are recommended for asthma controller therapy.\n"
                "Albuterol is a short-acting beta-2 agonist used as rescue relief for acute bronchospasm."
            ),
            file_type="markdown",
            is_clinically_approved=True,
            version="2.1"
        )

        ingest_res = await ingest_document(req)
        assert ingest_res.success is True
        assert ingest_res.chunks_created >= 1

        retrieved = await hybrid_retrieve("What inhaler is recommended for acute bronchospasm?", top_k=8)
        assert len(retrieved) > 0
        assert any("albuterol" in c.content.lower() or "asthma" in c.content.lower() for c in retrieved)


    asyncio.run(_test())
