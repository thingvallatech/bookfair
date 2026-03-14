from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.mechanism import BioMechanism, BioMechanismCreate, BioMechanismRead

router = APIRouter()


@router.get("/", response_model=list[BioMechanismRead])
async def list_mechanisms(
    domain: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[BioMechanism]:
    stmt = select(BioMechanism)
    if domain is not None:
        stmt = stmt.where(BioMechanism.domain == domain)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/{id}", response_model=BioMechanismRead)
async def get_mechanism(id: str, db: AsyncSession = Depends(get_db)) -> BioMechanism:
    stmt = select(BioMechanism).where(BioMechanism.id == id)
    result = await db.execute(stmt)
    mechanism = result.scalars().first()
    if mechanism is None:
        raise HTTPException(status_code=404, detail="BioMechanism not found")
    return mechanism


@router.post("/", response_model=BioMechanismRead, status_code=201)
async def create_mechanism(
    payload: BioMechanismCreate,
    db: AsyncSession = Depends(get_db),
) -> BioMechanism:
    mechanism = BioMechanism(**payload.model_dump())
    db.add(mechanism)
    await db.commit()
    await db.refresh(mechanism)
    return mechanism
