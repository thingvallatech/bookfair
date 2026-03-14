from neo4j import AsyncDriver, AsyncGraphDatabase


class KnowledgeGraphService:
    """Manages Neo4j knowledge graph operations for BioSpark."""

    def __init__(self, uri: str, user: str, password: str) -> None:
        self._driver: AsyncDriver = AsyncGraphDatabase.driver(
            uri, auth=(user, password)
        )

    async def close(self) -> None:
        """Close the Neo4j driver connection."""
        await self._driver.close()

    async def create_mechanism_node(self, mechanism_data: dict) -> dict:
        """Create a BioMechanism node and Property nodes for each key_property.

        Each key_property gets its own Property node connected via HAS_PROPERTY.
        Uses MERGE to avoid duplicates.
        """
        query = """
        MERGE (m:BioMechanism {id: $id})
        SET m.name = $name,
            m.organism = $organism,
            m.domain = $domain,
            m.description = $description,
            m.feedback_type = $feedback_type,
            m.scale = $scale
        WITH m
        UNWIND $key_properties AS prop_name
        MERGE (p:Property {name: prop_name})
        MERGE (m)-[:HAS_PROPERTY]->(p)
        RETURN m.id AS id, m.name AS name, count(p) AS property_count
        """
        async with self._driver.session() as session:
            result = await session.run(
                query,
                id=mechanism_data.get("id", ""),
                name=mechanism_data.get("name", ""),
                organism=mechanism_data.get("organism", ""),
                domain=mechanism_data.get("domain", ""),
                description=mechanism_data.get("description", ""),
                feedback_type=mechanism_data.get("feedback_type", ""),
                scale=mechanism_data.get("scale", ""),
                key_properties=mechanism_data.get("key_properties", []),
            )
            record = await result.single()
            return dict(record) if record else {}

    async def create_problem_node(self, problem_data: dict) -> dict:
        """Create a CSProblem node and Property nodes for each key_challenge.

        Each key_challenge gets its own Property node connected via REQUIRES_PROPERTY.
        Uses MERGE to avoid duplicates.
        """
        query = """
        MERGE (prob:CSProblem {id: $id})
        SET prob.name = $name,
            prob.category = $category,
            prob.description = $description
        WITH prob
        UNWIND $key_challenges AS challenge_name
        MERGE (p:Property {name: challenge_name})
        MERGE (prob)-[:REQUIRES_PROPERTY]->(p)
        RETURN prob.id AS id, prob.name AS name, count(p) AS property_count
        """
        async with self._driver.session() as session:
            result = await session.run(
                query,
                id=problem_data.get("id", ""),
                name=problem_data.get("name", ""),
                category=problem_data.get("category", ""),
                description=problem_data.get("description", ""),
                key_challenges=problem_data.get("key_challenges", []),
            )
            record = await result.single()
            return dict(record) if record else {}

    async def create_analogy_node(self, analogy_data: dict) -> dict:
        """Create an Analogy node with INSPIRES and TARGET_OF relationships.

        INSPIRES: BioMechanism -> Analogy
        TARGET_OF: CSProblem -> Analogy
        Uses MERGE to avoid duplicates.
        """
        query = """
        MERGE (a:Analogy {id: $id})
        SET a.structural_similarity = $structural_similarity,
            a.novelty_score = $novelty_score,
            a.confidence_score = $confidence_score,
            a.explanation = $explanation,
            a.algorithm_sketch = $algorithm_sketch
        WITH a
        MATCH (m:BioMechanism {id: $mechanism_id})
        MERGE (m)-[:INSPIRES]->(a)
        WITH a
        MATCH (prob:CSProblem {id: $problem_id})
        MERGE (prob)-[:TARGET_OF]->(a)
        RETURN a.id AS id
        """
        async with self._driver.session() as session:
            result = await session.run(
                query,
                id=analogy_data.get("id", ""),
                mechanism_id=analogy_data.get("mechanism_id", ""),
                problem_id=analogy_data.get("problem_id", ""),
                structural_similarity=analogy_data.get("structural_similarity", 0.0),
                novelty_score=analogy_data.get("novelty_score", 0.0),
                confidence_score=analogy_data.get("confidence_score", 0.0),
                explanation=analogy_data.get("explanation", ""),
                algorithm_sketch=analogy_data.get("algorithm_sketch", ""),
            )
            record = await result.single()
            return dict(record) if record else {}

    async def find_analogy_candidates(self, mechanism_id: str) -> list[dict]:
        """Find CS problems that share Property nodes with a given mechanism.

        Traverses: BioMechanism -[:HAS_PROPERTY]-> Property <-[:REQUIRES_PROPERTY]- CSProblem
        Returns problems with a list of shared property names and the count.
        """
        query = """
        MATCH (m:BioMechanism {id: $mechanism_id})-[:HAS_PROPERTY]->(p:Property)
              <-[:REQUIRES_PROPERTY]-(prob:CSProblem)
        WITH prob, collect(p.name) AS shared_properties, count(p) AS match_count
        ORDER BY match_count DESC
        RETURN prob.id AS problem_id,
               prob.name AS problem_name,
               prob.category AS problem_category,
               prob.description AS problem_description,
               shared_properties,
               match_count
        """
        async with self._driver.session() as session:
            result = await session.run(query, mechanism_id=mechanism_id)
            records = await result.data()
            return records

    async def get_graph_overview(self) -> dict:
        """Return summary statistics: node counts by label and total relationship count."""
        label_query = """
        CALL db.labels() YIELD label
        CALL apoc.cypher.run('MATCH (n:' + label + ') RETURN count(n) AS count', {})
        YIELD value
        RETURN label, value.count AS count
        """
        rel_query = """
        MATCH ()-[r]->()
        RETURN type(r) AS rel_type, count(r) AS count
        """
        # Fallback label count query that does not require APOC
        label_query_plain = """
        MATCH (n)
        RETURN labels(n)[0] AS label, count(n) AS count
        """
        async with self._driver.session() as session:
            # Node counts per label
            try:
                label_result = await session.run(label_query_plain)
                label_records = await label_result.data()
            except Exception:
                label_records = []

            # Relationship counts per type
            try:
                rel_result = await session.run(rel_query)
                rel_records = await rel_result.data()
            except Exception:
                rel_records = []

        node_counts = {r["label"]: r["count"] for r in label_records if r["label"]}
        rel_counts = {r["rel_type"]: r["count"] for r in rel_records}

        return {
            "node_counts": node_counts,
            "total_nodes": sum(node_counts.values()),
            "relationship_counts": rel_counts,
            "total_relationships": sum(rel_counts.values()),
        }

    async def get_neighbors(self, node_id: str) -> list[dict]:
        """Return all nodes directly connected to the node with the given id property."""
        query = """
        MATCH (n {id: $node_id})-[r]-(neighbor)
        RETURN neighbor.id AS neighbor_id,
               labels(neighbor) AS neighbor_labels,
               neighbor.name AS neighbor_name,
               type(r) AS relationship_type
        """
        async with self._driver.session() as session:
            result = await session.run(query, node_id=node_id)
            records = await result.data()
            return records
