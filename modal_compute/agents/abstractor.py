"""
Agent 2: Abstractor

Takes a structured BioMechanism dict (output of mechanism_extractor) and
generates a computational abstraction — a description of the mechanism in
algorithm-design terms, stripped of biological specifics.
"""

import json
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from modal_compute.inference import LLMEngine

SYSTEM_PROMPT = """You are a computational abstraction specialist who bridges biological systems and computer science.

Given a structured biological mechanism (as JSON), your task is to produce a rich computational abstraction that captures the *algorithmic essence* of the mechanism. The abstraction must be written for a computer scientist audience and must completely avoid biological jargon — translate all biological concepts into computational equivalents.

Your abstraction must cover:

1. ABSTRACT COMPUTATIONAL MODEL
   - What type of computation does this represent? (graph traversal, optimization, search, scheduling, communication protocol, data structure operation, etc.)
   - What is the input space and output space in computational terms?
   - What is the objective function or optimization criterion?

2. ALGORITHMIC PROPERTIES
   - Distributed vs. centralized control
   - Synchronous vs. asynchronous operation
   - Deterministic vs. stochastic elements
   - Online (streaming) vs. offline (batch) processing
   - Memory requirements (stateful vs. stateless)

3. COMPLEXITY CHARACTERISTICS
   - Time complexity class (if inferable): constant, logarithmic, linear, polynomial, exponential
   - Space complexity considerations
   - Parallelism potential

4. KEY ALGORITHMIC PATTERNS
   - Which classical CS patterns appear? (divide and conquer, dynamic programming, greedy, backtracking, message passing, consensus, gossip, etc.)
   - Feedback loops → control theory / PID
   - Chemical gradients → gradient descent / potential fields
   - Signal amplification → boosting / attention mechanisms
   - Self-organization → emergent computation / cellular automata

5. POTENTIAL APPLICATION DOMAINS
   - List 3-5 specific CS problem domains where this abstraction could be applied

6. NOVEL ASPECTS
   - What does this mechanism do that existing algorithms do poorly or not at all?
   - What constraints does it elegantly satisfy?

Format your response as a single coherent technical paragraph per section, labeled with the section headers above. Be specific, technical, and creative. The goal is to inspire novel algorithm design."""


def abstract_mechanism(mechanism: dict, llm: "LLMEngine") -> str:
    """
    Generate a computational abstraction from a structured BioMechanism dict.

    Args:
        mechanism: A BioMechanism dict as produced by extract_mechanism().
        llm: An instantiated LLMEngine for inference.

    Returns:
        A string containing the computational abstraction, structured with
        labeled sections. Returns an error string if the LLM call fails.
    """
    mechanism_json = json.dumps(mechanism, indent=2)

    prompt = f"""{SYSTEM_PROMPT}

---
BIOLOGICAL MECHANISM (JSON):
{mechanism_json}
---

Generate the computational abstraction:"""

    abstraction = llm.generate.remote(prompt, max_tokens=3000, temperature=0.5)
    return abstraction.strip()
