"""
GraphRAG Hybrid Contextualization Engine
Combines graph-based knowledge traversal with dense/lexical vector retrieval.
Enriches unstructured chunks with clinical relationship paths and red flag alerts.
"""
from typing import List, Dict, Any, Optional
from app.schemas.rag import DocumentChunk
from app.schemas.graph import SubgraphResult
from app.graph.client import get_graph_client
from app.graph.extractor import extract_clinical_entities_from_text

class GraphRAGEngine:
    """
    Combines graph-based knowledge traversal with dense/lexical vector retrieval.
    Enriches unstructured chunks with clinical relationship paths and red flag alerts.
    """

    def contextualize_query(
        self,
        query: str,
        retrieved_chunks: Optional[List[DocumentChunk]] = None
    ) -> Dict[str, Any]:
        """
        Extracts entities from the query, traverses the clinical graph,
        and constructs an augmented knowledge context with relationship paths.
        """
        graph_client = get_graph_client()

        # 1. Extract entities from user query
        entities = extract_clinical_entities_from_text(query)

        # 2. Also extract entities from top retrieved chunk titles/sections
        if retrieved_chunks:
            for chunk in retrieved_chunks[:2]:
                chunk_entities = extract_clinical_entities_from_text(chunk.title + " " + chunk.content[:200])
                for ce in chunk_entities:
                    if not any(e.id == ce.id for e in entities):
                        entities.append(ce)

        entity_ids = [e.id for e in entities]

        # 3. Graph traversal: Fetch 1-hop and 2-hop connected clinical concepts
        subgraph = graph_client.get_subgraph_for_entities(entity_ids, max_hops=2)

        # 4. Check for Emergency Red Flags in graph paths
        has_emergency_path = False
        emergency_details = []
        for path in subgraph.matched_paths:
            if any(term in path for term in ["ESCALATES_TO_EMERGENCY", "CONTRAINDICATED_IN", "CRITICAL"]):
                has_emergency_path = True
                emergency_details.append(path)

        # 5. Format graph context text
        graph_context_lines = []
        if subgraph.matched_paths:
            graph_context_lines.append("### Clinical Knowledge Graph Relations:")
            for p in subgraph.matched_paths[:8]:
                graph_context_lines.append(f"- {p}")

        return {
            "entities_found": [e.name for e in entities],
            "subgraph": subgraph,
            "graph_context": "\n".join(graph_context_lines),
            "is_emergency_flagged": has_emergency_path,
            "emergency_details": emergency_details
        }

graph_rag_engine = GraphRAGEngine()

def get_graph_rag_engine() -> GraphRAGEngine:
    return graph_rag_engine
