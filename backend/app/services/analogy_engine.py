from app.services.knowledge_graph import KnowledgeGraphService


class AnalogyEngine:
    """Core analogy matching between biological mechanisms and CS problems.

    Currently a skeleton that queries the Neo4j knowledge graph for structural
    matches via shared Property nodes.  Scoring will later be upgraded to use
    Modal-hosted LLM agents for semantic / mathematical similarity.
    """

    def __init__(self, kg: KnowledgeGraphService) -> None:
        self._kg = kg

    async def find_candidates(self, mechanism_id: str) -> list[dict]:
        """Return candidate (problem, shared_properties) pairs for a mechanism.

        Delegates to KnowledgeGraphService.find_analogy_candidates(), which
        traverses:
            BioMechanism -[:HAS_PROPERTY]-> Property <-[:REQUIRES_PROPERTY]- CSProblem

        Returns a list of dicts, each containing:
            - problem_id
            - problem_name
            - problem_category
            - problem_description
            - shared_properties  (list[str])
            - match_count        (int)
        """
        candidates = await self._kg.find_analogy_candidates(mechanism_id)
        return candidates

    async def score_analogy(
        self,
        mechanism: dict,
        problem: dict,
        shared_properties: list[str],
    ) -> dict:
        """Score a (mechanism, problem) analogy pair.

        Returns a dict with:
            - structural_similarity  float in [0, 1]
            - novelty_score          float in [0, 1]

        Current implementation returns placeholder values of 0.5 for both
        scores.  This method will later be replaced by a call to a Modal LLM
        agent that performs:
            1. Semantic embedding comparison of mechanism and problem descriptions.
            2. Mathematical abstraction alignment (e.g. matching differential
               equations / feedback loops to algorithmic recurrences).
            3. Novelty estimation based on existing_bio_inspired field of the
               CSProblem to penalise already-explored analogies.

        TODO: replace placeholder with Modal LLM call, e.g.:
            from app.modal_client import ModalClient
            client = ModalClient()
            prompt = _build_scoring_prompt(mechanism, problem, shared_properties)
            response = await client.generate(prompt)
            scores = _parse_scores(response)
        """
        # Placeholder scores – will be LLM-powered
        structural_similarity: float = 0.5
        novelty_score: float = 0.5

        return {
            "mechanism_id": mechanism.get("id"),
            "problem_id": problem.get("id"),
            "shared_properties": shared_properties,
            "structural_similarity": structural_similarity,
            "novelty_score": novelty_score,
        }
