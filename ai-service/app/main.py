"""
HealthSync AI Microservice Entrypoint
FastAPI application providing RAG, GraphRAG, OKF Knowledge Management,
JEV Evidence Evaluation, and LangGraph Multi-Agent Workflows.
"""
import time
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.api.rag_routes import router as rag_router
from app.api.okf_routes import router as okf_router
from app.api.graph_routes import router as graph_router
from app.api.evidence_routes import router as evidence_router
from app.api.agent_routes import router as agent_router
from app.api.tool_routes import router as tool_router
from app.okf.repository import get_okf_repository
from app.graph.client import get_graph_client
from app.rag.vector_store import get_vector_store

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("healthsync-ai")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Service startup and shutdown lifecycle management:
    - Automatically loads structured OKF medical guidelines
    - Pre-syncs approved documents to RAG and Knowledge Graph
    """
    logger.info("Initializing HealthSync AI Microservice...")
    settings = get_settings()
    logger.info(f"Loaded configuration for environment: {settings.environment}")

    try:
        repo = get_okf_repository()
        loaded = repo.load_repository()
        logger.info(f"Loaded {len(loaded)} OKF clinical knowledge documents.")

        # Sync approved documents into vector and graph indices
        sync_stats = repo.sync_to_rag_and_graph()
        logger.info(f"OKF knowledge sync completed: {sync_stats}")
    except Exception as e:
        logger.warning(f"Initial knowledge sync notice (continuing in resilient mode): {str(e)}")

    yield

    logger.info("HealthSync AI Microservice shutting down...")

settings = get_settings()

app = FastAPI(
    title="HealthSync Clinical AI Microservice",
    description=(
        "Advanced healthcare AI knowledge and clinical decision assistance platform. "
        "Provides RAG, GraphRAG with Neo4j, OKF structured knowledge management, "
        "JEV-style evidence evaluation, and LangGraph multi-agent workflows."
    ),
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(",") if hasattr(settings, "cors_origins") else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request Timing & Audit Middleware
@app.middleware("http")
async def audit_and_timing_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = (time.time() - start_time) * 1000
    response.headers["X-Process-Time-Ms"] = f"{process_time:.2f}"
    return response

# Global Exception Handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error processing {request.method} {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal AI Service Error",
            "message": str(exc),
            "path": request.url.path
        }
    )

# Service Healthcheck
@app.get("/health", tags=["Health"])
async def health_check():
    """Returns microservice readiness, vector store mode, and knowledge graph status."""
    vstore = get_vector_store()
    gclient = get_graph_client()
    repo = get_okf_repository()

    return {
        "status": "healthy",
        "service": "healthsync-ai",
        "version": "2.0.0",
        "vector_store_mode": "postgresql_pgvector" if vstore.conn else "in_memory_resilient",
        "graph_backend": "neo4j" if gclient.driver else "networkx_resilient",
        "okf_documents_loaded": len(repo.get_all_documents(include_quarantined=True)),
        "okf_approved_documents": len(repo.get_all_documents(include_quarantined=False))
    }

# Register Routers
app.include_router(agent_router)
app.include_router(rag_router)
app.include_router(okf_router)
app.include_router(graph_router)
app.include_router(evidence_router)
app.include_router(tool_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.ai_service_host, port=settings.ai_service_port, reload=True)
