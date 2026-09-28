import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, DateTime, Integer

from app.db.database import Base


class EmailOTP(Base):
    """A one-time code emailed to prove ownership of an address.

    purpose is "verify" (finish signup) or "reset" (forgot password). Only a
    keyed hash of the code is stored, never the code itself, and there is at
    most one live row per (email, purpose).
    """

    __tablename__ = "email_otps"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, nullable=False, index=True)
    purpose = Column(String, nullable=False)
    code_hash = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)
    attempts = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
