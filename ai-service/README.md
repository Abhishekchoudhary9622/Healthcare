# HealthSync Clinical AI Microservice

Advanced AI-powered healthcare knowledge, clinical decision support, and multi-agent workflow platform for HealthSync.

```mermaid
flowchart TD
    subgraph Client["Client Tier"]
        FE[React + Vite Frontend]
    end

    subgraph BackendTier["Node.js Express Backend"]
        API[Express Router /api/ai]
        AUTH[JWT & Role Authorization]
        CLT[AI Service Client]
    end

    subgraph AIService["Python FastAPI AI Microservice (Port 8000)"]
        GRD[Safety Guardrails<br/>PII Scrubber | Prompt Guard]
        SUP[LangGraph Supervisor Workflow]

        subgraph Agents["Specialized Clinical Agents"]
            A1[Healthcare Knowledge Agent]
            A2[Symptom Assessment Agent]
            A3[Medication Info Agent]
            A4[Appointment Agent<br/>(Deterministic Confirmation)]
            A5[Document Extraction Agent]
            A6[Summarization Agent]
        end

        subgraph Engines["Cognitive Retrieval & Verification Engines"]
            RAG[Hybrid RAG<br/>Dense + BM25 RRF]
            GRAPH[GraphRAG<br/>Neo4j / NetworkX]
            OKF[OKF Knowledge Repository<br/>Clinical Review Validator]
            JEV[JEV Evidence Evaluator<br/>Authority | Freshness | Faithfulness | Abstain]
        end

        subgraph Storage["Storage & Knowledge Backends"]
            PG[(PostgreSQL + pgvector)]
            NEO[(Neo4j Graph Database)]
            YML[(OKF YAML Knowledge Files)]
        end
    end

    FE -->|Bearer JWT| API
    API --> AUTH
    AUTH --> CLT
    CLT -->|X-AI-Service-Key| GRD
    GRD --> SUP
    SUP --> Agents
    Agents --> Engines
    Engines --> Storage
```

---

## Architectural Principles & Compliance

1. **Non-Diagnostic Posture**: HealthSync AI is an educational and clinical decision support system. It never issues autonomous final diagnoses or prescriptions. Standard clinical disclaimers are programmatically attached to all outputs.
2. **Deterministic Booking & Safety Rules**: Consequential clinical actions (e.g., booking appointments, reserving slots, changing doctor assignments) require explicit patient confirmation via a structured `ConfirmationAction` payload.
3. **No Unreviewed Knowledge**: Open Knowledge Formulation (OKF) guidelines must pass clinical verification (`is_clinically_approved = True` with verified clinician reviewer details). Unreviewed knowledge is quarantined and never used in clinical decision trees.
4. **Abstention Policy**: When evidence confidence $< 0.60$ or claim faithfulness $< 0.70$, the system returns `INSUFFICIENT_EVIDENCE` and abstains from giving unverified medical claims.
5. **Private Data Isolation**: Patient-level records (EHR) and shared clinical guidelines are strictly separated. Queries isolate private records using patient ID access filters.
6. **Zero-Setup Resiliency**: All storage engines (pgvector and Neo4j) feature dual-mode operation: they connect to production database clusters when available and automatically fall back to high-performance in-memory and persisted JSONL/NetworkX backends for local testing.

---

## 1. RAG (Retrieval-Augmented Generation)

- **Ingestion Pipeline**: Supports PDF (`pypdf`), DOCX (`python-docx`), Markdown, and raw medical text streams.
- **Section-Aware Sliding Chunker**: Preserves clinical section hierarchies (`Indications`, `Contraindications`, `Dosage`, `Red Flags`) with configurable sliding window overlap (default 600 chars with 120-char overlap).
- **Dense Clinical Embeddings**: `ClinicalEmbeddingEngine` generates unit-normalized 384-dimensional dense vectors using clinical subword n-gram hashing and L2 normalization ($||\vec{v}|| = 1.0$), ensuring dot-product equals cosine similarity.
- **Dual-Mode Vector Storage**:
  - *Production*: PostgreSQL with `pgvector` extension (`CREATE EXTENSION IF NOT EXISTS vector`).
  - *Resilient Fallback*: Persisted JSONL index (`ai-service/data/vector_store.jsonl`) with vector math for zero-dependency execution.
- **Hybrid Retrieval**: Combines dense semantic cosine search and lexical keyword matching (with title and section boosting) using **Reciprocal Rank Fusion (RRF, $k=60$)**:
  $$\text{RRF\_Score}(d) = \sum_{m \in \{\text{dense}, \text{lexical}\}} \frac{1}{60 + \text{rank}_m(d)}$$
