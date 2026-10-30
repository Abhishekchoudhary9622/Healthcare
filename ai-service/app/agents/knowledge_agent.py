"""
Healthcare Knowledge Assistance Agent
Synthesizes verified clinical answers using Hybrid RAG and GraphRAG.
Applies JEV evidence validation, passage citations, and abstention policies.
"""
from typing import Dict, Any, List
from app.agents.state import HealthSyncAgentState
from app.rag.hybrid_retriever import hybrid_retrieve_sync
from app.graph.graph_rag import get_graph_rag_engine
from app.evidence.evaluator import get_evidence_evaluator
from app.schemas.rag import PassageReference

def run_knowledge_agent(state: HealthSyncAgentState) -> HealthSyncAgentState:
    """
    Healthcare Knowledge Assistance Agent:
    Leverages Hybrid RAG and GraphRAG to synthesize clinically grounded answers
    with strict JEV evidence citations.
    """
    query = state.get("query", "")
    patient_id = state.get("patient_id") or state.get("user_id")

    # 1. Hybrid Retrieval (Dense Vector + BM25 RRF)
    retrieved_chunks = hybrid_retrieve_sync(
        query=query,
        top_k=4,
        patient_id=patient_id,
        require_clinically_approved=True
    )

    # 2. GraphRAG Contextualization
    graph_rag_engine = get_graph_rag_engine()
    graph_data = graph_rag_engine.contextualize_query(query, retrieved_chunks)

    # 3. Formulate Draft Answer
    if retrieved_chunks:
        primary_chunk = retrieved_chunks[0]
        answer_parts = [
            f"Based on clinical guideline **{primary_chunk.title}** ({primary_chunk.section}):\n",
            primary_chunk.content,
        ]

        if len(retrieved_chunks) > 1:
            sec_chunk = retrieved_chunks[1]
            answer_parts.append(f"\nAdditionally, according to **{sec_chunk.title}**:")
            answer_parts.append(sec_chunk.content[:250] + "...")

        if graph_data.get("graph_context"):
            answer_parts.append(f"\n{graph_data['graph_context']}")

        draft_response = "\n".join(answer_parts)
    else:
        draft_response = (
            "No directly verified medical guideline was found in our approved knowledge repository. "
            "Please consult a licensed physician for individualized guidance."
        )

    # 4. JEV Evidence Evaluation
    evidence_evaluator = get_evidence_evaluator()
    evaluation = evidence_evaluator.evaluate(
        query=query,
        draft_response=draft_response,
        retrieved_chunks=retrieved_chunks
    )

    # 5. Handle Abstention or Approval
    if evaluation.recommended_action == "ABSTAIN":
        final_answer = evaluation.abstain_message or draft_response
        status = "INSUFFICIENT_EVIDENCE"
    else:
        final_answer = draft_response
        status = evaluation.evidence_status

    # 6. Build Citations
    citations: List[PassageReference] = []
    for idx, c in enumerate(retrieved_chunks, start=1):
        citations.append(PassageReference(
            citation_id=f"[{idx}]",
            title=c.title,
            section=c.section,
            url=c.metadata.url if c.metadata else None,
            excerpt=c.content[:150] + "...",
            confidence_score=c.score or 0.85,
            is_approved=c.metadata.is_clinically_approved if c.metadata else True
        ))

    state["current_agent"] = "knowledge_agent"
    state["retrieved_evidence"] = retrieved_chunks
    state["graph_context"] = graph_data.get("graph_context", "")
    state["response_text"] = final_answer
    state["final_response"] = final_answer
    state["evidence_status"] = status
    state["citations"] = citations
    state["evaluation"] = evaluation
    state["urgency"] = "ROUTINE"
    state["clinical_urgency"] = "ROUTINE"
    state["requires_confirmation"] = False
    state["disclaimer"] = (
        "HealthSync AI provides clinical information for reference purposes. "
        "It does not constitute formal medical diagnosis or prescription."
    )
    return state
