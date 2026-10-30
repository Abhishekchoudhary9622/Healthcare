"""
OKF Knowledge Repository
Loads, validates, indexes, and synchronizes structured OKF medical guidelines
into RAG vector store and GraphRAG Neo4j knowledge network.
"""
import os
import asyncio
from typing import List, Optional, Dict, Any
from app.config import settings
from app.schemas.okf import OKFDocument
from app.okf.loader import load_all_okf_documents
from app.schemas.rag import DocumentIngestRequest
from app.rag.ingestion import ingest_document, ingest_document_sync
from app.graph.client import get_graph_client
from app.schemas.graph import Entity, Relationship

class OKFRepository:
    """
    Central repository for clinically validated OKF structured knowledge.
    Synchronizes approved knowledge into RAG vector store and GraphRAG entities.
    """

    def __init__(self, repo_path: Optional[str] = None):
        self.repo_path = repo_path or settings.OKF_REPOSITORY_PATH
        self.documents: Dict[str, OKFDocument] = {}

    def load_repository(self) -> List[OKFDocument]:
        """Loads and indexes all OKF documents from disk."""
        docs = load_all_okf_documents(self.repo_path)
        self.documents.clear()
        for d in docs:
            self.documents[d.id] = d
        return list(self.documents.values())

    def get_document(self, doc_id: str) -> Optional[OKFDocument]:
        return self.documents.get(doc_id)

    def get_document_by_id(self, doc_id: str) -> Optional[OKFDocument]:
        return self.documents.get(doc_id)

    def get_all_documents(self, include_quarantined: bool = False) -> List[OKFDocument]:
        if not self.documents:
            self.load_repository()
        if include_quarantined:
            return list(self.documents.values())
        return [d for d in self.documents.values() if d.provenance.is_clinically_approved]

    def list_documents(self, domain: Optional[str] = None, approved_only: bool = True) -> List[OKFDocument]:
        results = self.get_all_documents(include_quarantined=not approved_only)
        if domain:
            results = [d for d in results if d.clinical_domain.lower() == domain.lower()]
        return results

    def sync_to_rag_and_graph(self) -> Dict[str, Any]:
        """
        Synchronously transforms approved OKF sections into RAG documents and
        registers entities/relationships in the GraphRAG knowledge client.
        """
        if not self.documents:
            self.load_repository()

        rag_count = 0
        graph_entities_count = 0
        graph_client = get_graph_client()

        for doc in self.documents.values():
            if not doc.provenance.is_clinically_approved:
                # Never index unapproved or unreviewed guidelines
                continue

            full_markdown = f"# {doc.title}\n\nClinical Domain: {doc.clinical_domain}\nVersion: {doc.version}\n\n"
            for sec in doc.sections:
                full_markdown += f"## {sec.heading}\n{sec.content}\n"
                if sec.key_findings:
                    full_markdown += "- Key Findings: " + "; ".join(sec.key_findings) + "\n"
                if sec.contraindications:
                    full_markdown += "- Contraindications: " + "; ".join(sec.contraindications) + "\n"
                if sec.red_flags:
                    full_markdown += "- Red Flags: " + "; ".join(sec.red_flags) + "\n"
                full_markdown += "\n"

            req = DocumentIngestRequest(
                doc_id=doc.id,
                title=doc.title,
                content=full_markdown,
                file_type="markdown",
                source_url=doc.provenance.url,
                publication_date=doc.provenance.publication_date,
                is_clinically_approved=doc.provenance.is_clinically_approved,
                reviewed_by=doc.provenance.reviewed_by,
                evidence_level=doc.provenance.evidence_level,
                version=doc.version
            )
            # ingest_document_sync is synchronous
            res = ingest_document_sync(req)
            if res.success:
                rag_count += 1


            # Sync entities and relationships to GraphRAG
            for ent in doc.entities:
                e_id = ent.get("id") or ent.get("name")
                e_type = ent.get("type", "ClinicalConcept")
                e_name = ent.get("name", e_id)
                if e_id and e_name:
                    graph_client.add_entity(Entity(id=e_id, name=e_name, type=e_type))
                    graph_entities_count += 1

            for rel in doc.relationships:
                s = rel.get("source")
                t = rel.get("target")
                r_type = rel.get("type", "RELATED_TO")
                if s and t:
                    graph_client.add_relationship(Relationship(source=s, target=t, type=r_type))

        return {
            "success": True,
            "rag_documents_indexed": rag_count,
            "graph_entities_added": graph_entities_count,
            "approved_okf_total": len([d for d in self.documents.values() if d.provenance.is_clinically_approved])
        }

    async def sync_to_rag(self) -> int:
        stats = self.sync_to_rag_and_graph()
        return stats["rag_documents_indexed"]

# Global singleton
okf_repository = OKFRepository()

def get_okf_repository() -> OKFRepository:
    return okf_repository
