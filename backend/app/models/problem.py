import uuid
from datetime import datetime

from pydantic import BaseModel, Field
from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CSProblem(Base):
    """SQLAlchemy model for computational problems."""

    __tablename__ = "cs_problems"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    key_challenges: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    mathematical_properties: Mapped[str] = mapped_column(Text, nullable=True)
    existing_bio_inspired: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, default=list
    )
    benchmark_suite: Mapped[str] = mapped_column(String(256), nullable=True)
    evaluation_metrics: Mapped[list[str]] = mapped_column(
        ARRAY(String), nullable=False, default=list
    )
    state_of_art_baseline: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class CSProblemCreate(BaseModel):
    """Schema for creating a CS problem."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str
    category: str
    description: str
    key_challenges: list[str] = []
    mathematical_properties: str | None = None
    existing_bio_inspired: list[str] = []
    benchmark_suite: str | None = None
    evaluation_metrics: list[str] = []
    state_of_art_baseline: str | None = None


class CSProblemRead(BaseModel):
    """Schema for reading a CS problem."""

    id: str
    name: str
    category: str
    description: str
    key_challenges: list[str]
    mathematical_properties: str | None
    existing_bio_inspired: list[str]
    benchmark_suite: str | None
    evaluation_metrics: list[str]
    state_of_art_baseline: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
