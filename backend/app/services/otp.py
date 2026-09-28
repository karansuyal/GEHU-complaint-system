import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.email_otp import EmailOTP

PURPOSE_VERIFY = "verify"
PURPOSE_RESET = "reset"


def _now() -> datetime:
    # DB stores naive UTC datetimes (SQLite drops tzinfo), so compare naive.
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _hash(email: str, purpose: str, code: str) -> str:
    msg = f"{email.lower()}:{purpose}:{code}".encode()
    return hmac.new(settings.SECRET_KEY.encode(), msg, hashlib.sha256).hexdigest()


def create_otp(db: Session, email: str, purpose: str) -> str | None:
    """Creates a fresh 6-digit code, replacing any earlier one for the same
    (email, purpose). Returns the plaintext code to email out, or None if a
    code was issued less than the resend cooldown ago (anti-spam)."""
    email = email.lower()
    existing = (
        db.query(EmailOTP).filter(EmailOTP.email == email, EmailOTP.purpose == purpose).first()
    )
    if existing and existing.created_at:
        created = existing.created_at.replace(tzinfo=None)
        if (_now() - created).total_seconds() < settings.OTP_RESEND_COOLDOWN_SECONDS:
            return None
    if existing:
        db.delete(existing)
        db.flush()

    code = f"{secrets.randbelow(1_000_000):06d}"
    db.add(
        EmailOTP(
            email=email,
            purpose=purpose,
            code_hash=_hash(email, purpose, code),
            expires_at=_now() + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
            created_at=_now(),
        )
    )
    db.commit()
    return code


class OTPError(Exception):
    def __init__(self, detail: str, status_code: int = 400):
        self.detail = detail
        self.status_code = status_code


def check_otp(db: Session, email: str, purpose: str, code: str) -> None:
    """Validates and consumes a code. Raises OTPError on any failure."""
    email = email.lower()
    row = db.query(EmailOTP).filter(EmailOTP.email == email, EmailOTP.purpose == purpose).first()
    if not row or row.expires_at < _now():
        if row:
            db.delete(row)
            db.commit()
        raise OTPError("Invalid or expired code")

    if row.attempts >= settings.OTP_MAX_ATTEMPTS:
        db.delete(row)
        db.commit()
        raise OTPError("Too many wrong attempts. Please request a new code.", 429)

    if not hmac.compare_digest(row.code_hash, _hash(email, purpose, code.strip())):
        row.attempts += 1
        db.commit()
        raise OTPError("Invalid or expired code")

    db.delete(row)
    db.commit()
