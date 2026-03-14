"""
Population Management

Manages a fixed-size population of algorithm candidates for the evolutionary
loop. Supports tournament selection, elitism, and diversity tracking.
"""

from __future__ import annotations

import random
from typing import Any


class PopulationManager:
    """
    Manages a population of algorithm candidates during evolution.

    Each individual is a dict that must contain at least:
        - 'code': str — the Python source of the algorithm
        - 'fitness': float — current benchmark fitness score (higher is better)
        - 'id': str — unique identifier

    The population is kept sorted by fitness (descending) and pruned to
    max_size after each addition.
    """

    def __init__(self, max_size: int = 10) -> None:
        """
        Args:
            max_size: Maximum number of individuals to retain. When the
                      population exceeds this, the weakest individuals are
                      removed.
        """
        self.max_size = max_size
        self._individuals: list[dict[str, Any]] = []

    # ------------------------------------------------------------------
    # Core operations
    # ------------------------------------------------------------------

    def add(self, individual: dict[str, Any], fitness: float) -> None:
        """
        Add an individual to the population with the given fitness score.

        If the population exceeds max_size after insertion, the lowest-fitness
        individual is removed. Individuals with equal IDs are deduplicated
        (latest fitness wins).

        Args:
            individual: Algorithm dict. Must include a 'code' key.
            fitness: Fitness score (higher is better).
        """
        entry = dict(individual)
        entry["fitness"] = fitness

        # Assign a stable ID if missing
        if "id" not in entry:
            import hashlib
            entry["id"] = hashlib.sha256(entry.get("code", "").encode()).hexdigest()[:16]

        # Replace duplicate by ID
        self._individuals = [i for i in self._individuals if i.get("id") != entry["id"]]
        self._individuals.append(entry)
        self._sort()

        # Prune to max_size (keep the best)
        if len(self._individuals) > self.max_size:
            self._individuals = self._individuals[: self.max_size]

    def remove(self, individual_id: str) -> bool:
        """
        Remove an individual by ID.

        Args:
            individual_id: The 'id' field of the individual to remove.

        Returns:
            True if an individual was removed, False if ID not found.
        """
        before = len(self._individuals)
        self._individuals = [i for i in self._individuals if i.get("id") != individual_id]
        return len(self._individuals) < before

    # ------------------------------------------------------------------
    # Selection
    # ------------------------------------------------------------------

    def select_tournament(self, k: int = 3) -> dict[str, Any]:
        """
        Select an individual via tournament selection.

        Randomly samples k individuals and returns the one with the highest
        fitness. Larger k increases selection pressure.

        Args:
            k: Tournament size. Clamped to the population size.

        Returns:
            The winning individual dict (a reference, not a copy).

        Raises:
            ValueError: If the population is empty.
        """
        if not self._individuals:
            raise ValueError("Cannot select from an empty population.")
        k = min(k, len(self._individuals))
        contestants = random.sample(self._individuals, k)
        return max(contestants, key=lambda i: i.get("fitness", float("-inf")))

    def select_top(self, n: int) -> list[dict[str, Any]]:
        """
        Return the top-n individuals by fitness.

        Args:
            n: Number of individuals to return.

        Returns:
            List of individual dicts, sorted best-first.
        """
        return self._individuals[:n]

    # ------------------------------------------------------------------
    # Accessors
    # ------------------------------------------------------------------

    def get_best(self) -> dict[str, Any] | None:
        """Return the highest-fitness individual, or None if empty."""
        return self._individuals[0] if self._individuals else None

    def get_all(self) -> list[dict[str, Any]]:
        """Return a shallow copy of all individuals, sorted best-first."""
        return list(self._individuals)

    def mean_fitness(self) -> float:
        """Return the mean fitness of the current population."""
        if not self._individuals:
            return 0.0
        return sum(i.get("fitness", 0.0) for i in self._individuals) / len(self._individuals)

    def diversity_score(self) -> float:
        """
        Estimate population diversity as the fraction of unique code hashes.

        Returns:
            Float in [0.0, 1.0]. 1.0 = all individuals are unique.
        """
        if len(self._individuals) <= 1:
            return 1.0
        unique_ids = len({i.get("id") for i in self._individuals})
        return unique_ids / len(self._individuals)

    # ------------------------------------------------------------------
    # Dunder helpers
    # ------------------------------------------------------------------

    def __len__(self) -> int:
        return len(self._individuals)

    def __repr__(self) -> str:
        best_fitness = self._individuals[0]["fitness"] if self._individuals else "N/A"
        return (
            f"PopulationManager(size={len(self._individuals)}/{self.max_size}, "
            f"best_fitness={best_fitness})"
        )

    # ------------------------------------------------------------------
    # Internal
    # ------------------------------------------------------------------

    def _sort(self) -> None:
        """Sort individuals in-place by fitness, descending."""
        self._individuals.sort(key=lambda i: i.get("fitness", float("-inf")), reverse=True)
