from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models.discovery import DiscoveryRun, DiscoveryRunCreate, DiscoveryRunRead

router = APIRouter()


@router.post("/run", response_model=DiscoveryRunRead, status_code=201)
async def create_and_launch_run(
    payload: DiscoveryRunCreate,
    db: AsyncSession = Depends(get_db),
) -> DiscoveryRun:
    """Create and launch a discovery run (creates record; execution pending)."""
    run = DiscoveryRun(**payload.model_dump())
    db.add(run)
    await db.commit()
    await db.refresh(run)
    return run


@router.get("/runs", response_model=list[DiscoveryRunRead])
async def list_runs(db: AsyncSession = Depends(get_db)) -> list[DiscoveryRun]:
    stmt = select(DiscoveryRun)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/runs/{id}", response_model=DiscoveryRunRead)
async def get_run_status(id: str, db: AsyncSession = Depends(get_db)) -> DiscoveryRun:
    stmt = select(DiscoveryRun).where(DiscoveryRun.id == id)
    result = await db.execute(stmt)
    run = result.scalars().first()
    if run is None:
        raise HTTPException(status_code=404, detail="DiscoveryRun not found")
    return run
