import uuid
from datetime import datetime

from pydantic import BaseModel, Field
from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class BioMechanism(Base):
    """SQLAlchemy model for biological mechanisms."""

    __tablename__ = "bio_mechanisms"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    organism: Mapped[str] = mapped_column(String(256), nullable=False)
    domain: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    information_flow: Mapped[str] = mapped_column(Text, nullable=False)
    feedback_type: Mapped[str] = mapped_column(String(32), nullable=False)
    key_properties: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    mathematical_abstraction: Mapped[str] = mapped_column(Text, nullable=True)
    scale: Mapped[str] = mapped_column(String(64), nullable=False)
    inputs: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    outputs: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    convergence_behavior: Mapped[str] = mapped_column(Text, nullable=True)
    robustness: Mapped[str] = mapped_column(Text, nullable=True)
    source_papers: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=False, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class BioMechanismCreate(BaseModel):
    """Schema for creating a biological mechanism."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    name: str
    organism: str
    domain: str
    description: str
    information_flow: str
    feedback_type: str = Field(pattern=r"^(positive|negative|both)$")
    key_properties: list[str] = []
    mathematical_abstraction: str | None = None
    scale: str
    inputs: list[str] = []
    outputs: list[str] = []
    convergence_behavior: str | None = None
    robustness: str | None = None
    source_papers: list[str] = []


class BioMechanismRead(BaseModel):
    """Schema for reading a biological mechanism."""

    id: str
    name: str
    organism: str
    domain: str
    description: str
    information_flow: str
    feedback_type: str
    key_properties: list[str]
    mathematical_abstraction: str | None
    scale: str
    inputs: list[str]
    outputs: list[str]
    convergence_behavior: str | None
    robustness: str | None
    source_papers: list[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
