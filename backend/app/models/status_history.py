import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, ForeignKey, Enum
from sqlalchemy.orm import relationship

from app.db.database import Base
from app.models.complaint import ComplaintStatus


class StatusHistory(Base):
    __tablename__ = "status_history"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint_id = Column(String, ForeignKey("complaints.id"), nullable=False)
    status = Column(Enum(ComplaintStatus), nullable=False)
    changed_by_id = Column(String, ForeignKey("users.id"), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    complaint = relationship("Complaint", back_populates="status_history")
