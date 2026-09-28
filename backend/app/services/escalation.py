from datetime import datetime, timedelta, timezone

from app.core.config import settings
from app.db.database import SessionLocal
from app.models.complaint import Complaint, ComplaintStatus
from app.models.user import User, UserRole, ComplaintCategory
from app.models.status_history import StatusHistory
from app.models.notification import NotificationType
from app.services.notifications import notify_user


def run_escalation_check():
    """Escalates any complaint that's been sitting in 'pending' or
    'in_progress' longer than its category's SLA. Ragging complaints get a
    much shorter SLA since they're safety-critical and admin-routed already."""
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        open_complaints = (
            db.query(Complaint)
            .filter(Complaint.status.in_([ComplaintStatus.pending, ComplaintStatus.in_progress]))
            .all()
        )

        for c in open_complaints:
            sla_hours = (
                settings.RAGGING_ESCALATION_SLA_HOURS
                if c.category == ComplaintCategory.ragging
                else settings.ESCALATION_SLA_HOURS
            )
            # A reopened complaint gets a fresh SLA window from when it was reopened.
            sla_start = (c.reopened_at or c.created_at).replace(tzinfo=timezone.utc)
            deadline = sla_start + timedelta(hours=sla_hours)
            if now >= deadline:
                c.status = ComplaintStatus.escalated
                c.escalated_at = now
                db.add(
                    StatusHistory(
                        complaint_id=c.id,
                        status=ComplaintStatus.escalated,
                        changed_by_id=None,  # system-triggered, not a person
                    )
                )
                db.commit()

                # Notify whoever should act on it: the assigned warden, or
                # every campus admin for ragging/unassigned complaints.
                if c.assigned_warden_id:
                    recipients = (
                        db.query(User).filter(User.id == c.assigned_warden_id).all()
                    )
                else:
                    recipients = (
                        db.query(User)
                        .filter(User.role == UserRole.admin, User.campus == c.campus)
                        .all()
                    )
                for recipient in recipients:
                    notify_user(
                        db,
                        recipient,
                        NotificationType.escalation,
                        f"Complaint #{c.ticket_id} escalated",
                        f"SLA breached — {c.title}",
                        complaint_id=c.id,
                    )
    finally:
        db.close()
