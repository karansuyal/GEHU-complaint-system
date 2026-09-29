import math
from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from app.models.complaint import Complaint, ComplaintStatus, generate_ticket_id
from app.models.status_history import StatusHistory
from app.models.user import User, UserRole, ComplaintCategory
from app.models.notification import NotificationType
from app.services.email import email_enabled, send_email_async
from app.services.email_templates import complaint_received_email
from app.services.notifications import notify_user


def _with_relations(query):
    return query.options(joinedload(Complaint.status_history), joinedload(Complaint.comments))


def create_complaint(
    db: Session,
    student: User,
    category: ComplaintCategory,
    title: str,
    description: str,
    location: str,
    is_anonymous: bool,
    photo_url: str | None,
) -> Complaint:
    # RAGGING RULE (hard-enforced here, not just in the frontend):
    # - always anonymous, regardless of what was passed in
    # - never assigned to a warden — assigned_warden_id stays NULL forever
    #   for this category, so it can only ever surface in admin queries.
    force_anonymous = is_anonymous or category == ComplaintCategory.ragging
    assigned_warden_id = None

    if category != ComplaintCategory.ragging:
        warden = (
            db.query(User)
            .filter(
                User.role == UserRole.warden,
                User.is_active == True,  # noqa: E712
                User.campus == student.campus,
                User.handles_category == category,
            )
            .first()
        )
        if warden:
            assigned_warden_id = warden.id

    student_id, campus = student.id, student.campus
    complaint = None
    # ticket_id is UNIQUE. Collisions are astronomically unlikely with 8 random
    # characters, but never surface one to the student as a 500: just retry.
    for _attempt in range(5):
        candidate = Complaint(
            ticket_id=generate_ticket_id(),
            student_id=student_id,
            campus=campus,
            category=category,
            title=title,
            description=description,
            location=location,
            photo_url=photo_url,
            is_anonymous=force_anonymous,
            status=ComplaintStatus.pending,
            assigned_warden_id=assigned_warden_id,
        )
        db.add(candidate)
        try:
            db.flush()
        except IntegrityError:
            db.rollback()
            continue
        complaint = candidate
        break
    if complaint is None:
        raise HTTPException(status_code=503, detail="Could not create a ticket number. Please try again.")

    db.add(
        StatusHistory(
            complaint_id=complaint.id,
            status=ComplaintStatus.pending,
            changed_by_id=student.id,
        )
    )
    db.commit()
    db.refresh(complaint)

    # Receipt for the student. Anonymous / ragging complaints get a generic
    # one (no title, no category) in case the inbox is shared.
    if email_enabled() and student.email:
        subject, text, html = complaint_received_email(
            student.name, complaint.ticket_id, complaint.title, complaint.id, private=force_anonymous
        )
        send_email_async(student.email, subject, text, html)

    # Notify whoever now owns this complaint: the matched warden, or every
    # campus admin when it's ragging / nobody covers that category yet.
    if assigned_warden_id:
        warden = db.query(User).filter(User.id == assigned_warden_id).first()
        if warden:
            notify_user(
                db,
                warden,
                NotificationType.new_complaint,
                "New complaint assigned",
                f"#{complaint.ticket_id} · {complaint.title}",
                complaint_id=complaint.id,
            )
    else:
        admins = (
            db.query(User)
            .filter(User.role == UserRole.admin, User.campus == student.campus)
            .all()
        )
        label = "Ragging complaint filed" if category == ComplaintCategory.ragging else "New complaint filed"
        for admin in admins:
            notify_user(
                db,
                admin,
                NotificationType.new_complaint,
                label,
                f"#{complaint.ticket_id} · {complaint.title}",
                complaint_id=complaint.id,
            )

    return complaint


def get_complaint(db: Session, complaint_id: str) -> Complaint | None:
    return _with_relations(db.query(Complaint)).filter(Complaint.id == complaint_id).first()


