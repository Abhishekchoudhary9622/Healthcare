"""
Medical Knowledge Graph Client
Integrates Neo4j Graph Database with seamless NetworkX in-memory fallback.
Supports clinical ontology nodes, directed relationships, and k-hop ego-networks.
"""
import networkx as nx
from typing import List, Dict, Any, Optional
from app.config import settings
from app.schemas.graph import Entity, Relationship, SubgraphResult

class MedicalGraphClient:
    """
    Neo4j Graph Database Client with NetworkX in-memory fallback.
    Connects to live Neo4j instance when available, or seamlessly uses
    NetworkX multi-directed graph for standalone execution and testing.
    """

    def __init__(self):
        self._driver = None
        self._is_neo4j_live = False
        self._nx_graph = nx.MultiDiGraph()
        self._init_connection()

    def _init_connection(self):
        """Attempts connection to Neo4j."""
        try:
            from neo4j import GraphDatabase
            self._driver = GraphDatabase.driver(
                settings.NEO4J_URI,
                auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD)
            )
            self._driver.verify_connectivity()
            self._is_neo4j_live = True
        except Exception:
            self._is_neo4j_live = False

    @property
    def driver(self):
        return self._driver if self._is_neo4j_live else None

    def is_live(self) -> bool:
        return self._is_neo4j_live

    def get_graph_stats(self) -> Dict[str, Any]:
        return {
            "backend": "neo4j" if self._is_neo4j_live else "networkx_in_memory",
            "is_neo4j_live": self._is_neo4j_live,
            "total_nodes": self._nx_graph.number_of_nodes(),
            "total_edges": self._nx_graph.number_of_edges(),
            "uri": settings.NEO4J_URI if self._is_neo4j_live else "in_memory"
        }

    def add_entity(self, entity: Entity) -> bool:
        """Adds node to Neo4j and in-memory graph."""
        # 1. Update NetworkX graph
        self._nx_graph.add_node(
            entity.id,
            name=entity.name,
            type=entity.type,
            **entity.properties
        )

        # 2. Update Neo4j if live
        if self._is_neo4j_live and self._driver:
            try:
                with self._driver.session(database=settings.NEO4J_DATABASE) as session:
                    cypher = f"""
                    MERGE (n:{entity.type} {{id: $id}})
                    SET n.name = $name, n += $properties
                    """
                    session.run(cypher, id=entity.id, name=entity.name, properties=entity.properties)
            except Exception:
                pass
        return True

    def add_relationship(self, rel: Relationship) -> bool:
        """Adds directed edge between entities."""
        # 1. Update NetworkX graph
        self._nx_graph.add_edge(
            rel.source_id,
            rel.target_id,
            key=rel.type,
            type=rel.type,
            **rel.properties
        )

        # 2. Update Neo4j if live
        if self._is_neo4j_live and self._driver:
            try:
                with self._driver.session(database=settings.NEO4J_DATABASE) as session:
                    cypher = f"""
                    MATCH (a {{id: $source_id}}), (b {{id: $target_id}})
                    MERGE (a)-[r:{rel.type}]->(b)
                    SET r += $properties
                    """
                    session.run(cypher, source_id=rel.source_id, target_id=rel.target_id, properties=rel.properties)
            except Exception:
                pass
        return True

    def get_subgraph_for_entities(
        self,
        entity_ids: List[str],
        max_hops: int = 2
    ) -> SubgraphResult:
        """
        Retrieves k-hop ego-network around target entities to enrich RAG retrieval.
        """
        matched_nodes = set()
        matched_edges = []
        paths_text = []

        # Find starting nodes (match exact ID or substring name)
        start_nodes = set()
        for eid in entity_ids:
            if eid in self._nx_graph:
                start_nodes.add(eid)
            else:
                # Case-insensitive name match
                for n, data in self._nx_graph.nodes(data=True):
                    if data.get("name", "").lower() == str(eid).lower():
                        start_nodes.add(n)

        # Traverse k-hops
        visited = set(start_nodes)
        frontier = set(start_nodes)

        for _ in range(max_hops):
            next_frontier = set()
            for u in frontier:
                # Outgoing edges
                for _, v, key, data in self._nx_graph.out_edges(u, keys=True, data=True):
                    matched_edges.append(Relationship(
                        source_id=u,
                        target_id=v,
                        type=data.get("type", key),
                        properties={k: val for k, val in data.items() if k != "type"}
                    ))
                    src_name = self._nx_graph.nodes[u].get("name", u)
                    dst_name = self._nx_graph.nodes[v].get("name", v)
                    rel_type = data.get("type", key)
                    paths_text.append(f"({src_name}) -[:{rel_type}]-> ({dst_name})")

                    if v not in visited:
                        visited.add(v)
                        next_frontier.add(v)

                # Incoming edges
                for v, _, key, data in self._nx_graph.in_edges(u, keys=True, data=True):
                    matched_edges.append(Relationship(
                        source_id=v,
                        target_id=u,
                        type=data.get("type", key),
                        properties={k: val for k, val in data.items() if k != "type"}
                    ))
                    src_name = self._nx_graph.nodes[v].get("name", v)
                    dst_name = self._nx_graph.nodes[u].get("name", u)
                    rel_type = data.get("type", key)
                    paths_text.append(f"({src_name}) -[:{rel_type}]-> ({dst_name})")

                    if v not in visited:
                        visited.add(v)
                        next_frontier.add(v)

            frontier = next_frontier

        # Build Entity objects
        entity_objects = []
        for nid in visited:
            ndata = self._nx_graph.nodes.get(nid, {})
            entity_objects.append(Entity(
                id=str(nid),
                name=ndata.get("name", str(nid)),
                type=ndata.get("type", "ClinicalConcept"),
                properties={k: v for k, v in ndata.items() if k not in ("name", "type")}
            ))

        return SubgraphResult(
            entities=entity_objects,
            relationships=matched_edges,
            matched_paths=list(dict.fromkeys(paths_text))  # Deduplicate paths
        )

    def get_k_hop_subgraph(self, entity_ids: List[str], max_hops: int = 2) -> SubgraphResult:
        return self.get_subgraph_for_entities(entity_ids, max_hops=max_hops)

# Global singleton
graph_client = MedicalGraphClient()

def get_graph_client() -> MedicalGraphClient:
    return graph_client
