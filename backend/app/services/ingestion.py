from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mechanism import BioMechanism
from app.models.problem import CSProblem
from app.services.knowledge_graph import KnowledgeGraphService


class IngestionService:
    """Handles ingestion of biological mechanisms and CS problems into both
    PostgreSQL (via SQLAlchemy) and Neo4j (via KnowledgeGraphService)."""

    def __init__(self, db: AsyncSession, kg: KnowledgeGraphService) -> None:
        self._db = db
        self._kg = kg

    # ------------------------------------------------------------------ #
    # Single-item ingestion                                                #
    # ------------------------------------------------------------------ #

    async def ingest_mechanism(self, data: dict) -> dict:
        """Persist a biological mechanism to PostgreSQL and Neo4j.

        Returns a dict summarising what was stored.
        """
        # PostgreSQL
        mechanism = BioMechanism(
            id=data["id"],
            name=data["name"],
            organism=data.get("organism", ""),
            domain=data.get("domain", ""),
            description=data.get("description", ""),
            information_flow=data.get("information_flow", ""),
            feedback_type=data.get("feedback_type", "positive"),
            key_properties=data.get("key_properties", []),
            mathematical_abstraction=data.get("mathematical_abstraction"),
            scale=data.get("scale", ""),
            inputs=data.get("inputs", []),
            outputs=data.get("outputs", []),
            convergence_behavior=data.get("convergence_behavior"),
            robustness=data.get("robustness"),
            source_papers=data.get("source_papers", []),
        )
        self._db.add(mechanism)
        await self._db.commit()
        await self._db.refresh(mechanism)

        # Neo4j
        kg_result = await self._kg.create_mechanism_node(data)

        return {
            "id": mechanism.id,
            "name": mechanism.name,
            "postgres": "ok",
            "neo4j": kg_result,
        }

    async def ingest_problem(self, data: dict) -> dict:
        """Persist a CS problem to PostgreSQL and Neo4j.

        Returns a dict summarising what was stored.
        """
        # PostgreSQL
        problem = CSProblem(
            id=data["id"],
            name=data["name"],
            category=data.get("category", ""),
            description=data.get("description", ""),
            key_challenges=data.get("key_challenges", []),
            mathematical_properties=data.get("mathematical_properties"),
            existing_bio_inspired=data.get("existing_bio_inspired", []),
            benchmark_suite=data.get("benchmark_suite"),
            evaluation_metrics=data.get("evaluation_metrics", []),
            state_of_art_baseline=data.get("state_of_art_baseline"),
        )
        self._db.add(problem)
        await self._db.commit()
        await self._db.refresh(problem)

        # Neo4j
        kg_result = await self._kg.create_problem_node(data)

        return {
            "id": problem.id,
            "name": problem.name,
            "postgres": "ok",
            "neo4j": kg_result,
        }

    # ------------------------------------------------------------------ #
    # Bulk ingestion                                                        #
    # ------------------------------------------------------------------ #

    async def bulk_ingest_mechanisms(self, mechanisms: list[dict]) -> list[dict]:
        """Batch-ingest a list of biological mechanisms.

        Each item is ingested individually so that partial failures surface
        per-record rather than rolling back the entire batch.
        """
        results: list[dict] = []
        for data in mechanisms:
            try:
                result = await self.ingest_mechanism(data)
                results.append({"status": "ok", **result})
            except Exception as exc:
                await self._db.rollback()
                results.append(
                    {"status": "error", "id": data.get("id"), "error": str(exc)}
                )
        return results

    async def bulk_ingest_problems(self, problems: list[dict]) -> list[dict]:
        """Batch-ingest a list of CS problems.

        Each item is ingested individually so that partial failures surface
        per-record rather than rolling back the entire batch.
        """
        results: list[dict] = []
        for data in problems:
            try:
                result = await self.ingest_problem(data)
                results.append({"status": "ok", **result})
            except Exception as exc:
                await self._db.rollback()
                results.append(
                    {"status": "error", "id": data.get("id"), "error": str(exc)}
                )
        return results
