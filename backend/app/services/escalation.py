import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import and_, func, or_, update

from app.core.config import settings
from app.db.database import SessionLocal
from app.models.complaint import Complaint, ComplaintStatus
from app.models.notification import NotificationType
from app.models.status_history import StatusHistory
from app.models.user import ComplaintCategory, User, UserRole
from app.services.notifications import notify_user

logger = logging.getLogger(__name__)

_OPEN = (ComplaintStatus.pending, ComplaintStatus.in_progress)


def run_escalation_check():
    """Escalates any complaint that's been sitting in 'pending' or
    'in_progress' longer than its category's SLA. Ragging complaints get a
    much shorter SLA since they're safety-critical and admin-routed already.

    Overdue complaints are selected in SQL (not by loading every open complaint
    into memory), and each one is claimed with a conditional UPDATE. If two
    workers run this at the same time only one wins the claim, so nobody gets a
    duplicate escalation record or notification.
    """
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        now_naive = now.replace(tzinfo=None)  # DB stores naive UTC
        # A reopened complaint gets a fresh SLA window from when it was reopened.
        sla_start = func.coalesce(Complaint.reopened_at, Complaint.created_at)
        ragging_cutoff = now_naive - timedelta(hours=settings.RAGGING_ESCALATION_SLA_HOURS)
        default_cutoff = now_naive - timedelta(hours=settings.ESCALATION_SLA_HOURS)

        overdue = (
            db.query(Complaint)
            .filter(
                Complaint.status.in_(_OPEN),
                or_(
                    and_(Complaint.category == ComplaintCategory.ragging, sla_start <= ragging_cutoff),
                    and_(Complaint.category != ComplaintCategory.ragging, sla_start <= default_cutoff),
                ),
            )
            .all()
        )

        for c in overdue:
            claimed = db.execute(
                update(Complaint)
                .where(Complaint.id == c.id, Complaint.status.in_(_OPEN))
                .values(status=ComplaintStatus.escalated, escalated_at=now)
                .execution_options(synchronize_session=False)
            )
            if claimed.rowcount != 1:
                db.rollback()  # someone else escalated or resolved it first
                continue
            db.add(
                StatusHistory(
                    complaint_id=c.id,
                    status=ComplaintStatus.escalated,
                    changed_by_id=None,  # system-triggered, not a person
                )
            )
            db.commit()
            db.refresh(c)

            # Notify whoever should act on it: the assigned warden, or
            # every campus admin for ragging/unassigned complaints.
            if c.assigned_warden_id:
                recipients = db.query(User).filter(User.id == c.assigned_warden_id).all()
            else:
                recipients = (
                    db.query(User)
                    .filter(User.role == UserRole.admin, User.campus == c.campus)
                    .all()
                )
            for recipient in recipients:
                try:
                    notify_user(
                        db,
                        recipient,
                        NotificationType.escalation,
                        f"Complaint #{c.ticket_id} escalated",
                        f"SLA breached - {c.title}",
                        complaint_id=c.id,
                    )
                except Exception:
                    logger.exception("Could not notify %s about escalated complaint %s", recipient.id, c.id)
    finally:
        db.close()