def list_mine(db: Session, student_id: str):
    return (
        _with_relations(db.query(Complaint))
        .filter(Complaint.student_id == student_id)
        .order_by(Complaint.created_at.desc())
        .all()
    )


def list_assigned_to_warden(db: Session, warden: User):
    # Ragging complaints are structurally excluded here: assigned_warden_id
    # is never set for them, so this query can never return one — a warden
    # cannot see ragging complaints no matter how this is called.
    return (
        _with_relations(db.query(Complaint))
        .filter(Complaint.assigned_warden_id == warden.id)
        .order_by(Complaint.created_at.desc())
        .all()
    )


def list_all_for_admin(db: Session, campus: str, limit: int = 50):
    # Admin sees everything on their campus, including ragging/anonymous —
    # this is the only role allowed to query without a category/warden filter.
    return (
        _with_relations(db.query(Complaint))
        .filter(Complaint.campus == campus)
        .order_by(Complaint.created_at.desc())
        .limit(limit)
        .all()
    )


class InvalidTransition(ValueError):
    """Raised when a status change is not allowed (route turns it into a 400)."""


_S = ComplaintStatus
# What a WARDEN may move a complaint to. `escalated` is set by the SLA job only,
# and a resolved complaint can only come back through the student's "reopen".
WARDEN_TRANSITIONS: dict[ComplaintStatus, set[ComplaintStatus]] = {
    _S.pending: {_S.in_progress, _S.resolved},
    _S.in_progress: {_S.pending, _S.resolved},
    _S.escalated: {_S.pending, _S.in_progress, _S.resolved},
    _S.resolved: set(),
}
# Admins can additionally escalate by hand and re-open a resolved complaint.
ADMIN_TRANSITIONS: dict[ComplaintStatus, set[ComplaintStatus]] = {
    _S.pending: WARDEN_TRANSITIONS[_S.pending] | {_S.escalated},
    _S.in_progress: WARDEN_TRANSITIONS[_S.in_progress] | {_S.escalated},
    _S.escalated: WARDEN_TRANSITIONS[_S.escalated],
    _S.resolved: {_S.in_progress},
}


def allowed_transitions(role: UserRole, current: ComplaintStatus) -> set[ComplaintStatus]:
    table = ADMIN_TRANSITIONS if role == UserRole.admin else WARDEN_TRANSITIONS
    return table.get(current, set())


def update_status(db: Session, complaint: Complaint, new_status: ComplaintStatus, changed_by: User):
    if new_status == complaint.status:
        raise InvalidTransition(f"The complaint is already {new_status.value.replace('_', ' ')}")
    if new_status not in allowed_transitions(changed_by.role, complaint.status):
        raise InvalidTransition(
            f"Cannot change a complaint from {complaint.status.value.replace('_', ' ')} "
            f"to {new_status.value.replace('_', ' ')}"
        )
    was_resolved = complaint.status == ComplaintStatus.resolved
    complaint.status = new_status
    complaint.updated_at = datetime.now(timezone.utc)
    if new_status == ComplaintStatus.escalated:
        complaint.escalated_at = datetime.now(timezone.utc)
    if new_status == ComplaintStatus.resolved and not was_resolved:
        complaint.resolved_at = datetime.now(timezone.utc)
    elif new_status != ComplaintStatus.resolved:
        complaint.resolved_at = None
    db.add(
        StatusHistory(complaint_id=complaint.id, status=new_status, changed_by_id=changed_by.id)
    )
    db.commit()
    db.refresh(complaint)

    student = db.query(User).filter(User.id == complaint.student_id).first()
    if student and student.id != changed_by.id:
        notify_user(
            db,
            student,
            NotificationType.status_change,
            f"Complaint #{complaint.ticket_id} updated",
            f"Status changed to {new_status.value.replace('_', ' ')}",
            complaint_id=complaint.id,
        )

    return complaint


