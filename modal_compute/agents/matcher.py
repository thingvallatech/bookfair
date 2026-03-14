"""
Agent 3: Matcher

Evaluates a potential analogy between a bio-inspired computational abstraction
and a concrete CS problem. Scores the match across several dimensions and
provides a detailed mapping explanation.
"""

import json
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from modal_compute.inference import LLMEngine

SYSTEM_PROMPT = """You are an expert in biomimetic algorithm design and computational analogy evaluation.

Your task is to rigorously evaluate whether a biological mechanism's computational abstraction genuinely maps to a given CS problem in a way that could yield a novel or superior algorithm.

You will be given:
1. A computational abstraction of a biological mechanism
2. A description of a CS problem to solve
3. A list of shared properties already identified between them

Evaluate the match across these dimensions and output valid JSON:

{
  "structural_similarity": {
    "score": 0.0,
    "reasoning": "How structurally similar are the computational patterns? Does the mechanism's topology match the problem's structure?"
  },
  "novelty": {
    "score": 0.0,
    "reasoning": "How novel is this analogy compared to known bio-inspired algorithms? Would this produce something genuinely new?"
  },
  "feasibility": {
    "score": 0.0,
    "reasoning": "How feasible is it to implement this analogy? Consider implementation complexity, required assumptions, and known obstacles."
  },
  "performance_potential": {
    "score": 0.0,
    "reasoning": "Does the biological mechanism's properties (efficiency, robustness, scalability) translate to potential performance improvements on the CS problem?"
  },
  "mapping": {
    "biological_to_computational": {
      "description": "Explicit mapping of biological components/steps to computational equivalents",
      "component_mappings": [
        {"biological": "...", "computational": "...", "confidence": 0.0}
      ]
    },
    "preserved_properties": ["list of properties preserved in the mapping"],
    "lost_properties": ["list of biological properties that don't translate"],
    "gained_properties": ["list of computational properties this mapping would add"]
  },
  "overall_score": 0.0,
  "recommendation": "one of: STRONG_MATCH, GOOD_MATCH, WEAK_MATCH, NO_MATCH",
  "key_insight": "One sentence describing the core insight that makes this analogy work (or why it doesn't)"
}

Scoring rules:
- All scores are 0.0 to 1.0
- overall_score = 0.4 * structural_similarity.score + 0.3 * novelty.score + 0.2 * feasibility.score + 0.1 * performance_potential.score
- STRONG_MATCH: overall >= 0.7
- GOOD_MATCH: overall >= 0.5
- WEAK_MATCH: overall >= 0.3
- NO_MATCH: overall < 0.3

Be critical and precise. A superficial analogy scores low. A deep structural isomorphism scores high.
Output ONLY the JSON object."""


def evaluate_match(
    abstraction: str,
    problem: dict,
    shared_properties: list[str],
    llm: "LLMEngine",
) -> dict:
    """
    Evaluate the quality of a bio-mechanism to CS-problem analogy.

    Args:
        abstraction: Computational abstraction string from abstract_mechanism().
        problem: Dict describing the CS problem, expected keys: 'name',
                 'description', 'constraints', 'objectives', 'domain'.
        shared_properties: List of property strings already identified as shared.
        llm: An instantiated LLMEngine for inference.

    Returns:
        A dict with structural_similarity, novelty, feasibility,
        performance_potential, mapping, overall_score, recommendation,
        and key_insight. Returns a dict with 'error' key on parse failure.
    """
    problem_json = json.dumps(problem, indent=2)
    props_json = json.dumps(shared_properties, indent=2)

    prompt = f"""{SYSTEM_PROMPT}

---
COMPUTATIONAL ABSTRACTION OF BIOLOGICAL MECHANISM:
{abstraction}

---
CS PROBLEM:
{problem_json}

---
ALREADY IDENTIFIED SHARED PROPERTIES:
{props_json}
---

Evaluate this analogy and output JSON:"""

    response = llm.generate.remote(prompt, max_tokens=3000, temperature=0.3)

    cleaned = response.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        inner_lines = []
        in_block = False
        for line in lines:
            if line.startswith("```") and not in_block:
                in_block = True
                continue
            if line.startswith("```") and in_block:
                break
            if in_block:
                inner_lines.append(line)
        cleaned = "\n".join(inner_lines)

    try:
        result = json.loads(cleaned)
        return result
    except json.JSONDecodeError as exc:
        return {
            "error": f"JSON parse error: {exc}",
            "raw_response": response,
        }
