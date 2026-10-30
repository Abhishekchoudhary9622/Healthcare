"""
HealthSync AI Microservice API Routers
"""
from app.api.rag_routes import router as rag_router
from app.api.okf_routes import router as okf_router
from app.api.graph_routes import router as graph_router
from app.api.evidence_routes import router as evidence_router
from app.api.agent_routes import router as agent_router
from app.api.tool_routes import router as tool_router

__all__ = [
    "rag_router",
    "okf_router",
    "graph_router",
    "evidence_router",
    "agent_router",
    "tool_router"
]
