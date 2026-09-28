import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Enum, Boolean, ForeignKey, Text
from sqlalchemy.orm import relationship

from app.db.database import Base


class NotificationType(str, enum.Enum):
    new_complaint = "new_complaint"       # to warden/admin: a complaint was routed to them
    status_change = "status_change"       # to student: their complaint's status changed
    new_comment = "new_comment"           # to the other party: someone commented
    escalation = "escalation"             # to warden/admin: a complaint breached SLA


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    complaint_id = Column(String, ForeignKey("complaints.id"), nullable=True)

    type = Column(Enum(NotificationType), nullable=False)
    title = Column(String, nullable=False)
    body = Column(Text, nullable=False)

    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", foreign_keys=[user_id])
    complaint = relationship("Complaint", foreign_keys=[complaint_id])
