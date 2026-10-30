"""
Dual-Mode Clinical Vector Store
Supports PostgreSQL with pgvector for production deployments, and provides
an in-memory JSONL-persisted index for instant zero-dependency execution.
"""
import os
import re
import json
import numpy as np
from typing import List, Dict, Any, Optional
from app.config import settings
from app.schemas.rag import DocumentChunk
from app.schemas.common import SourceMetadata

class VectorStore:
    """
    Dual-mode vector store supporting PostgreSQL + pgvector when available,
    with an in-memory/persisted JSONL index fallback for seamless zero-setup execution.
    """

    def __init__(self, persistence_file: str = "ai-service/data/vector_store.jsonl"):
        self.persistence_file = persistence_file
        self.chunks: List[Dict[str, Any]] = []
        self._pg_conn = None
        self._is_pg_available = False

        # Ensure storage directory exists
        try:
            os.makedirs(os.path.dirname(self.persistence_file), exist_ok=True)
        except Exception:
            pass

        self._load_local_store()
        self._init_postgres()

    @property
    def conn(self):
        return self._pg_conn if self._is_pg_available else None

    def _init_postgres(self):
        """Attempts connection to PostgreSQL + pgvector if configured."""
        if not settings.DATABASE_URL or not settings.USE_PGVECTOR:
            return
        try:
            import psycopg2
            self._pg_conn = psycopg2.connect(settings.DATABASE_URL, connect_timeout=1)
            with self._pg_conn.cursor() as cur:
                cur.execute("CREATE EXTENSION IF NOT EXISTS vector;")
                cur.execute(f"""
                    CREATE TABLE IF NOT EXISTS medical_knowledge_chunks (
                        chunk_id VARCHAR(100) PRIMARY KEY,
                        doc_id VARCHAR(100) NOT NULL,
                        title TEXT NOT NULL,
                        section VARCHAR(255) NOT NULL,
                        content TEXT NOT NULL,
                        is_clinically_approved BOOLEAN DEFAULT TRUE,
                        publication_date VARCHAR(50),
                        source_url TEXT,
                        patient_id VARCHAR(100),
                        version VARCHAR(50) DEFAULT '1.0',
                        embedding vector({settings.VECTOR_DIMENSION}),
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    );
                """)
            self._pg_conn.commit()
            self._is_pg_available = True
        except Exception:
            self._is_pg_available = False

    def _load_local_store(self):
        """Loads chunks from local persistence file if present."""
        if os.path.exists(self.persistence_file):
            try:
                with open(self.persistence_file, "r", encoding="utf-8") as f:
                    for line in f:
                        if line.strip():
                            self.chunks.append(json.loads(line))
            except Exception:
                pass

    def _save_chunk_locally(self, chunk_record: Dict[str, Any]):
        """Appends chunk to local JSONL index."""
        try:
            with open(self.persistence_file, "a", encoding="utf-8") as f:
                f.write(json.dumps(chunk_record) + "\n")
        except Exception:
            pass

    def add_chunks_sync(self, chunk_records: List[Dict[str, Any]]) -> int:
        added_count = 0
        for record in chunk_records:
            cid = record["chunk_id"]
            # Deduplicate locally
            self.chunks = [c for c in self.chunks if c["chunk_id"] != cid]
            self.chunks.append(record)
            self._save_chunk_locally(record)
            added_count += 1

            # Sync to PostgreSQL if connected
            if self._is_pg_available and self._pg_conn:
                try:
                    with self._pg_conn.cursor() as cur:
                        emb_str = "[" + ",".join(map(str, record["embedding"])) + "]"
                        cur.execute("""
                            INSERT INTO medical_knowledge_chunks
                            (chunk_id, doc_id, title, section, content, is_clinically_approved, publication_date, source_url, patient_id, version, embedding)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (chunk_id) DO UPDATE SET
                            content = EXCLUDED.content,
                            embedding = EXCLUDED.embedding,
                            is_clinically_approved = EXCLUDED.is_clinically_approved;
                        """, (
                            record["chunk_id"],
                            record["doc_id"],
                            record["title"],
                            record["section"],
                            record["content"],
                            record.get("is_clinically_approved", True),
                            record.get("publication_date"),
                            record.get("source_url"),
                            record.get("patient_id"),
                            record.get("version", "1.0"),
                            emb_str
                        ))
                    self._pg_conn.commit()
                except Exception:
                    pass

        return added_count

    async def add_chunks(self, chunk_records: List[Dict[str, Any]]) -> int:
        return self.add_chunks_sync(chunk_records)

    def dense_search_sync(
        self,
        query_vector: List[float],
        top_k: int = 5,
        patient_id: Optional[str] = None,
        require_clinically_approved: bool = True
    ) -> List[DocumentChunk]:
        if not self.chunks:
            return []

        q_vec = np.array(query_vector, dtype=np.float32)
        candidates = []

        for item in self.chunks:
            # 1. Isolation check: Patient private data vs Shared knowledge
            item_patient_id = item.get("patient_id")
            if item_patient_id and item_patient_id != patient_id:
                continue

            # 2. Clinical approval filter
            if require_clinically_approved and not item.get("is_clinically_approved", True):
                continue

            emb = np.array(item["embedding"], dtype=np.float32)
            # Dot product (since embeddings are unit normalized)
            sim = float(np.dot(q_vec, emb))
            candidates.append((sim, item))

        candidates.sort(key=lambda x: x[0], reverse=True)
        top_items = candidates[:top_k]

        results = []
        for sim, c in top_items:
            results.append(DocumentChunk(
                chunk_id=c["chunk_id"],
                doc_id=c["doc_id"],
                title=c["title"],
                section=c.get("section", "General"),
                content=c["content"],
                score=round(sim, 4),
                retrieval_method="dense",
                metadata=SourceMetadata(
                    source_id=c["doc_id"],
                    title=c["title"],
                    url=c.get("source_url"),
                    publication_date=c.get("publication_date"),
                    version=c.get("version", "1.0"),
                    is_clinically_approved=c.get("is_clinically_approved", True),
                    reviewed_by=c.get("reviewed_by"),
                    evidence_level=c.get("evidence_level")
                )
            ))

        return results

    async def dense_search(
        self,
        query_vector: List[float],
        top_k: int = 5,
        patient_id: Optional[str] = None,
        require_clinically_approved: bool = True
    ) -> List[DocumentChunk]:
        return self.dense_search_sync(
            query_vector=query_vector,
            top_k=top_k,
            patient_id=patient_id,
            require_clinically_approved=require_clinically_approved
        )

    def lexical_search_sync(
        self,
        query_text: str,
        top_k: int = 5,
        patient_id: Optional[str] = None,
        require_clinically_approved: bool = True
    ) -> List[DocumentChunk]:
        if not self.chunks:
            return []

        terms = set(re_words(query_text.lower()))
        if not terms:
            return []

        scored = []
        for item in self.chunks:
            item_patient_id = item.get("patient_id")
            if item_patient_id and item_patient_id != patient_id:
                continue

            if require_clinically_approved and not item.get("is_clinically_approved", True):
                continue

            content_lower = item["content"].lower()
            title_lower = item["title"].lower()
            section_lower = item.get("section", "").lower()

            matches = 0
            for term in terms:
                if term in title_lower:
                    matches += 3
                if term in section_lower:
                    matches += 2
                matches += content_lower.count(term)

            if matches > 0:
                score = matches / (len(item["content"].split()) + 10)
                scored.append((score, item))

        scored.sort(key=lambda x: x[0], reverse=True)
        top_items = scored[:top_k]

        results = []
        for score, c in top_items:
            results.append(DocumentChunk(
                chunk_id=c["chunk_id"],
                doc_id=c["doc_id"],
                title=c["title"],
                section=c.get("section", "General"),
                content=c["content"],
                score=round(score, 4),
                retrieval_method="lexical",
                metadata=SourceMetadata(
                    source_id=c["doc_id"],
                    title=c["title"],
                    url=c.get("source_url"),
                    publication_date=c.get("publication_date"),
                    version=c.get("version", "1.0"),
                    is_clinically_approved=c.get("is_clinically_approved", True),
                    reviewed_by=c.get("reviewed_by"),
                    evidence_level=c.get("evidence_level")
                )
            ))

        return results

    async def lexical_search(
        self,
        query_text: str,
        top_k: int = 5,
        patient_id: Optional[str] = None,
        require_clinically_approved: bool = True
    ) -> List[DocumentChunk]:
        return self.lexical_search_sync(
            query_text=query_text,
            top_k=top_k,
            patient_id=patient_id,
            require_clinically_approved=require_clinically_approved
        )

def re_words(text: str) -> List[str]:
    return re.findall(r'\b[a-zA-Z0-9_\-]{2,}\b', text)

# Global singleton
vector_store = VectorStore()

def get_vector_store() -> VectorStore:
    return vector_store