- **Document Versioning & Source Metadata**: Tracks `doc_id`, `version`, `publication_date`, `url`, `reviewed_by`, and `evidence_level`.

---

## 2. GraphRAG

- **Graph Topology**: Connects medical concepts across five ontological node types: `Condition`, `Symptom`, `Medication`, `Specialization`, and `ClinicalFinding`.
- **Relationship Schema**: Directed edges including `PRESENTS_WITH`, `TREATS`, `CONTRAINDICATED_IN`, `BELONGS_TO_SPECIALTY`, and `ESCALATES_TO_EMERGENCY`.
- **Database Engine**:
  - *Production*: Neo4j via official `neo4j` Python driver (`bolt://localhost:7687`).
  - *Resilient Fallback*: NetworkX MultiDiGraph in-memory engine.
- **Ego-Network Subgraph Extraction**: Traverses $k$-hop neighborhoods (default $k=2$) around extracted clinical entities to construct relational context lines (e.g., `(Ibuprofen) -[:CONTRAINDICATED_IN]-> (Peptic Ulcer Disease)`).
- **Emergency Graph Traversal**: Automatically detects paths containing `ESCALATES_TO_EMERGENCY` to trigger urgent escalation flags.

---

## 3. OKF Knowledge Management

- **Format**: Structured YAML/Markdown clinical guidelines in `ai-service/knowledge/okf/`:
  - `cardiology/hypertension_guidelines.yaml`: ACC/AHA 2024 Stage 1/2 diagnostic thresholds and stepped pharmacotherapy.
  - `pharmacology/ibuprofen_monograph.yaml`: FDA & BNF monograph with black box warnings and drug interactions.
  - `emergency/acute_coronary_syndrome_triage.yaml`: AHA/ESC acute coronary syndrome emergency triage protocol.
- **Clinical Review Validator**: Enforces presence of reviewer identity (`reviewed_by`), clinical provenance URL (`url`), and evidence level (`Level A`, `Level B`, `Level C`).
- **Quarantine Policy**: Any document with `is_clinically_approved == False` or lacking a verified reviewer is quarantined and barred from RAG/Graph sync.
- **Repository Synchronizer**: Pre-loads and indexes approved guidelines into vector and graph databases on service startup.

---

## 4. JEV-Style Evidence Evaluation

The Judge / Evidence Validator (JEV) module scores evidence across four independent dimensions:
1. **Source Authority Scoring**: Weighted by evidence tier (`Level A`: 1.0, `Level B`: 0.85, `Level C`: 0.65) and peer-reviewed domain authority boosts (`ahajournals.org`, `fda.gov`, `cdc.gov`).
2. **Temporal Freshness Decay**: Evaluates guideline publication age with decay penalties for documents older than 5 and 10 years.
3. **Claim Faithfulness & Entailment**: Extracts key assertion triples from draft responses and validates semantic entailment against retrieved passages.
4. **Conflicting Evidence Detection**: Identifies opposing recommendations across passages (e.g., contraindicated vs. recommended).
5. **Abstention Decision**: If confidence $< 0.60$ or faithfulness $< 0.70$, returns `INSUFFICIENT_EVIDENCE` and emits an explicit abstention message advising direct physician consultation.

---

## 5. LangGraph Multi-Agent Workflows

A compiled `StateGraph` supervisor workflow dynamically analyzes patient intent and dispatches queries to six specialized clinical sub-agents:

| Agent | Responsibilities | Safety Behavior |
|---|---|---|
| **Healthcare Knowledge Agent** | Synthesizes guideline-backed medical education via Hybrid RAG + GraphRAG | Attaches JEV citations; abstains if evidence is insufficient |
| **Symptom Assessment Agent** | Triage assessment and clinical specialty matching | Scans for acute red-flag clusters (FAST stroke, ACS); triggers immediate 911/108 alert |
| **Medication Info Agent** | Drug monographs, indications, dosing, black box warnings | Detects adverse drug-drug interactions (e.g. NSAID + Anticoagulant) |
| **Appointment Agent** | Recommends specialists and consultation modes (Video/In-Person) | **Deterministic Confirmation Rule**: Emits `ConfirmationAction`; requires explicit patient confirmation before booking |
| **Document Extraction Agent** | Optical/text extraction of discrete lab biomarkers | Formats structured tables with standard reference ranges |
| **Summarization Agent** | Longitudinal health summaries from EHR context | Compiles vitals, active regimens, and upcoming consultations |

