from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from app.schemas.common import SourceMetadata

class DocumentChunk(BaseModel):
    chunk_id: str
    doc_id: str
    title: str
    section: str
    content: str
    metadata: SourceMetadata
    score: Optional[float] = None
    retrieval_method: Optional[str] = None  # "dense", "lexical", "hybrid_rrf", "graph"

class DocumentIngestRequest(BaseModel):
    doc_id: str
    title: str
    content: str
    file_type: str = Field("markdown", description="'pdf', 'docx', or 'markdown'")
    source_url: Optional[str] = None
    publication_date: Optional[str] = None
    is_clinically_approved: bool = True
    reviewed_by: Optional[str] = None
    evidence_level: Optional[str] = "Level B"
    version: str = "1.0"
    patient_id: Optional[str] = Field(None, description="Set only if this is private EHR data; empty if shared knowledge")

class IngestResponse(BaseModel):
    success: bool
    doc_id: str
    title: str
    chunks_created: int
    is_clinically_approved: bool
    message: str

class RAGQueryRequest(BaseModel):
    query: str
    top_k: int = 5
    patient_id: Optional[str] = Field(None, description="Optional patient ID to isolate private EHR access")
    require_clinically_approved: bool = True
    use_hybrid: bool = True
    use_graph_expansion: bool = True

class PassageReference(BaseModel):
    citation_id: str
    title: str
    section: str
    url: Optional[str] = None
    excerpt: str
    confidence_score: float
    is_approved: bool

class RAGQueryResponse(BaseModel):
    query: str
    answer: str
    passages: List[DocumentChunk]
    citations: List[PassageReference]
    evidence_status: str  # "SUFFICIENT", "INSUFFICIENT_EVIDENCE", "CONFLICTING_EVIDENCE"
    disclaimer: str
