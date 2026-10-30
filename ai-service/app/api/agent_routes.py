"""
LangGraph Multi-Agent API Endpoints
Runs the supervisor workflow routing to Healthcare Knowledge, Symptom Assessment,
Medication Information, Appointment Assistance, Document Extraction, and Summarization agents.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from app.dependencies import verify_service_auth
from app.schemas.agents import SupervisorRequest, AgentResponse
from app.agents.supervisor import supervisor_app
from app.guardrails.prompt_guard import check_prompt_injection
from app.guardrails.pii_scrubber import scrub_phi
from app.guardrails.clinical_guard import validate_clinical_response, STANDARD_CLINICAL_DISCLAIMER
from app.schemas.common import ClinicalUrgency

router = APIRouter(prefix="/api/agents", tags=["LangGraph Multi-Agent Workflow"])

@router.post("/run", response_model=AgentResponse)
async def api_run_supervisor(
    request: SupervisorRequest,
    auth: Dict[str, Any] = Depends(verify_service_auth)
):
    """
    Primary multi-agent entrypoint. LangGraph supervisor dynamically routes
    the query to the optimal clinical specialist agent.
    """
    # 1. Prompt Injection & Adversarial Filter
    is_injected, reason = check_prompt_injection(request.query)
    if is_injected:
        disclaimer_str = STANDARD_CLINICAL_DISCLAIMER.notice if hasattr(STANDARD_CLINICAL_DISCLAIMER, "notice") else str(STANDARD_CLINICAL_DISCLAIMER)
        return AgentResponse(
            agent_used="supervisor_guard",
            query=request.query,
            answer="HealthSync Security Alert: The submitted query violates safe input policies.",
            clinical_urgency="ROUTINE",
            red_flag_alert=False,
            evidence_status="INSUFFICIENT_EVIDENCE",
            disclaimer=disclaimer_str
        )

    # 2. Scrub PHI/PII from input query before state execution
    clean_query, redacted_count = scrub_phi(request.query)

    # 3. Assemble Initial LangGraph State
    initial_state = {
        "user_id": request.patient_id or "anonymous_patient",
        "query": clean_query,
        "context": request.patient_context or {},
        "current_agent": request.target_agent,
        "retrieved_passages": [],
        "graph_entities": [],
        "evidence_eval": {},
        "response_text": "",
        "urgency": ClinicalUrgency.ROUTINE.value,
        "requires_confirmation": False,
        "confirmation_action": None,
        "safety_flags": [],
        "citations": []
    }

    try:
        # 4. Invoke LangGraph Workflow
        result_state = supervisor_app.invoke(initial_state)

        # 5. Clinical Safety & Non-Diagnostic Posture Validation
        clinical_check = validate_clinical_response(
            response_text=result_state.get("response_text", ""),
            sources=result_state.get("citations", [])
        )

        agent_used = result_state.get("current_agent") or "supervisor"
        urgency_val = str(result_state.get("urgency", "ROUTINE"))
        disclaimer_obj = clinical_check.get("disclaimer", STANDARD_CLINICAL_DISCLAIMER)
        disclaimer_str = disclaimer_obj.notice if hasattr(disclaimer_obj, "notice") else str(disclaimer_obj)

        return AgentResponse(
            agent_used=agent_used,
            query=request.query,
            answer=clinical_check["sanitized_text"],
            clinical_urgency=urgency_val,
            red_flag_alert="EMERGENCY" in urgency_val.upper(),
            evidence_status="SUFFICIENT" if "INSUFFICIENT" not in str(result_state.get("evidence_eval", "")) else "INSUFFICIENT_EVIDENCE",
            citations=result_state.get("citations", []),
            confirmation_action=result_state.get("confirmation_action"),
            disclaimer=disclaimer_str
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Agent workflow execution failed: {str(e)}"
        )

@router.post("/knowledge", response_model=AgentResponse)
async def api_run_knowledge_agent(
    request: SupervisorRequest,
    auth: Dict[str, Any] = Depends(verify_service_auth)
):
    """Direct route to Healthcare Knowledge Agent."""
    request.target_agent = "knowledge_agent"
    return await api_run_supervisor(request, auth)

@router.post("/symptom", response_model=AgentResponse)
async def api_run_symptom_agent(
    request: SupervisorRequest,
    auth: Dict[str, Any] = Depends(verify_service_auth)
):
    """Direct route to Symptom Assessment & Triage Agent."""
    request.target_agent = "symptom_agent"
    return await api_run_supervisor(request, auth)

@router.post("/medication", response_model=AgentResponse)
async def api_run_medication_agent(
    request: SupervisorRequest,
    auth: Dict[str, Any] = Depends(verify_service_auth)
):
    """Direct route to Medication Information & Drug Interaction Agent."""
    request.target_agent = "medication_agent"
    return await api_run_supervisor(request, auth)

@router.post("/appointment", response_model=AgentResponse)
async def api_run_appointment_agent(
    request: SupervisorRequest,
    auth: Dict[str, Any] = Depends(verify_service_auth)
):
    """Direct route to Appointment Assistance Agent (Deterministic confirmation required)."""
    request.target_agent = "appointment_agent"
    return await api_run_supervisor(request, auth)

@router.post("/document", response_model=AgentResponse)
async def api_run_document_agent(
    request: SupervisorRequest,
    auth: Dict[str, Any] = Depends(verify_service_auth)
):
    """Direct route to Medical Document Extraction Agent."""
    request.target_agent = "document_agent"
    return await api_run_supervisor(request, auth)

@router.post("/summarize", response_model=AgentResponse)
async def api_run_summarize_agent(
    request: SupervisorRequest,
    auth: Dict[str, Any] = Depends(verify_service_auth)
):
    """Direct route to Health Data Summarization Agent."""
    request.target_agent = "summarization_agent"
    return await api_run_supervisor(request, auth)
