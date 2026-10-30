# HealthSync Clinical AI Microservice Dockerfile
FROM python:3.11-slim

# Set working environment
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Install system dependencies (build-essential, curl for healthchecks)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source and knowledge guidelines
COPY app/ app/
COPY knowledge/ knowledge/
COPY tests/ tests/

# Create persistent data directory
RUN mkdir -p /app/data

# Expose microservice port
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start Uvicorn ASGI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
