"""
Agent 5: Critic

Reviews generated bio-inspired algorithm code for correctness, quality, and
fidelity to the biological analogy. Returns a structured review with a
recommendation of ACCEPT, REVISE, or REJECT.
"""

import json
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from modal_compute.inference import LLMEngine

SYSTEM_PROMPT = """You are a rigorous code reviewer and algorithm expert specializing in bio-inspired computation.

Your task is to critically review a bio-inspired algorithm, evaluating both its technical quality as Python code and its fidelity to the biological mechanism that inspired it.

You will be given:
1. The generated algorithm code (Python)
2. The original biological mechanism dict that inspired it

Evaluate the algorithm across these dimensions and output valid JSON:

{
  "technical_review": {
    "syntactic_correctness": {
      "score": 0.0,
      "issues": ["list any syntax errors or Python anti-patterns"]
    },
    "logical_correctness": {
      "score": 0.0,
      "issues": ["list logical flaws, off-by-one errors, edge cases not handled"]
    },
    "code_quality": {
      "score": 0.0,
      "issues": ["readability, naming, structure, documentation completeness"]
    },
    "interface_compliance": {
      "score": 0.0,
      "issues": ["does solve(problem_instance: dict) -> dict exist and return correct keys?"]
    },
    "dependency_compliance": {
      "score": 0.0,
      "issues": ["does it use only allowed dependencies: numpy, scipy, networkx, random, math, collections, heapq, itertools?"]
    }
  },
  "bio_fidelity": {
    "score": 0.0,
    "assessment": "How faithfully does the code implement the biological mechanism's key properties?",
    "preserved": ["biological properties faithfully represented in code"],
    "violated": ["biological properties incorrectly or not represented"]
  },
  "performance_assessment": {
    "expected_complexity": "estimated time/space complexity",
    "potential_bottlenecks": ["list potential performance issues"],
    "scalability_concerns": ["list scalability concerns for large instances"]
  },
  "specific_improvements": [
    {
      "priority": "HIGH|MEDIUM|LOW",
      "location": "function name or line description",
      "issue": "description of the problem",
      "suggestion": "concrete fix or improvement"
    }
  ],
  "overall_score": 0.0,
  "recommendation": "ACCEPT|REVISE|REJECT",
  "review_summary": "2-3 sentence overall assessment",
  "revision_prompt": "If REVISE: specific instructions for what to change in the next iteration. If ACCEPT or REJECT: empty string."
}

Scoring rules:
- All scores are 0.0 to 1.0
- overall_score = mean of all dimension scores, weighted toward technical correctness
- ACCEPT: overall >= 0.75 AND no HIGH priority issues AND interface_compliance.score == 1.0
- REVISE: overall >= 0.45 OR fixable issues exist
- REJECT: overall < 0.45 AND fundamental flaws that require starting over

Be exacting. The code will be executed in a benchmarking harness — broken code wastes compute.
Output ONLY the JSON object."""


def review_algorithm(
    algorithm_code: str,
    mechanism: dict,
    llm: "LLMEngine",
) -> dict:
    """
    Review a generated bio-inspired algorithm for correctness and quality.

    Args:
        algorithm_code: Complete Python source code of the algorithm to review.
        mechanism: The BioMechanism dict that inspired the algorithm, from
                   extract_mechanism().
        llm: An instantiated LLMEngine for inference.

    Returns:
        A dict with 'recommendation' (ACCEPT/REVISE/REJECT), 'review_summary',
        'specific_improvements', 'overall_score', 'revision_prompt', and
        detailed sub-scores. Returns a dict with 'error' key on parse failure.
    """
    mechanism_json = json.dumps(mechanism, indent=2)

    prompt = f"""{SYSTEM_PROMPT}

---
ALGORITHM CODE TO REVIEW:
```python
{algorithm_code}
```

---
ORIGINAL BIOLOGICAL MECHANISM:
{mechanism_json}
---

Review this algorithm and output JSON:"""

    response = llm.generate.remote(prompt, max_tokens=3000, temperature=0.2)

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
