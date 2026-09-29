import enum
import uuid
import random
import string
from datetime import datetime, timedelta, timezone

from sqlalchemy import Column, String, DateTime, Enum, Boolean, ForeignKey, Text, Integer, text
from sqlalchemy.orm import relationship

from app.core.config import settings
from app.db.database import Base
from app.models.user import ComplaintCategory


class ComplaintStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    resolved = "resolved"
    escalated = "escalated"


def generate_ticket_id() -> str:
    suffix = "".join(random.choices(string.digits, k=5))
    return f"GEHU-{suffix}"


class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    ticket_id = Column(String, unique=True, nullable=False, default=generate_ticket_id)

    # The actual submitter is ALWAYS stored, even for anonymous/ragging
    # complaints — this is for admin accountability/audit only.
    # is_anonymous controls what other roles (esp. warden) get to see;
    # it does not delete the link to who filed it.
    student_id = Column(String, ForeignKey("users.id"), nullable=False)
    student = relationship("User", back_populates="complaints", foreign_keys=[student_id])

    campus = Column(String, nullable=False, default="bhimtal")
    category = Column(Enum(ComplaintCategory), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    location = Column(String, nullable=False)
    photo_url = Column(String, nullable=True)

    is_anonymous = Column(Boolean, default=False)
    status = Column(Enum(ComplaintStatus), default=ComplaintStatus.pending)

    # NULL for ragging/admin-routed complaints — no warden is ever assigned.
    assigned_warden_id = Column(String, ForeignKey("users.id"), nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    escalated_at = Column(DateTime, nullable=True)

    # ---- Resolution feedback + reopen ----
    resolved_at = Column(DateTime, nullable=True)
    rating = Column(Integer, nullable=True)  # 1-5, set by the filer after resolution
    feedback_text = Column(Text, nullable=True)
    rated_at = Column(DateTime, nullable=True)
    reopened_count = Column(Integer, nullable=False, default=0, server_default=text("0"))
    reopened_at = Column(DateTime, nullable=True)  # restarts the SLA clock
    reopen_reason = Column(Text, nullable=True)

    assigned_warden = relationship("User", foreign_keys=[assigned_warden_id])

    status_history = relationship(
        "StatusHistory", back_populates="complaint", cascade="all, delete-orphan"
    )
    comments = relationship("Comment", back_populates="complaint", cascade="all, delete-orphan")

    @property
    def reopen_deadline(self) -> datetime | None:
        """Until when the student may still reopen this complaint (None unless
        it is currently resolved)."""
        if self.status != ComplaintStatus.resolved:
            return None
        base = self.resolved_at or self.updated_at or self.created_at
        return base + timedelta(days=settings.REOPEN_WINDOW_DAYS)

    @property
    def sla_deadline(self) -> datetime | None:
        """When this complaint escalates if nobody acts (None once resolved or
        escalated). Mirrors the rule in services/escalation.py so the UI can
        show a countdown."""
        if self.status not in (ComplaintStatus.pending, ComplaintStatus.in_progress):
            return None
        hours = (
            settings.RAGGING_ESCALATION_SLA_HOURS
            if self.category == ComplaintCategory.ragging
            else settings.ESCALATION_SLA_HOURS
        )
        return (self.reopened_at or self.created_at) + timedelta(hours=hours)

    @property
    def assigned_warden_name(self) -> str | None:
        return self.assigned_warden.name if self.assigned_warden else None