---

## 6. Advanced AI Tools & Healthcare Safety Guardrails

- **Medical Report OCR**: `extract_structured_findings()` parses laboratory panels (Hemoglobin, Fasting Blood Glucose, HbA1c, WBC, Platelets, Creatinine, Blood Pressure) with reference ranges and abnormal flags (`LOW`, `NORMAL`, `HIGH`, `CRITICAL`).
- **Speech-to-Text (STT)**: Transcribes voice symptom dictations and extracts canonical clinical symptom terms.
- **Emergency Red Flag Escalator**: Identifies life-threatening emergencies (crushing chest pain, FAST stroke criteria, severe respiratory compromise, anaphylaxis) and returns immediate emergency escalation instructions.
- **PII/PHI Privacy Scrubber**: Redacts SSNs, phone numbers, email addresses, MRNs, dates of birth, and credit cards from logs and payloads.
- **Prompt Injection Defense**: Defends against system prompt leaks, developer mode escapes, role-reversal attacks, and delimiter manipulation.

---

## 7. Node.js Express Integration

The existing Node.js backend connects to the Python AI service through authenticated internal APIs:
- Internal header authentication: `X-AI-Service-Key: healthsync_ai_internal_secret_key_2026`.
- Patient routes in `backend/src/routes/ai.routes.js` protected by existing JWT authentication:
  - `POST /api/ai/ask`
  - `POST /api/ai/symptom-triage`
  - `POST /api/ai/medication-check`
  - `POST /api/ai/appointment-assist`
  - `POST /api/ai/extract-report`
  - `POST /api/ai/speech-to-text`
  - `GET /api/ai/guidelines`
  - `GET /api/ai/health`
- Service client implemented in `backend/src/services/ai.service.js`.

---

## 8. Test Suite Verification

The microservice includes a comprehensive 24-test suite covering every module:

```bash
cd ai-service
python -m pytest tests/ -v
```

### Test Coverage Results

```
tests/test_agents.py::test_supervisor_router_intent_dispatch PASSED
tests/test_agents.py::test_appointment_agent_requires_patient_confirmation PASSED
tests/test_agents.py::test_symptom_agent_critical_emergency_escalation PASSED
tests/test_evidence.py::test_source_authority_and_freshness PASSED
tests/test_evidence.py::test_conflict_detection PASSED
tests/test_evidence.py::test_evidence_evaluator_abstention_on_empty_evidence PASSED
tests/test_evidence.py::test_evidence_evaluator_sufficient_evidence PASSED
tests/test_graph_rag.py::test_medical_graph_client_operations PASSED
tests/test_graph_rag.py::test_clinical_entity_extraction PASSED
tests/test_graph_rag.py::test_graph_rag_contextualization_and_red_flags PASSED
tests/test_okf.py::test_load_okf_guidelines_from_disk PASSED
tests/test_okf.py::test_okf_validator_approved_document PASSED
tests/test_okf.py::test_okf_quarantine_unreviewed_document PASSED
tests/test_okf.py::test_okf_repository_sync PASSED
tests/test_rag.py::test_sliding_window_chunker PASSED
tests/test_rag.py::test_clinical_embedding_engine PASSED
tests/test_rag.py::test_vector_store_isolation_and_retrieval PASSED
tests/test_rag.py::test_end_to_end_ingest_and_hybrid_retrieve PASSED
tests/test_safety.py::test_prompt_injection_defense PASSED
tests/test_safety.py::test_pii_phi_scrubber PASSED
tests/test_safety.py::test_clinical_non_diagnostic_guardrail PASSED
tests/test_safety.py::test_ocr_structured_biomarker_extraction PASSED
tests/test_safety.py::test_speech_to_text_symptom_extraction PASSED
tests/test_safety.py::test_emergency_red_flag_detection PASSED

======================= 24 passed in 10.67s =======================
```

---

## 9. Running Locally & Docker Deployment

### Local Standalone Execution

```bash
# 1. Activate Python virtual environment and navigate to ai-service
cd ai-service

# 2. Run the FastAPI microservice
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The interactive Swagger API documentation will be available at:
`http://localhost:8000/docs`

### Full Docker Compose Deployment

```bash
# In repository root
docker-compose up --build
```

Services started:
- `postgres-vector`: PostgreSQL 16 with pgvector extension on port 5432.
- `neo4j`: Neo4j Community 5.20 with APOC on ports 7474 & 7687.
- `ai-service`: FastAPI Clinical AI microservice on port 8000.
- `backend`: Node.js Express backend on port 5000.
