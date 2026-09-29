import json
import logging

from sqlalchemy.orm import Session
from pywebpush import webpush, WebPushException

from app.core.config import settings
from app.models.complaint import Complaint
from app.models.user import ComplaintCategory
from app.services.email import email_enabled, send_email_async
from app.services.email_templates import notification_email
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


def _email_copy(
    db: Session,
    user: User,
    type: NotificationType,
    title: str,
    body: str,
    complaint_id: str | None,
) -> None:
    """Also emails the notification (async, never blocks or raises). Skipped
    when no real provider is configured or the type is switched off."""
    try:
        if not (settings.EMAIL_NOTIFICATIONS_ENABLED and email_enabled()):
            return
        if type.value not in settings.email_notify_types or not user.email or not user.is_active:
            return
        # Ragging details never travel by email: point staff at the portal instead.
        if complaint_id:
            complaint = db.get(Complaint, complaint_id)
            if complaint and complaint.category == ComplaintCategory.ragging:
                body = "A sensitive complaint needs your attention. Open the portal to view it."
        path = f"/complaints/{complaint_id}" if complaint_id else "/"
        subject, text, html = notification_email(user.name, title, body, path)
        send_email_async(user.email, subject, text, html)
    except Exception:  # noqa: BLE001
        logger.exception("Could not queue notification email for user %s", user.id)


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

    _email_copy(db, user, type, title, body, complaint_id)

    subscriptions = db.query(PushSubscription).filter(PushSubscription.user_id == user.id).all()
    url = f"/complaints/{complaint_id}" if complaint_id else "/"
    for sub in subscriptions:
        _send_push(db, sub, title, body, url)

    return notification
