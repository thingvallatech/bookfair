import uuid
from datetime import datetime

from pydantic import BaseModel, Field
from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Analogy(Base):
    """SQLAlchemy model for bio→CS analogies."""

    __tablename__ = "analogies"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    mechanism_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("bio_mechanisms.id"), nullable=False, index=True
    )
    problem_id: Mapped[str] = mapped_column(
        String(64), ForeignKey("cs_problems.id"), nullable=False, index=True
    )
    structural_similarity: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    novelty_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    mapping_explanation: Mapped[str] = mapped_column(Text, nullable=True)
    feasibility_assessment: Mapped[str] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="candidate", index=True
    )  # candidate, accepted, rejected, synthesized
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    mechanism = relationship("BioMechanism", lazy="selectin")
    problem = relationship("CSProblem", lazy="selectin")


class AnalogyCreate(BaseModel):
    """Schema for creating an analogy."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4())[:8])
    mechanism_id: str
    problem_id: str
    structural_similarity: float = Field(ge=0.0, le=1.0)
    novelty_score: float = Field(ge=0.0, le=1.0)
    mapping_explanation: str | None = None
    feasibility_assessment: str | None = None
    status: str = "candidate"


class AnalogyRead(BaseModel):
    """Schema for reading an analogy."""

    id: str
    mechanism_id: str
    problem_id: str
    structural_similarity: float
    novelty_score: float
    mapping_explanation: str | None
    feasibility_assessment: str | None
    status: str
    created_at: datetime
    mechanism: "BioMechanismRead | None" = None
    problem: "CSProblemRead | None" = None

    model_config = {"from_attributes": True}


from app.models.mechanism import BioMechanismRead  # noqa: E402
from app.models.problem import CSProblemRead  # noqa: E402

AnalogyRead.model_rebuild()
