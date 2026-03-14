"""Basic tests for Pydantic model validation."""

import pytest
from app.models.mechanism import BioMechanismCreate
from app.models.problem import CSProblemCreate
from app.models.analogy import AnalogyCreate
from app.models.algorithm import AlgorithmCreate
from app.models.benchmark import BenchmarkResultCreate
from app.models.discovery import DiscoveryRunCreate


def test_mechanism_create():
    mech = BioMechanismCreate(
        name="Test Mechanism",
        organism="Test Organism",
        domain="microbiology",
        description="A test mechanism",
        information_flow="Chemical signals propagate through population",
        feedback_type="positive",
        key_properties=["decentralized", "threshold-based"],
        scale="colony",
        inputs=["chemical_signal"],
        outputs=["collective_behavior"],
    )
    assert mech.name == "Test Mechanism"
    assert mech.feedback_type == "positive"
    assert len(mech.id) == 8


def test_mechanism_invalid_feedback_type():
    with pytest.raises(Exception):
        BioMechanismCreate(
            name="Test",
            organism="Test",
            domain="test",
            description="test",
            information_flow="test",
            feedback_type="invalid",
            scale="colony",
        )


def test_problem_create():
    problem = CSProblemCreate(
        name="Network Routing",
        category="routing",
        description="Find optimal paths in networks",
        key_challenges=["NP-hard", "dynamic topology"],
        evaluation_metrics=["path_length", "convergence_time"],
    )
    assert problem.name == "Network Routing"
    assert len(problem.id) == 8


def test_analogy_create():
    analogy = AnalogyCreate(
        mechanism_id="mech-1",
        problem_id="prob-1",
        structural_similarity=0.8,
        novelty_score=0.9,
    )
    assert analogy.structural_similarity == 0.8
    assert analogy.status == "candidate"


def test_analogy_score_bounds():
    with pytest.raises(Exception):
        AnalogyCreate(
            mechanism_id="m1",
            problem_id="p1",
            structural_similarity=1.5,
            novelty_score=0.5,
        )


def test_algorithm_create():
    algo = AlgorithmCreate(
        name="Quorum Optimizer",
        analogy_id="ana-1",
        code="class QuorumOptimizer: pass",
    )
    assert algo.generation == 0
    assert algo.status == "generated"


def test_benchmark_result_create():
    result = BenchmarkResultCreate(
        algorithm_id="algo-1",
        benchmark_name="TSP",
        problem_instance="berlin52",
        best_fitness=7544.0,
        mean_fitness=7890.0,
        std_fitness=150.0,
    )
    assert result.num_runs == 30


def test_discovery_run_create():
    run = DiscoveryRunCreate(
        bio_domains=["microbiology", "mycology"],
        population_size=20,
        generations=100,
    )
    assert run.population_size == 20
