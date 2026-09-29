from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.deps import get_current_user
from app.core.config import settings
from app.models.user import User
from app.models.notification import Notification
from app.models.push_subscription import PushSubscription
from app.schemas.notification import (
    NotificationOut,
    UnreadCountOut,
    PushSubscriptionCreate,
    PushSubscriptionDelete,
    VapidKeyOut,
)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
def list_notifications(
    limit: int = Query(30, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .limit(limit)
        .all()
    )


@router.get("/unread-count", response_model=UnreadCountOut)
def unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)  # noqa: E712
        .count()
    )
    return {"count": count}


@router.post("/{notification_id}/read", response_model=NotificationOut)
def mark_read(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    notification = (
        db.query(Notification)
        .filter(Notification.id == notification_id, Notification.user_id == current_user.id)
        .first()
    )
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


@router.post("/read-all")
def mark_all_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id, Notification.is_read == False)  # noqa: E712
        .update({"is_read": True})
    )
    db.commit()
    return {"status": "ok"}


@router.get("/push/vapid-public-key", response_model=VapidKeyOut)
def vapid_public_key():
    return {"public_key": settings.VAPID_PUBLIC_KEY, "enabled": bool(settings.VAPID_PUBLIC_KEY)}


@router.post("/push/subscribe")
def subscribe(
    payload: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    existing = (
        db.query(PushSubscription)
        .filter(PushSubscription.endpoint == payload.endpoint)
        .first()
    )
    if existing:
        existing.user_id = current_user.id
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
    else:
        db.add(
            PushSubscription(
                user_id=current_user.id,
                endpoint=payload.endpoint,
                p256dh=payload.keys.p256dh,
                auth=payload.keys.auth,
            )
        )
    db.commit()
    return {"status": "subscribed"}


@router.post("/push/unsubscribe")
def unsubscribe(
    payload: PushSubscriptionDelete,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    (
        db.query(PushSubscription)
        .filter(
            PushSubscription.endpoint == payload.endpoint,
            PushSubscription.user_id == current_user.id,
        )
        .delete()
    )
    db.commit()
    return {"status": "unsubscribed"}
