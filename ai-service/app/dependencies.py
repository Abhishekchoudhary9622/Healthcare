from fastapi import Header, HTTPException, status, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional
from app.config import settings

security = HTTPBearer(auto_error=False)

def verify_internal_service_key(
    x_ai_service_key: Optional[str] = Header(None, alias="X-AI-Service-Key"),
    auth: Optional[HTTPAuthorizationCredentials] = Security(security)
) -> bool:
    """
    Validates that request originates from authenticated backend (Node.js Express),
    protecting AI microservice from unauthorized public access.
    """
    # 1. Match header key
    if x_ai_service_key and x_ai_service_key == settings.AI_SERVICE_API_KEY:
        return True

    # 2. Support Bearer token matching key or internal JWT
    if auth and auth.credentials:
        if auth.credentials == settings.AI_SERVICE_API_KEY:
            return True

    # In local development with DEBUG=True, allow fallback if no key provided but log warning
    if settings.DEBUG and not x_ai_service_key and not auth:
        return True

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unauthorized AI Service Request: Invalid or missing X-AI-Service-Key",
        headers={"WWW-Authenticate": "ApiKey"},
    )

verify_service_auth = verify_internal_service_key

