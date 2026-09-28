from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.api.deps import require_roles
from app.models.user import User, UserRole
from app.models.complaint import Complaint, ComplaintStatus
from app.models.status_history import StatusHistory

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview")
def overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    base = db.query(Complaint).filter(Complaint.campus == current_user.campus)
    total = base.count()
    pending = base.filter(Complaint.status == ComplaintStatus.pending).count()
    escalated = base.filter(Complaint.status == ComplaintStatus.escalated).count()

    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    resolved_30d = base.filter(
        Complaint.status == ComplaintStatus.resolved, Complaint.updated_at >= thirty_days_ago
    ).count()

    avg_rating = (
        db.query(func.avg(Complaint.rating))
        .filter(Complaint.campus == current_user.campus, Complaint.rating.isnot(None))
        .scalar()
    )
    unassigned = base.filter(
        Complaint.assigned_warden_id.is_(None), Complaint.status != ComplaintStatus.resolved
    ).count()
    reopened = base.filter(Complaint.reopened_count > 0).count()

    return {
        "total": total,
        "pending": pending,
        "escalated": escalated,
        "resolved_30d": resolved_30d,
        "avg_rating": round(float(avg_rating), 1) if avg_rating is not None else None,
        "unassigned": unassigned,
        "reopened": reopened,
    }


@router.get("/categories")
def category_breakdown(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    rows = (
        db.query(Complaint.category, func.count(Complaint.id))
        .filter(Complaint.campus == current_user.campus)
        .group_by(Complaint.category)
        .all()
    )
    return [{"category": c.value, "count": n} for c, n in rows]


@router.get("/trend")
def daily_trend(
    days: int = 14,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    """Complaints filed vs. resolved per day, for the last `days` days —
    feeds the admin dashboard's trend chart."""
    since = datetime.now(timezone.utc) - timedelta(days=days)

    filed_rows = (
        db.query(func.date(Complaint.created_at), func.count(Complaint.id))
        .filter(Complaint.campus == current_user.campus, Complaint.created_at >= since)
        .group_by(func.date(Complaint.created_at))
        .all()
    )
    resolved_rows = (
        db.query(func.date(StatusHistory.timestamp), func.count(StatusHistory.id))
        .join(Complaint, Complaint.id == StatusHistory.complaint_id)
        .filter(
            Complaint.campus == current_user.campus,
            StatusHistory.status == ComplaintStatus.resolved,
            StatusHistory.timestamp >= since,
        )
        .group_by(func.date(StatusHistory.timestamp))
        .all()
    )

    filed_by_day = {str(day): count for day, count in filed_rows}
    resolved_by_day = {str(day): count for day, count in resolved_rows}

    days_list = [(since + timedelta(days=i)).date().isoformat() for i in range(days + 1)]
    return [
        {"date": d, "filed": filed_by_day.get(d, 0), "resolved": resolved_by_day.get(d, 0)}
        for d in days_list
    ]


@router.get("/resolution-time")
def avg_resolution_time(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    """Average hours between a complaint being filed and first marked
    resolved, over the last 30 days."""
    thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
    rows = (
        db.query(Complaint.created_at, StatusHistory.timestamp)
        .join(StatusHistory, StatusHistory.complaint_id == Complaint.id)
        .filter(
            Complaint.campus == current_user.campus,
            StatusHistory.status == ComplaintStatus.resolved,
            Complaint.created_at >= thirty_days_ago,
        )
        .all()
    )
    if not rows:
        return {"avg_hours": None, "sample_size": 0}

    total_hours = 0.0
    for created_at, resolved_at in rows:
        c = created_at.replace(tzinfo=timezone.utc) if created_at.tzinfo is None else created_at
        r = resolved_at.replace(tzinfo=timezone.utc) if resolved_at.tzinfo is None else resolved_at
        total_hours += (r - c).total_seconds() / 3600

    return {"avg_hours": round(total_hours / len(rows), 1), "sample_size": len(rows)}
