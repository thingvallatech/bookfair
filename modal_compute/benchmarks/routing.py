"""Network routing benchmarks for evaluating bio-inspired algorithms."""

import heapq
from dataclasses import dataclass, field

import networkx as nx
import numpy as np


@dataclass
class RoutingProblem:
    """A network routing problem instance."""

    graph: nx.Graph
    source: int
    target: int
    num_nodes: int
    graph_type: str


@dataclass
class RoutingSolution:
    """A solution to a routing problem."""

    path: list[int]
    path_length: float
    fitness: float = 0.0


def generate_random_graph(
    n: int = 50,
    graph_type: str = "erdos_renyi",
    seed: int | None = None,
) -> RoutingProblem:
    """Generate a random graph for routing benchmarks.

    Args:
        n: Number of nodes.
        graph_type: "erdos_renyi", "barabasi_albert", or "grid".
        seed: Random seed for reproducibility.
    """
    rng = np.random.default_rng(seed)

    if graph_type == "erdos_renyi":
        p = max(0.1, 2.0 * np.log(n) / n)  # Ensure connectivity
        graph = nx.erdos_renyi_graph(n, p, seed=seed)
    elif graph_type == "barabasi_albert":
        m = min(3, n - 1)
        graph = nx.barabasi_albert_graph(n, m, seed=seed)
    elif graph_type == "grid":
        side = int(np.ceil(np.sqrt(n)))
        graph = nx.grid_2d_graph(side, side)
        mapping = {node: i for i, node in enumerate(graph.nodes())}
        graph = nx.relabel_nodes(graph, mapping)
    else:
        raise ValueError(f"Unknown graph type: {graph_type}")

    # Add random edge weights
    for u, v in graph.edges():
        graph[u][v]["weight"] = float(rng.uniform(1.0, 10.0))

    # Ensure connectivity
    if not nx.is_connected(graph):
        components = list(nx.connected_components(graph))
        for i in range(len(components) - 1):
            u = next(iter(components[i]))
            v = next(iter(components[i + 1]))
            graph.add_edge(u, v, weight=float(rng.uniform(1.0, 10.0)))

    # Pick source and target
    nodes = list(graph.nodes())
    source = nodes[0]
    target = nodes[-1]

    return RoutingProblem(
        graph=graph,
        source=source,
        target=target,
        num_nodes=n,
        graph_type=graph_type,
    )


def dijkstra_baseline(problem: RoutingProblem) -> RoutingSolution:
    """Dijkstra's algorithm baseline for routing benchmarks."""
    try:
        path = nx.dijkstra_path(problem.graph, problem.source, problem.target, weight="weight")
        length = nx.dijkstra_path_length(
            problem.graph, problem.source, problem.target, weight="weight"
        )
        return RoutingSolution(path=path, path_length=length, fitness=1.0 / length)
    except nx.NetworkXNoPath:
        return RoutingSolution(path=[], path_length=float("inf"), fitness=0.0)


def evaluate_routing_solution(
    problem: RoutingProblem,
    solution: RoutingSolution,
    baseline: RoutingSolution | None = None,
) -> dict:
    """Evaluate a routing solution against metrics.

    Returns:
        Dict with path_length, is_valid, baseline_ratio, and fault_tolerance.
    """
    # Validate path
    is_valid = True
    if not solution.path:
        is_valid = False
    elif solution.path[0] != problem.source or solution.path[-1] != problem.target:
        is_valid = False
    else:
        for i in range(len(solution.path) - 1):
            if not problem.graph.has_edge(solution.path[i], solution.path[i + 1]):
                is_valid = False
                break

    if baseline is None:
        baseline = dijkstra_baseline(problem)

    baseline_ratio = (
        baseline.path_length / solution.path_length
        if solution.path_length > 0 and is_valid
        else 0.0
    )

    return {
        "path_length": solution.path_length,
        "is_valid": is_valid,
        "baseline_ratio": baseline_ratio,
        "num_hops": len(solution.path) - 1 if solution.path else 0,
    }