def add_comment(db: Session, complaint: Complaint, author: User, text: str):
    from app.models.comment import Comment

    # For anonymous/ragging complaints, a non-admin author's name is never
    # attached — comments from the filer show as "Student" to protect identity.
    display_name = author.name
    if complaint.is_anonymous and author.id == complaint.student_id:
        display_name = "Student (anonymous)"

    comment = Comment(
        complaint_id=complaint.id, author_id=author.id, author_name=display_name, text=text
    )
    db.add(comment)
    db.commit()
    db.refresh(complaint)

    # Notify "the other side" of the conversation: if the filer commented,
    # tell whoever owns the complaint; if staff commented, tell the filer.
    recipients: list[User] = []
    if author.id == complaint.student_id:
        if complaint.assigned_warden_id:
            warden = db.query(User).filter(User.id == complaint.assigned_warden_id).first()
            if warden:
                recipients.append(warden)
        else:
            recipients = (
                db.query(User)
                .filter(User.role == UserRole.admin, User.campus == complaint.campus)
                .all()
            )
    else:
        student = db.query(User).filter(User.id == complaint.student_id).first()
        if student:
            recipients.append(student)

    for recipient in recipients:
        notify_user(
            db,
            recipient,
            NotificationType.new_comment,
            f"New comment on #{complaint.ticket_id}",
            f"{display_name}: {text[:80]}",
            complaint_id=complaint.id,
        )

    return complaint


# --------------------------------------------------------------------------
# Search / filter / pagination (role-aware)
# --------------------------------------------------------------------------

OPEN_STATUSES = (ComplaintStatus.pending, ComplaintStatus.in_progress, ComplaintStatus.escalated)


def _like_escape(text: str) -> str:
    return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def search_complaints(
    db: Session,
    user: User,
    *,
    q: str | None = None,
    status: ComplaintStatus | None = None,
    category: ComplaintCategory | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    warden_id: str | None = None,
    unassigned: bool = False,
    sort: str = "newest",
    page: int = 1,
    page_size: int = 20,
):
    query = db.query(Complaint).options(joinedload(Complaint.assigned_warden))

    # Visibility first - filters can only ever narrow what the role may see.
    if user.role == UserRole.admin:
        query = query.filter(Complaint.campus == user.campus)
    elif user.role == UserRole.warden:
        query = query.filter(Complaint.assigned_warden_id == user.id)
    else:
        query = query.filter(Complaint.student_id == user.id)

    if q and q.strip():
        pattern = f"%{_like_escape(q.strip())}%"
        query = query.filter(
            or_(
                Complaint.ticket_id.ilike(pattern, escape="\\"),
                Complaint.title.ilike(pattern, escape="\\"),
                Complaint.description.ilike(pattern, escape="\\"),
                Complaint.location.ilike(pattern, escape="\\"),
            )
        )
    if status:
        query = query.filter(Complaint.status == status)
    if category:
        query = query.filter(Complaint.category == category)
    if date_from:
        query = query.filter(Complaint.created_at >= datetime.combine(date_from, datetime.min.time()))
    if date_to:
        query = query.filter(
            Complaint.created_at < datetime.combine(date_to + timedelta(days=1), datetime.min.time())
        )
    if user.role == UserRole.admin:
        if unassigned:
            query = query.filter(Complaint.assigned_warden_id.is_(None))
        elif warden_id:
            query = query.filter(Complaint.assigned_warden_id == warden_id)

    total = query.count()
    order = Complaint.created_at.asc() if sort == "oldest" else Complaint.created_at.desc()
    items = query.order_by(order).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "pages": max(1, math.ceil(total / page_size)),
    }


# --------------------------------------------------------------------------
# Feedback, reopen, assignment
# --------------------------------------------------------------------------


def _owner_recipients(db: Session, complaint: Complaint) -> list[User]:
    """Who currently 'owns' a complaint: its warden, else every campus admin."""
    if complaint.assigned_warden_id:
        warden = db.query(User).filter(User.id == complaint.assigned_warden_id).first()
        if warden and warden.is_active:
            return [warden]
    return (
        db.query(User)
        .filter(User.role == UserRole.admin, User.campus == complaint.campus, User.is_active == True)  # noqa: E712
        .all()
    )


