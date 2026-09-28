import json
import logging

from sqlalchemy.orm import Session
from pywebpush import webpush, WebPushException

from app.core.config import settings
from app.models.notification import Notification, NotificationType
from app.models.push_subscription import PushSubscription
from app.models.user import User

logger = logging.getLogger(__name__)

_push_configured = bool(settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY)


def _send_push(db: Session, subscription: PushSubscription, title: str, body: str, url: str = "/"):
    """Best-effort push send. Never raises — a dead/expired subscription
    is deleted so it stops being retried on future notifications, but any
    other failure is just logged. In-app notifications (the DB row) always
    succeed independently of whether push delivery works."""
    if not _push_configured:
        return
    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
            },
            data=json.dumps({"title": title, "body": body, "url": url}),
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": f"mailto:{settings.VAPID_CLAIM_EMAIL}"},
        )
    except WebPushException as exc:
        status_code = getattr(exc.response, "status_code", None)
        if status_code in (404, 410):
            # Subscription expired or was revoked by the browser — remove it
            # so we don't keep failing on it every time.
            db.delete(subscription)
            db.commit()
        else:
            logger.warning("Push send failed: %s", exc)


def notify_user(
    db: Session,
    user: User,
    type: NotificationType,
    title: str,
    body: str,
    complaint_id: str | None = None,
) -> Notification:
    """Creates the in-app notification row and fans it out to every push
    subscription the user has registered (their phone, laptop, etc)."""
    notification = Notification(
        user_id=user.id,
        complaint_id=complaint_id,
        type=type,
        title=title,
        body=body,
    )
    db.add(notification)
    db.commit()
    db.refresh(notification)

    subscriptions = db.query(PushSubscription).filter(PushSubscription.user_id == user.id).all()
    url = f"/complaints/{complaint_id}" if complaint_id else "/"
    for sub in subscriptions:
        _send_push(db, sub, title, body, url)

    return notification
