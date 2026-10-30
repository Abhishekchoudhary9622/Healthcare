import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Service Information
    APP_NAME: str = "HealthSync Clinical AI Microservice"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    PORT: int = 8000
    HOST: str = "0.0.0.0"

    # Authentication & Internal Security
    AI_SERVICE_API_KEY: str = "healthsync_ai_internal_secret_key_2026"
    JWT_SECRET: str = "healthsync_jwt_secret_dev_key"
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5000"
    ]

    # Database & Vector Storage (PostgreSQL + pgvector)
    DATABASE_URL: Optional[str] = os.getenv(
        "DATABASE_URL", 
        "postgresql://healthsync:healthsync_secure_pass@localhost:5432/healthsync_ai"
    )
    USE_PGVECTOR: bool = True
    VECTOR_DIMENSION: int = 384  # Matches clinical embeddings size

    # Neo4j Graph Database Configuration
    NEO4J_URI: str = os.getenv("NEO4J_URI", "bolt://localhost:7687")
    NEO4J_USERNAME: str = os.getenv("NEO4J_USERNAME", "neo4j")
    NEO4J_PASSWORD: str = os.getenv("NEO4J_PASSWORD", "healthsync_graph_pass")
    NEO4J_DATABASE: str = "neo4j"

    # OKF Knowledge Repository Path
    OKF_REPOSITORY_PATH: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "knowledge", "okf")

    # Optional Cloud LLM / Embedding Keys (Gracefully falls back to local clinical engine)
    OPENAI_API_KEY: Optional[str] = os.getenv("OPENAI_API_KEY", None)
    GEMINI_API_KEY: Optional[str] = os.getenv("GEMINI_API_KEY", None)

    # Clinical Safety Thresholds
    EVIDENCE_CONFIDENCE_THRESHOLD: float = 0.60
    FAITHFULNESS_THRESHOLD: float = 0.70
    EMERGENCY_ESCALATION_ENABLED: bool = True

    @property
    def ai_service_port(self) -> int:
        return self.PORT

    @property
    def ai_service_host(self) -> str:
        return self.HOST

    @property
    def environment(self) -> str:
        return self.ENVIRONMENT

    @property
    def cors_origins(self) -> str:
        return ",".join(self.ALLOWED_ORIGINS)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

def get_settings() -> Settings:
    return settings

