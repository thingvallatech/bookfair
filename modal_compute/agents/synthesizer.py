"""
Agent 4: Synthesizer

Takes a high-scoring analogy (mechanism + CS problem + match evaluation) and
generates working Python algorithm code inspired by the biological mechanism.
"""

import json
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from modal_compute.inference import LLMEngine

SYSTEM_PROMPT = """You are an expert algorithm designer specializing in bio-inspired computation.

Given a biological mechanism, a CS problem, and a validated analogy mapping between them, your task is to synthesize a concrete, working Python algorithm that implements the bio-inspired approach.

Requirements for the generated algorithm:
1. CORRECTNESS: The code must be syntactically valid Python 3.10+ and logically correct
2. COMPLETENESS: Include all necessary imports, helper functions, and the main algorithm function
3. DOCUMENTATION: Rich docstrings explaining how biological concepts map to code
4. STANDARD INTERFACE: The main function must accept (problem_instance: dict) -> dict
5. SELF-CONTAINED: No external dependencies beyond: numpy, scipy, networkx, random, math, collections, heapq, itertools
6. BENCHMARKABLE: Must complete in reasonable time for typical problem instances

The algorithm function signature must be:
    def solve(problem_instance: dict) -> dict:
        '''
        Bio-inspired solver for [problem name].
        Inspired by: [mechanism name] in [organism].

        Args:
            problem_instance: dict with problem-specific keys
        Returns:
            dict with 'solution', 'cost', 'iterations', 'metadata' keys
        '''

You must output valid JSON with this structure:
{
  "name": "descriptive algorithm name (e.g., 'Slime Mold Network Optimizer')",
  "bio_inspiration": "one sentence on the biological source",
  "code": "complete Python code as a single string with \\n for newlines",
  "explanation": {
    "overview": "2-3 sentence overview of the algorithm",
    "biological_mapping": "how biological components map to algorithmic ones",
    "key_innovations": ["list of novel aspects vs standard approaches"],
    "expected_behavior": "what convergence/performance characteristics to expect",
    "limitations": ["known limitations or problem types where this won't work well"]
  },
  "complexity": {
    "time": "Big-O time complexity",
    "space": "Big-O space complexity",
    "notes": "any caveats on complexity analysis"
  },
  "hyperparameters": [
    {
      "name": "parameter name",
      "default": "default value",
      "description": "what it controls, biological analog"
    }
  ]
}

Output ONLY the JSON object. The code field must be complete, runnable Python."""


def synthesize_algorithm(
    mechanism: dict,
    problem: dict,
    analogy: dict,
    llm: "LLMEngine",
) -> dict:
    """
    Generate bio-inspired algorithm code from a validated high-scoring analogy.

    Args:
        mechanism: BioMechanism dict from extract_mechanism().
        problem: CS problem dict with 'name', 'description', 'constraints',
                 'objectives', 'domain' keys.
        analogy: Match evaluation dict from evaluate_match(), expected to have
                 overall_score >= 0.5 for meaningful synthesis.
        llm: An instantiated LLMEngine for inference.

    Returns:
        A dict with 'name', 'code', 'explanation', 'complexity',
        'hyperparameters', and 'bio_inspiration'. Returns a dict with 'error'
        key on parse failure.
    """
    mechanism_json = json.dumps(mechanism, indent=2)
    problem_json = json.dumps(problem, indent=2)
    analogy_json = json.dumps(analogy, indent=2)

    prompt = f"""{SYSTEM_PROMPT}

---
BIOLOGICAL MECHANISM:
{mechanism_json}

---
CS PROBLEM TO SOLVE:
{problem_json}

---
VALIDATED ANALOGY MAPPING:
{analogy_json}
---

Synthesize the bio-inspired algorithm and output JSON:"""

    response = llm.generate.remote(prompt, max_tokens=4096, temperature=0.4)

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
