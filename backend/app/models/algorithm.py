import uuid
from datetime import datetime

from pydantic import BaseModel, Field
from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Algorithm(Base):
    """SQLAlchemy model for generated algorithms."""

    __tablename__ = "algorithms"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    analogy_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("analogies.id"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(Text, nullable=False)
    explanation: Mapped[str] = mapped_column(Text, nullable=True)
    generation: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    fitness_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    parent_id: Mapped[str | None] = mapped_column(
        String(64), ForeignKey("algorithms.id"), nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="generated", index=True
    )  # generated, reviewed, accepted, rejected, benchmarked
    critic_review: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    analogy = relationship("Analogy", lazy="selectin")
    parent = relationship("Algorithm", remote_side="Algorithm.id", lazy="selectin")


class AlgorithmCreate(BaseModel):
    """Schema for creating an algorithm."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str
    analogy_id: str
    code: str
    explanation: str | None = None
    generation: int = 0
    fitness_score: float | None = None
    parent_id: str | None = None
    status: str = "generated"
    critic_review: str | None = None


class AlgorithmRead(BaseModel):
    """Schema for reading an algorithm."""

    id: str
    name: str
    analogy_id: str
    code: str
    explanation: str | None
    generation: int
    fitness_score: float | None
    parent_id: str | None
    status: str
    critic_review: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
