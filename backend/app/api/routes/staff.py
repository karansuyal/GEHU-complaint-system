from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.core.security import hash_password
from app.crud import complaint as complaint_crud
from app.db.database import get_db
from app.models.complaint import Complaint, ComplaintStatus
from app.models.user import ComplaintCategory, User, UserRole
from app.services.email import send_email
from app.services.email_templates import password_changed_email
from app.schemas.auth import MessageResponse, StaffOut, StaffPasswordReset, StaffUpdate

router = APIRouter(prefix="/staff", tags=["staff"])


def _get_staff(db: Session, staff_id: str, admin: User) -> User:
    user = (
        db.query(User)
        .filter(User.id == staff_id, User.campus == admin.campus, User.role.in_([UserRole.warden, UserRole.admin]))
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="Staff member not found")
    return user


@router.get("", response_model=list[StaffOut])
def list_staff(
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(UserRole.admin)),
):
    """All wardens and admins on the campus with a little workload/quality
    context, for the admin's Staff screen."""
    staff = (
        db.query(User)
        .filter(User.campus == admin.campus, User.role.in_([UserRole.warden, UserRole.admin]))
        .order_by(User.role, User.name)
        .all()
    )

    open_rows = (
        db.query(Complaint.assigned_warden_id, func.count(Complaint.id))
        .filter(Complaint.assigned_warden_id.isnot(None), Complaint.status != ComplaintStatus.resolved)
        .group_by(Complaint.assigned_warden_id)
        .all()
    )
    done_rows = (
        db.query(Complaint.assigned_warden_id, func.count(Complaint.id), func.avg(Complaint.rating))
        .filter(Complaint.assigned_warden_id.isnot(None), Complaint.status == ComplaintStatus.resolved)
        .group_by(Complaint.assigned_warden_id)
        .all()
    )
    open_by = {wid: n for wid, n in open_rows}
    done_by = {wid: (n, avg) for wid, n, avg in done_rows}

    out = []
    for u in staff:
        resolved_n, avg = done_by.get(u.id, (0, None))
        out.append(
            StaffOut(
                id=u.id,
                name=u.name,
                email=u.email,
                role=u.role,
                hostel_block=u.hostel_block,
                handles_category=u.handles_category,
                is_active=u.is_active,
                last_seen=u.last_seen,
                open_complaints=open_by.get(u.id, 0),
                resolved_complaints=resolved_n,
                avg_rating=round(float(avg), 1) if avg is not None else None,
            )
        )
    return out


@router.patch("/{staff_id}", response_model=StaffOut)
def update_staff(
    staff_id: str,
    payload: StaffUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(UserRole.admin)),
):
    user = _get_staff(db, staff_id, admin)
    data = payload.model_dump(exclude_unset=True)

    if data.get("is_active") is False and user.id == admin.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")

    if "handles_category" in data:
        if user.role != UserRole.warden:
            raise HTTPException(status_code=400, detail="Only wardens have a category")
        if data["handles_category"] is None:
            raise HTTPException(status_code=400, detail="A warden must handle a category")
        if data["handles_category"] == ComplaintCategory.ragging:
            raise HTTPException(status_code=400, detail="Wardens cannot be assigned the ragging category")

    if "name" in data:
        name = (data["name"] or "").strip()
        if not name:
            raise HTTPException(status_code=400, detail="Name cannot be empty")
        user.name = name
    if "hostel_block" in data:
        user.hostel_block = (data["hostel_block"] or "").strip() or None

    category_changed = "handles_category" in data and data["handles_category"] != user.handles_category
    if "handles_category" in data:
        user.handles_category = data["handles_category"]
    if "is_active" in data:
        user.is_active = data["is_active"]
    db.commit()
    db.refresh(user)

    # Keep the queue consistent: hand open work to someone who can take it.
    if user.role == UserRole.warden:
        if data.get("is_active") is False:
            complaint_crud.reassign_open_complaints(db, user)
        elif category_changed:
            complaint_crud.reassign_open_complaints(db, user, keep_category=user.handles_category)

    return next(s for s in list_staff(db, admin) if s.id == user.id)


@router.post("/{staff_id}/reset-password", response_model=MessageResponse)
def reset_staff_password(
    staff_id: str,
    payload: StaffPasswordReset,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    admin: User = Depends(require_roles(UserRole.admin)),
):
    user = _get_staff(db, staff_id, admin)
    user.hashed_password = hash_password(payload.new_password)
    db.commit()
    subject, text, html = password_changed_email(user.name)
    background.add_task(send_email, user.email, subject, text, html)
    return MessageResponse(message=f"Password updated for {user.name}")
