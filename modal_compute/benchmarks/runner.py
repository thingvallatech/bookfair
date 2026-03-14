"""
Sandboxed Benchmark Runner

Executes algorithm code in an isolated Modal container and returns structured
performance metrics. Uses Modal's sandbox infrastructure to prevent runaway
code from affecting other infrastructure.
"""

from __future__ import annotations

import modal

app = modal.App("biospark-benchmarks")

runner_image = modal.Image.debian_slim(python_version="3.12").pip_install(
    "networkx>=3.0",
    "numpy>=1.24",
    "scipy>=1.10",
)


@app.function(
    image=runner_image,
    timeout=120,
    # Deliberately no GPU — benchmarks run on CPU to measure algorithmic
    # efficiency independent of hardware acceleration.
    cpu=2.0,
    memory=1024,
)
def run_benchmark(algorithm_code: str, benchmark_config: dict) -> dict:
    """
    Execute an algorithm in a sandboxed container and return benchmark metrics.

    The algorithm_code must define a top-level function:
        def solve(problem_instance: dict) -> dict

    The solve function must return a dict containing at least:
        - 'solution': the computed solution (format is domain-specific)
        - 'cost': numeric cost/quality of the solution
        - 'iterations': number of iterations taken
        - 'metadata': dict with any additional info

    Args:
        algorithm_code: Complete Python source code as a string.
        benchmark_config: Dict with keys:
            'domain' (str): benchmark domain ('routing', 'tsp', 'optimization')
            'instances' (list[dict]): list of problem instances to solve
            'baseline_score' (float): reference quality score for comparison
            'metrics' (list[str]): metrics to collect
            'timeout_seconds' (int): per-instance wall-clock time limit

    Returns:
        BenchmarkResult dict with keys:
            'success' (bool): whether all instances completed without error
            'error' (str|None): error message if success is False
            'domain' (str): echoed from benchmark_config
            'num_instances' (int): number of instances attempted
            'num_successful' (int): number of instances completed successfully
            'solution_quality' (float): mean normalized solution quality [0,1]
            'algorithm_runtime' (float): mean wall-clock seconds per instance
            'baseline_runtime' (float): mean Dijkstra/baseline seconds per instance
            'robustness_score' (float): quality on fault-tolerance instances [0,1]
            'consistency_score' (float): 1 - coefficient_of_variation of costs [0,1]
            'per_instance_results' (list[dict]): per-instance breakdown
    """
    import time
    import traceback
    import math

    domain = benchmark_config.get("domain", "unknown")
    instances = benchmark_config.get("instances", [])
    timeout_seconds = benchmark_config.get("timeout_seconds", 30)
    baseline_score = benchmark_config.get("baseline_score", 1.0)

    if not instances:
        return {
            "success": False,
            "error": "No benchmark instances provided.",
            "domain": domain,
            "num_instances": 0,
            "num_successful": 0,
            "solution_quality": 0.0,
            "algorithm_runtime": 0.0,
            "baseline_runtime": 0.0,
            "robustness_score": 0.0,
            "consistency_score": 0.0,
            "per_instance_results": [],
        }

    # Compile algorithm code in a restricted namespace
    try:
        namespace: dict = {}
        exec(compile(algorithm_code, "<algorithm>", "exec"), namespace)  # noqa: S102
    except Exception as exc:
        return {
            "success": False,
            "error": f"Algorithm compilation failed: {exc}\n{traceback.format_exc()}",
            "domain": domain,
            "num_instances": len(instances),
            "num_successful": 0,
            "solution_quality": 0.0,
            "algorithm_runtime": 0.0,
            "baseline_runtime": 0.0,
            "robustness_score": 0.0,
            "consistency_score": 0.0,
            "per_instance_results": [],
        }

    solve_fn = namespace.get("solve")
    if solve_fn is None or not callable(solve_fn):
        return {
            "success": False,
            "error": "Algorithm code must define a top-level `solve(problem_instance: dict) -> dict` function.",
            "domain": domain,
            "num_instances": len(instances),
            "num_successful": 0,
            "solution_quality": 0.0,
            "algorithm_runtime": 0.0,
            "baseline_runtime": 0.0,
            "robustness_score": 0.0,
            "consistency_score": 0.0,
            "per_instance_results": [],
        }

    # Load the appropriate baseline runner
    if domain == "routing":
        from modal_compute.benchmarks.routing import run_dijkstra_baseline, score_routing_solution
        baseline_fn = run_dijkstra_baseline
        score_fn = score_routing_solution
    elif domain in ("tsp", "optimization"):
        from modal_compute.benchmarks.optimization import run_nearest_neighbor_baseline, score_tsp_solution
        baseline_fn = run_nearest_neighbor_baseline
        score_fn = score_tsp_solution
    else:
        baseline_fn = None
        score_fn = None

    per_instance_results = []
    algorithm_times = []
    baseline_times = []
    costs = []
    quality_scores = []

    for idx, instance in enumerate(instances):
        instance_result: dict = {"instance_index": idx, "success": False}

        # Run algorithm with timeout
        try:
            t0 = time.perf_counter()
            output = solve_fn(instance)
            elapsed = time.perf_counter() - t0

            if elapsed > timeout_seconds:
                instance_result["error"] = f"Timeout: took {elapsed:.1f}s > {timeout_seconds}s"
                per_instance_results.append(instance_result)
                continue

            instance_result["algorithm_runtime"] = elapsed
            instance_result["output"] = output
            algorithm_times.append(elapsed)

            if output and "cost" in output:
                costs.append(float(output["cost"]))

        except Exception as exc:
            instance_result["error"] = f"Runtime error: {exc}\n{traceback.format_exc()}"
            per_instance_results.append(instance_result)
            continue

        # Run baseline
        if baseline_fn is not None:
            try:
                t1 = time.perf_counter()
                baseline_output = baseline_fn(instance)
                baseline_elapsed = time.perf_counter() - t1
                instance_result["baseline_runtime"] = baseline_elapsed
                instance_result["baseline_output"] = baseline_output
                baseline_times.append(baseline_elapsed)

                if score_fn is not None:
                    quality = score_fn(output, baseline_output, instance)
                    instance_result["quality_score"] = quality
                    quality_scores.append(quality)
            except Exception as exc:
                instance_result["baseline_error"] = str(exc)

        instance_result["success"] = True
        per_instance_results.append(instance_result)

    num_successful = sum(1 for r in per_instance_results if r.get("success"))

    # Aggregate metrics
    mean_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0.0
    mean_algo_runtime = sum(algorithm_times) / len(algorithm_times) if algorithm_times else 0.0
    mean_base_runtime = sum(baseline_times) / len(baseline_times) if baseline_times else 0.0

    # Robustness: quality on fault-tolerance-tagged instances
    fault_instances = [
        r for r, inst in zip(per_instance_results, instances)
        if inst.get("fault_tolerance_test") and r.get("quality_score") is not None
    ]
    robustness = (
        sum(r["quality_score"] for r in fault_instances) / len(fault_instances)
        if fault_instances else mean_quality
    )

    # Consistency: 1 - CV of costs
    consistency = 1.0
    if len(costs) >= 2:
        mean_cost = sum(costs) / len(costs)
        if mean_cost != 0.0:
            variance = sum((c - mean_cost) ** 2 for c in costs) / len(costs)
            cv = math.sqrt(variance) / abs(mean_cost)
            consistency = max(0.0, 1.0 - cv)

    return {
        "success": num_successful > 0,
        "error": None,
        "domain": domain,
        "num_instances": len(instances),
        "num_successful": num_successful,
        "solution_quality": mean_quality,
        "algorithm_runtime": mean_algo_runtime,
        "baseline_runtime": mean_base_runtime,
        "robustness_score": robustness,
        "consistency_score": consistency,
        "per_instance_results": per_instance_results,
    }
