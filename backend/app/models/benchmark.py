import uuid
from datetime import datetime

from pydantic import BaseModel, Field
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class BenchmarkResult(Base):
    """SQLAlchemy model for benchmark results."""

    __tablename__ = "benchmark_results"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    algorithm_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("algorithms.id"), nullable=False, index=True
    )
    benchmark_name: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    problem_instance: Mapped[str] = mapped_column(String(256), nullable=False)
    best_fitness: Mapped[float] = mapped_column(Float, nullable=False)
    mean_fitness: Mapped[float] = mapped_column(Float, nullable=False)
    std_fitness: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    convergence_speed: Mapped[int] = mapped_column(Integer, nullable=True)
    wall_clock_time: Mapped[float] = mapped_column(Float, nullable=True)
    baseline_comparison: Mapped[float | None] = mapped_column(Float, nullable=True)
    num_runs: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    metadata_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    algorithm = relationship("Algorithm", lazy="selectin")


class BenchmarkResultCreate(BaseModel):
    """Schema for creating a benchmark result."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    algorithm_id: str
    benchmark_name: str
    problem_instance: str
    best_fitness: float
    mean_fitness: float
    std_fitness: float = 0.0
    convergence_speed: int | None = None
    wall_clock_time: float | None = None
    baseline_comparison: float | None = None
    num_runs: int = 30
    metadata_json: str | None = None


class BenchmarkResultRead(BaseModel):
    """Schema for reading a benchmark result."""

    id: str
    algorithm_id: str
    benchmark_name: str
    problem_instance: str
    best_fitness: float
    mean_fitness: float
    std_fitness: float
    convergence_speed: int | None
    wall_clock_time: float | None
    baseline_comparison: float | None
    num_runs: int
    metadata_json: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
