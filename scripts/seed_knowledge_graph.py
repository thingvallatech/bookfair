#!/usr/bin/env python3
"""Load seed data into PostgreSQL and Neo4j knowledge graph."""

import asyncio
import json
import sys
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from app.config import settings
from app.database import async_session, engine, Base
from app.models.mechanism import BioMechanism
from app.models.problem import CSProblem
from app.services.knowledge_graph import KnowledgeGraphService

DATA_DIR = Path(__file__).parent.parent / "data"


async def seed_mechanisms(session, kg: KnowledgeGraphService):
    """Load biological mechanisms from seed data."""
    mechanisms_file = DATA_DIR / "seed_mechanisms" / "mechanisms.json"
    if not mechanisms_file.exists():
        print(f"Seed file not found: {mechanisms_file}")
        return 0

    with open(mechanisms_file) as f:
        mechanisms = json.load(f)

    count = 0
    for mech_data in mechanisms:
        # Save to PostgreSQL
        mechanism = BioMechanism(**mech_data)
        session.add(mechanism)

        # Save to Neo4j
        await kg.create_mechanism_node(mech_data)
        count += 1

    await session.commit()
    print(f"Loaded {count} biological mechanisms")
    return count


async def seed_problems(session, kg: KnowledgeGraphService):
    """Load CS problems from seed data."""
    problems_file = DATA_DIR / "seed_problems" / "problems.json"
    if not problems_file.exists():
        print(f"Seed file not found: {problems_file}")
        return 0

    with open(problems_file) as f:
        problems = json.load(f)

    count = 0
    for problem_data in problems:
        problem = CSProblem(**problem_data)
        session.add(problem)

        await kg.create_problem_node(problem_data)
        count += 1

    await session.commit()
    print(f"Loaded {count} CS problems")
    return count


async def main():
    print("BioSpark Knowledge Graph Seeder")
    print("=" * 40)

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created")

    # Connect to Neo4j
    kg = KnowledgeGraphService(
        uri=settings.neo4j_uri,
        user=settings.neo4j_user,
        password=settings.neo4j_password,
    )

    try:
        async with async_session() as session:
            mech_count = await seed_mechanisms(session, kg)
            prob_count = await seed_problems(session, kg)

        print(f"\nSeeding complete: {mech_count} mechanisms, {prob_count} problems")

        # Print graph overview
        overview = await kg.get_graph_overview()
        print(f"Knowledge graph: {overview}")

    finally:
        await kg.close()


if __name__ == "__main__":
    asyncio.run(main())
