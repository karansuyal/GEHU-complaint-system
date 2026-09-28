from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.user import User
from app.schemas.auth import RegisterRequest


def get_user_by_email(db: Session, email: str) -> User | None:
    # Emails are compared case-insensitively so "A@x.com" and "a@x.com" can't
    # both register.
    return db.query(User).filter(func.lower(User.email) == email.lower()).first()


def create_user(db: Session, payload: RegisterRequest, is_verified: bool = False) -> User:
    user = User(
        name=payload.name,
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        role=payload.role,
        campus=payload.campus,
        enrollment_no=payload.enrollment_no,
        hostel_block=payload.hostel_block,
        handles_category=payload.handles_category,
        is_verified=is_verified,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
