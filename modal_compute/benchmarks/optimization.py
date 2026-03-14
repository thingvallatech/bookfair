"""TSP and combinatorial optimization benchmarks."""

from dataclasses import dataclass

import numpy as np


@dataclass
class TSPInstance:
    """A Traveling Salesman Problem instance."""

    cities: np.ndarray  # (n, 2) array of city coordinates
    num_cities: int
    distance_matrix: np.ndarray  # (n, n) pairwise distances
    name: str = "random"


@dataclass
class TSPSolution:
    """A solution to a TSP instance."""

    tour: list[int]
    total_distance: float
    fitness: float = 0.0


def generate_tsp_instance(n: int = 50, seed: int | None = None) -> TSPInstance:
    """Generate a random TSP instance with cities in [0, 100]^2."""
    rng = np.random.default_rng(seed)
    cities = rng.uniform(0, 100, size=(n, 2))

    # Compute distance matrix
    diff = cities[:, np.newaxis, :] - cities[np.newaxis, :, :]
    distance_matrix = np.sqrt(np.sum(diff**2, axis=2))

    return TSPInstance(
        cities=cities,
        num_cities=n,
        distance_matrix=distance_matrix,
        name=f"random_{n}_{seed}",
    )


def tour_length(instance: TSPInstance, tour: list[int]) -> float:
    """Calculate total tour length."""
    total = 0.0
    for i in range(len(tour)):
        total += instance.distance_matrix[tour[i], tour[(i + 1) % len(tour)]]
    return total


def nearest_neighbor_baseline(instance: TSPInstance, start: int = 0) -> TSPSolution:
    """Nearest-neighbor heuristic baseline for TSP."""
    n = instance.num_cities
    visited = {start}
    tour = [start]
    current = start

    for _ in range(n - 1):
        nearest = -1
        nearest_dist = float("inf")
        for j in range(n):
            if j not in visited and instance.distance_matrix[current, j] < nearest_dist:
                nearest = j
                nearest_dist = instance.distance_matrix[current, j]
        tour.append(nearest)
        visited.add(nearest)
        current = nearest

    total = tour_length(instance, tour)
    return TSPSolution(tour=tour, total_distance=total, fitness=1.0 / total)


def two_opt_improve(instance: TSPInstance, solution: TSPSolution) -> TSPSolution:
    """Apply 2-opt local search to improve a TSP solution."""
    tour = list(solution.tour)
    n = len(tour)
    improved = True

    while improved:
        improved = False
        for i in range(1, n - 1):
            for j in range(i + 1, n):
                d_old = (
                    instance.distance_matrix[tour[i - 1], tour[i]]
                    + instance.distance_matrix[tour[j], tour[(j + 1) % n]]
                )
                d_new = (
                    instance.distance_matrix[tour[i - 1], tour[j]]
                    + instance.distance_matrix[tour[i], tour[(j + 1) % n]]
                )
                if d_new < d_old:
                    tour[i : j + 1] = reversed(tour[i : j + 1])
                    improved = True

    total = tour_length(instance, tour)
    return TSPSolution(tour=tour, total_distance=total, fitness=1.0 / total)


def evaluate_tsp_solution(
    instance: TSPInstance,
    solution: TSPSolution,
    baseline: TSPSolution | None = None,
) -> dict:
    """Evaluate a TSP solution.

    Returns:
        Dict with total_distance, is_valid, baseline_ratio.
    """
    # Validate: all cities visited exactly once
    is_valid = sorted(solution.tour) == list(range(instance.num_cities))

    if baseline is None:
        baseline = nearest_neighbor_baseline(instance)

    baseline_ratio = (
        baseline.total_distance / solution.total_distance
        if solution.total_distance > 0 and is_valid
        else 0.0
    )

    return {
        "total_distance": solution.total_distance,
        "is_valid": is_valid,
        "baseline_ratio": baseline_ratio,
        "num_cities": instance.num_cities,
    }
