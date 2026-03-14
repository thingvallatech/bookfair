from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.algorithm import Algorithm, AlgorithmCreate, AlgorithmRead

router = APIRouter()


@router.get("/", response_model=list[AlgorithmRead])
async def list_algorithms(
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[Algorithm]:
    stmt = select(Algorithm)
    if status is not None:
        stmt = stmt.where(Algorithm.status == status)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{id}", response_model=AlgorithmRead)
async def get_algorithm(id: str, db: AsyncSession = Depends(get_db)) -> Algorithm:
    stmt = select(Algorithm).where(Algorithm.id == id)
    result = await db.execute(stmt)
    algorithm = result.scalars().first()
    if algorithm is None:
        raise HTTPException(status_code=404, detail="Algorithm not found")
    return algorithm


@router.get("/{id}/lineage", response_model=list[AlgorithmRead])
async def get_algorithm_lineage(
    id: str,
    db: AsyncSession = Depends(get_db),
) -> list[Algorithm]:
    """Return the evolution lineage by walking the parent_id chain."""
    stmt = select(Algorithm).where(Algorithm.id == id)
    result = await db.execute(stmt)
    algorithm = result.scalars().first()
    if algorithm is None:
        raise HTTPException(status_code=404, detail="Algorithm not found")

    lineage: list[Algorithm] = [algorithm]
    current = algorithm

    while current.parent_id is not None:
        stmt = select(Algorithm).where(Algorithm.id == current.parent_id)
        result = await db.execute(stmt)
        parent = result.scalars().first()
        if parent is None:
            break
        lineage.append(parent)
        current = parent

    return lineage


@router.post("/", response_model=AlgorithmRead, status_code=201)
async def create_algorithm(
    payload: AlgorithmCreate,
    db: AsyncSession = Depends(get_db),
) -> Algorithm:
    algorithm = Algorithm(**payload.model_dump())
    db.add(algorithm)
    await db.commit()
    await db.refresh(algorithm)
    return algorithm
