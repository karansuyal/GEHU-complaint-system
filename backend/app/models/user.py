import enum
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Enum, Boolean, true
from sqlalchemy.orm import relationship

from app.db.database import Base


class UserRole(str, enum.Enum):
    student = "student"
    warden = "warden"
    admin = "admin"


class ComplaintCategory(str, enum.Enum):
    maintenance = "maintenance"
    mess = "mess"
    wifi = "wifi"
    cleanliness = "cleanliness"
    security = "security"
    ragging = "ragging"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.student)
    campus = Column(String, nullable=False, default="bhimtal")

    # student-only fields
    enrollment_no = Column(String, nullable=True)
    hostel_block = Column(String, nullable=True)

    # warden-only field: which category queue they handle
    # (e.g. a warden handling 'maintenance' only sees maintenance complaints).
    # Wardens NEVER get assigned 'ragging' — that's enforced in the CRUD layer,
    # not just by convention, so it can't be misconfigured via this field.
    handles_category = Column(Enum(ComplaintCategory), nullable=True)

    # Email ownership proven via OTP. Staff created by an admin are verified
    # from the start. server_default=true so accounts that existed before this
    # column was added keep working after the migration.
    is_verified = Column(Boolean, nullable=False, default=False, server_default=true())
    # Admins can deactivate a staff account instead of deleting it (keeps the
    # audit trail: status history and comments still point at the user).
    is_active = Column(Boolean, nullable=False, default=True, server_default=true())

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Bumped by POST /presence/heartbeat while the user has the app open.
    # Used to compute "N wardens/admins online now" — no session/socket
    # tracking needed, just a recency check against this timestamp.
    last_seen = Column(DateTime, nullable=True)

    complaints = relationship(
        "Complaint", back_populates="student", foreign_keys="Complaint.student_id"
    )
