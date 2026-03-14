"""Modal function caller for BioSpark.

When the Modal integration is live, remote calls will look like:

    import modal

    # Look up the deployed app and its exported functions
    generate_fn = modal.Function.lookup("biospark-llm", "generate")
    benchmark_fn = modal.Function.lookup("biospark-benchmark", "run_benchmark")

    # Async remote invocation (returns a coroutine)
    result = await generate_fn.remote.aio(prompt, max_tokens=max_tokens, temperature=temperature)
    bench_result = await benchmark_fn.remote.aio(algorithm_code, benchmark_config)

Until the Modal app is deployed, all methods return mock responses so the
rest of the BioSpark backend can be developed and tested end-to-end.
"""


class ModalClient:
    """Client for calling Modal-hosted LLM and benchmark functions."""

    def __init__(self) -> None:
        # TODO: When connecting to Modal, initialise credentials here, e.g.:
        #   import modal
        #   self._app = modal.App.lookup("biospark")
        # Credentials (modal_token_id / modal_token_secret) are loaded from
        # app/config.py (settings) and set as environment variables before the
        # app starts.
        pass

    async def generate(
        self,
        prompt: str,
        max_tokens: int = 4096,
        temperature: float = 0.7,
    ) -> str:
        """Generate text using the Modal-hosted LLM.

        Args:
            prompt:       The full prompt string to send to the LLM.
            max_tokens:   Maximum tokens for the completion.
            temperature:  Sampling temperature (0 = deterministic, 1 = creative).

        Returns:
            The generated text as a plain string.

        TODO: Replace mock with Modal remote call:
            generate_fn = modal.Function.lookup("biospark-llm", "generate")
            return await generate_fn.remote.aio(
                prompt, max_tokens=max_tokens, temperature=temperature
            )
        """
        # Mock response – placeholder until Modal LLM is deployed
        return (
            f"[MOCK LLM RESPONSE] Received prompt of {len(prompt)} characters. "
            f"max_tokens={max_tokens}, temperature={temperature}. "
            "Replace ModalClient.generate() with a real Modal remote call."
        )

    async def run_benchmark(
        self,
        algorithm_code: str,
        benchmark_config: dict,
    ) -> dict:
        """Run a generated algorithm against a benchmark suite on Modal.

        Args:
            algorithm_code:   Source code of the algorithm to evaluate.
            benchmark_config: Dict describing the benchmark suite, problem
                              instance, evaluation metrics, time limits, etc.

        Returns:
            A dict containing benchmark results, e.g.:
                {
                    "fitness": 0.87,
                    "runtime_ms": 1420,
                    "metrics": {"accuracy": 0.91, "f1": 0.85},
                    "stdout": "...",
                    "stderr": "",
                }

        TODO: Replace mock with Modal remote call:
            benchmark_fn = modal.Function.lookup("biospark-benchmark", "run_benchmark")
            return await benchmark_fn.remote.aio(algorithm_code, benchmark_config)
        """
        # Mock result – placeholder until Modal benchmark runner is deployed
        return {
            "fitness": 0.5,
            "runtime_ms": 0,
            "metrics": {},
            "stdout": "[MOCK BENCHMARK] Replace ModalClient.run_benchmark() with a real Modal remote call.",
            "stderr": "",
            "mock": True,
        }
