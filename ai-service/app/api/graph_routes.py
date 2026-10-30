"""
GraphRAG API Endpoints
Neo4j knowledge graph queries, k-hop subgraphs, and entity-relationship traversal.
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from app.dependencies import verify_service_auth
from app.schemas.graph import KnowledgeGraphQuery, SubgraphResult
from app.graph.client import get_graph_client
from app.graph.graph_rag import get_graph_rag_engine

router = APIRouter(prefix="/api/graph", tags=["GraphRAG"])

@router.post("/query")
async def api_graph_query(
    request: KnowledgeGraphQuery,
    auth: Dict[str, Any] = Depends(verify_service_auth)
):
    """
    Executes a structured entity relationship traversal across clinical nodes
    (Conditions, Symptoms, Medications, Specializations, RedFlags).
    """
    engine = get_graph_rag_engine()
    results = engine.contextualize_query(request.query)
    return results

@router.post("/subgraph", response_model=SubgraphResult)
async def api_get_subgraph(
    payload: Dict[str, Any],
    auth: Dict[str, Any] = Depends(verify_service_auth)
):
    """
    Retrieves the k-hop ego network for specified seed entity IDs.
    """
    entity_ids = payload.get("entity_ids", [])
    max_hops = payload.get("max_hops", 2)

    client = get_graph_client()
    subgraph = client.get_k_hop_subgraph(entity_ids, max_hops=max_hops)
    return subgraph

@router.get("/status")
async def api_graph_status(
    auth: Dict[str, Any] = Depends(verify_service_auth)
):
    """Returns knowledge graph topology stats and backend driver mode."""
    client = get_graph_client()
    return client.get_graph_stats()
