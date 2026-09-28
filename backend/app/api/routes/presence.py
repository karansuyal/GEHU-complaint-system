from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.deps import get_current_user
from app.core.config import settings
from app.models.user import User, UserRole

router = APIRouter(prefix="/presence", tags=["presence"])


@router.post("/heartbeat")
def heartbeat(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Pinged periodically by the frontend while the app is open in the
    foreground. Drives the 'N staff online' indicator — no websockets or
    session tracking needed, just a recency check on this timestamp."""
    current_user.last_seen = datetime.now(timezone.utc)
    db.commit()
    return {"status": "ok"}


@router.get("/staff-online")
def staff_online(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Count of wardens/admins on this campus who've pinged /heartbeat
    recently — shown to students as reassurance that someone's watching
    the queue."""
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=settings.PRESENCE_ONLINE_WINDOW_SECONDS)
    count = (
        db.query(User)
        .filter(
            User.campus == current_user.campus,
            User.role.in_([UserRole.warden, UserRole.admin]),
            User.last_seen != None,  # noqa: E711
            User.last_seen >= cutoff,
        )
        .count()
    )
    return {"count": count}
