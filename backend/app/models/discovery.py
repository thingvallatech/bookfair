import uuid
from datetime import datetime

from pydantic import BaseModel, Field
from sqlalchemy import DateTime, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class DiscoveryRun(Base):
    """SQLAlchemy model for discovery pipeline runs."""

    __tablename__ = "discovery_runs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="pending", index=True
    )  # pending, running, completed, failed
    bio_domains: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    target_problem_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
    population_size: Mapped[int] = mapped_column(Integer, nullable=False, default=10)
    generations: Mapped[int] = mapped_column(Integer, nullable=False, default=50)
    current_generation: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    analogies_found: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    algorithms_generated: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    best_fitness: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    config_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class DiscoveryRunCreate(BaseModel):
    """Schema for creating a discovery run."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    bio_domains: list[str] = []
    target_problem_id: str | None = None
    population_size: int = 10
    generations: int = 50


class DiscoveryRunRead(BaseModel):
    """Schema for reading a discovery run."""

    id: str
    status: str
    bio_domains: list[str]
    target_problem_id: str | None
    population_size: int
    generations: int
    current_generation: int
    analogies_found: int
    algorithms_generated: int
    best_fitness: str | None
    error_message: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
