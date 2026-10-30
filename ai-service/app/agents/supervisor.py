from langgraph.graph import StateGraph, END
from typing import Dict, Any
from app.agents.state import HealthSyncAgentState
from app.agents.knowledge_agent import run_knowledge_agent
from app.agents.symptom_agent import run_symptom_agent
from app.agents.medication_agent import run_medication_agent
from app.agents.appointment_agent import run_appointment_agent
from app.agents.document_agent import run_document_agent
from app.agents.summarization_agent import run_summarization_agent

def supervisor_router(state: HealthSyncAgentState) -> str:
    """
    Supervisor routing logic: Analyzes user intent, safety priority,
    and routing tags to dispatch request to the optimal clinical agent.
    """
    # 1. Target agent override
    target = state.get("current_agent")
    if target in [
        "knowledge_agent", "symptom_agent", "medication_agent",
        "appointment_agent", "document_agent", "summarization_agent"
    ]:
        return target

    query_lower = state.get("query", "").lower()

    # 2. Check for emergency / symptom assessment
    if any(k in query_lower for k in [
        "symptom", "pain", "fever", "chest", "headache", "dizzy",
        "shortness of breath", "bleeding", "rash", "ache", "swelling", "emergency"
    ]):
        return "symptom_agent"

    # 3. Check for medication / drug interactions
    if any(k in query_lower for k in [
        "medication", "pill", "tablet", "dose", "dosage", "interaction",
        "side effect", "contraindication", "ibuprofen", "amoxicillin", "antibiotic", "prescription"
    ]):
        return "medication_agent"

    # 4. Check for appointment scheduling
    if any(k in query_lower for k in [
        "appointment", "book", "schedule", "doctor", "consult", "visit", "slot"
    ]):
        return "appointment_agent"

    # 5. Check for document extraction / lab reports
    if any(k in query_lower for k in [
        "lab", "report", "blood test", "cbc", "extract", "biomarker", "hba1c"
    ]):
        return "document_agent"

    # 6. Check for health summary
    if any(k in query_lower for k in [
        "summary", "overview", "briefing", "vitals", "history", "profile status"
    ]):
        return "summarization_agent"

    # Default to Healthcare Knowledge Agent
    return "knowledge_agent"

# Build LangGraph State Machine
workflow = StateGraph(HealthSyncAgentState)

# Add Agent Nodes
workflow.add_node("knowledge_agent", run_knowledge_agent)
workflow.add_node("symptom_agent", run_symptom_agent)
workflow.add_node("medication_agent", run_medication_agent)
workflow.add_node("appointment_agent", run_appointment_agent)
workflow.add_node("document_agent", run_document_agent)
workflow.add_node("summarization_agent", run_summarization_agent)

# Set conditional entrypoint based on supervisor router
workflow.set_conditional_entry_point(
    supervisor_router,
    {
        "knowledge_agent": "knowledge_agent",
        "symptom_agent": "symptom_agent",
        "medication_agent": "medication_agent",
        "appointment_agent": "appointment_agent",
        "document_agent": "document_agent",
        "summarization_agent": "summarization_agent",
    }
)

# Each agent finishes at END
workflow.add_edge("knowledge_agent", END)
workflow.add_edge("symptom_agent", END)
workflow.add_edge("medication_agent", END)
workflow.add_edge("appointment_agent", END)
workflow.add_edge("document_agent", END)
workflow.add_edge("summarization_agent", END)

# Compile LangGraph Workflow
supervisor_app = workflow.compile()