def add_feedback(db: Session, complaint: Complaint, rating: int, comment: str | None) -> Complaint:
    complaint.rating = rating
    complaint.feedback_text = (comment or "").strip() or None
    complaint.rated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(complaint)

    for recipient in _owner_recipients(db, complaint):
        notify_user(
            db,
            recipient,
            NotificationType.new_comment,
            f"Feedback on #{complaint.ticket_id}",
            f"Rated {rating}/5" + (f" - {complaint.feedback_text[:60]}" if complaint.feedback_text else ""),
            complaint_id=complaint.id,
        )
    return complaint


def reopen_complaint(db: Session, complaint: Complaint, student: User, reason: str) -> Complaint:
    from app.models.comment import Comment

    now = datetime.now(timezone.utc)
    complaint.status = ComplaintStatus.pending
    complaint.reopened_count = (complaint.reopened_count or 0) + 1
    complaint.reopened_at = now  # restarts the SLA clock (see services/escalation.py)
    complaint.reopen_reason = reason.strip()
    complaint.resolved_at = None
    complaint.escalated_at = None
    complaint.updated_at = now
    # The earlier rating was for the earlier resolution; they can rate again
    # once it's fixed properly.
    complaint.rating = None
    complaint.feedback_text = None
    complaint.rated_at = None

    db.add(StatusHistory(complaint_id=complaint.id, status=ComplaintStatus.pending, changed_by_id=student.id))
    display_name = "Student (anonymous)" if complaint.is_anonymous else student.name
    db.add(
        Comment(
            complaint_id=complaint.id,
            author_id=student.id,
            author_name=display_name,
            text=f"Reopened - issue not fixed: {reason.strip()}",
        )
    )
    db.commit()
    db.refresh(complaint)

    for recipient in _owner_recipients(db, complaint):
        notify_user(
            db,
            recipient,
            NotificationType.new_complaint,
            f"Complaint #{complaint.ticket_id} reopened",
            reason.strip()[:80],
            complaint_id=complaint.id,
        )
    return complaint


def assign_warden(db: Session, complaint: Complaint, warden: User | None) -> Complaint:
    complaint.assigned_warden_id = warden.id if warden else None
    complaint.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(complaint)
    if warden:
        notify_user(
            db,
            warden,
            NotificationType.new_complaint,
            "Complaint assigned to you",
            f"#{complaint.ticket_id} - {complaint.title}",
            complaint_id=complaint.id,
        )
    return complaint


def reassign_open_complaints(db: Session, warden: User, keep_category: ComplaintCategory | None = None) -> int:
    """Moves a warden's open complaints to another active warden covering the
    same category. Used when a warden is deactivated (keep_category=None moves
    everything) or switched to a different category (moves the ones that no
    longer match). With no replacement available the complaint becomes
    unassigned, which puts it in front of the admins. Returns how many moved."""
    q = db.query(Complaint).filter(
        Complaint.assigned_warden_id == warden.id, Complaint.status.in_(OPEN_STATUSES)
    )
    if keep_category is not None:
        q = q.filter(Complaint.category != keep_category)

    moved = 0
    for c in q.all():
        replacement = (
            db.query(User)
            .filter(
                User.role == UserRole.warden,
                User.is_active == True,  # noqa: E712
                User.campus == c.campus,
                User.handles_category == c.category,
                User.id != warden.id,
            )
            .first()
        )
        c.assigned_warden_id = replacement.id if replacement else None
        c.updated_at = datetime.now(timezone.utc)
        db.commit()
        moved += 1
        if replacement:
            notify_user(
                db, replacement, NotificationType.new_complaint,
                "Complaint assigned to you", f"#{c.ticket_id} - {c.title}", complaint_id=c.id,
            )
        else:
            for admin in _owner_recipients(db, c):
                notify_user(
                    db, admin, NotificationType.new_complaint,
                    "Complaint needs a warden", f"#{c.ticket_id} - {c.title}", complaint_id=c.id,
                )
    return moved
