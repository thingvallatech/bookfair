from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.analogy import Analogy, AnalogyCreate, AnalogyRead

router = APIRouter()


@router.get("/", response_model=list[AnalogyRead])
async def list_analogies(
    status: str | None = None,
    min_novelty: float | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[Analogy]:
    stmt = select(Analogy)
    if status is not None:
        stmt = stmt.where(Analogy.status == status)
    if min_novelty is not None:
        stmt = stmt.where(Analogy.novelty_score >= min_novelty)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{id}", response_model=AnalogyRead)
async def get_analogy(id: str, db: AsyncSession = Depends(get_db)) -> Analogy:
    stmt = select(Analogy).where(Analogy.id == id)
    result = await db.execute(stmt)
    analogy = result.scalars().first()
    if analogy is None:
        raise HTTPException(status_code=404, detail="Analogy not found")
    return analogy


@router.post("/", response_model=AnalogyRead, status_code=201)
async def create_analogy(
    payload: AnalogyCreate,
    db: AsyncSession = Depends(get_db),
) -> Analogy:
    analogy = Analogy(**payload.model_dump())
    db.add(analogy)
    await db.commit()
    await db.refresh(analogy)
    return analogy
