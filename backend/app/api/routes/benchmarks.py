from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.benchmark import BenchmarkResult, BenchmarkResultCreate, BenchmarkResultRead

router = APIRouter()


@router.get("/leaderboard", response_model=list[BenchmarkResultRead])
async def get_leaderboard(
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
) -> list[BenchmarkResult]:
    """Return top algorithms by best_fitness, descending."""
    stmt = (
        select(BenchmarkResult)
        .order_by(BenchmarkResult.best_fitness.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{algorithm_id}", response_model=list[BenchmarkResultRead])
async def get_results_for_algorithm(
    algorithm_id: str,
    db: AsyncSession = Depends(get_db),
) -> list[BenchmarkResult]:
    stmt = select(BenchmarkResult).where(BenchmarkResult.algorithm_id == algorithm_id)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/", response_model=BenchmarkResultRead, status_code=201)
async def create_benchmark_result(
    payload: BenchmarkResultCreate,
    db: AsyncSession = Depends(get_db),
) -> BenchmarkResult:
    benchmark_result = BenchmarkResult(**payload.model_dump())
    db.add(benchmark_result)
    await db.commit()
    await db.refresh(benchmark_result)
    return benchmark_result
