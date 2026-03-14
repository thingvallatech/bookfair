"""
Agent 1: Mechanism Extractor

Extracts structured BioMechanism data from raw text such as paper abstracts
and AskNature entries. Produces a normalized dict suitable for downstream
abstraction and matching agents.
"""

import json
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from modal_compute.inference import LLMEngine

SYSTEM_PROMPT = """You are a biological mechanism extraction expert with deep knowledge of biomimetics, systems biology, and computational analogies.

Your task is to extract structured information from biological text (research paper abstracts, AskNature entries, biology textbooks) and produce a precise, machine-readable representation of the underlying biological mechanism.

You must output valid JSON matching this schema:
{
  "name": "short descriptive name for the mechanism",
  "organism": "the organism(s) this mechanism is found in",
  "biological_level": "one of: molecular, cellular, tissue, organ, organism, ecosystem",
  "function": "what this mechanism does / what problem it solves for the organism",
  "inputs": ["list of inputs to the mechanism (molecules, signals, environmental conditions)"],
  "outputs": ["list of outputs or outcomes"],
  "key_components": ["list of key structural or functional components"],
  "process_steps": ["ordered list of steps describing how the mechanism operates"],
  "constraints": ["physical, chemical, or biological constraints the mechanism operates under"],
  "performance_characteristics": {
    "efficiency": "quantitative or qualitative description if available",
    "speed": "response time or throughput if available",
    "robustness": "fault tolerance or adaptability if available",
    "scalability": "how it scales if available"
  },
  "computational_keywords": ["keywords suggesting computational analogies, e.g. 'distributed', 'feedback', 'optimization', 'search', 'sorting'"],
  "source_type": "one of: abstract, asknature, textbook, other",
  "confidence": 0.0
}

Rules:
- Extract only what is explicitly stated or strongly implied in the source text
- For missing fields, use null rather than guessing
- The confidence field (0.0-1.0) reflects how completely the source text supports the extraction
- computational_keywords should highlight features relevant to algorithm design
- Be precise and technical; avoid vague generalizations
- process_steps should be mechanistic and ordered, not just a summary

Output ONLY the JSON object, no preamble, no explanation."""


def extract_mechanism(text: str, llm: "LLMEngine") -> dict:
    """
    Extract structured BioMechanism data from raw biological text.

    Args:
        text: Raw text such as a paper abstract or AskNature entry.
        llm: An instantiated LLMEngine for inference.

    Returns:
        A dict conforming to the BioMechanism schema, or a dict with an
        'error' key if parsing fails.
    """
    prompt = f"""{SYSTEM_PROMPT}

---
SOURCE TEXT:
{text}
---

Extract the biological mechanism as JSON:"""

    response = llm.generate.remote(prompt, max_tokens=2048, temperature=0.2)

    # Strip any markdown code fences the model may have added
    cleaned = response.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        # Drop opening fence (and optional language tag) and closing fence
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
