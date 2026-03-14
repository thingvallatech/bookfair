import modal

app = modal.App("biospark")

inference_image = modal.Image.debian_slim(python_version="3.12").pip_install(
    "vllm>=0.6.0", "transformers", "torch"
)

@app.cls(
    gpu=modal.gpu.A100(count=1),
    image=inference_image,
    timeout=600,
    container_idle_timeout=300,
)
class LLMEngine:
    @modal.enter()
    def load_model(self):
        from vllm import LLM
        self.model = LLM(
            model="deepseek-ai/DeepSeek-R1-Distill-Qwen-32B",
            tensor_parallel_size=1,
            max_model_len=8192,
            trust_remote_code=True,
        )

    @modal.method()
    def generate(self, prompt: str, max_tokens: int = 4096, temperature: float = 0.7) -> str:
        from vllm import SamplingParams
        params = SamplingParams(max_tokens=max_tokens, temperature=temperature)
        outputs = self.model.generate([prompt], params)
        return outputs[0].outputs[0].text
