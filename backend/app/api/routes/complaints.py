from datetime import date, datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.api.deps import get_current_user, require_roles
from app.models.user import User, UserRole, ComplaintCategory
from app.models.complaint import ComplaintStatus
from app.crud import complaint as complaint_crud
from app.schemas.complaint import (
    AssignRequest,
    CommentCreate,
    ComplaintOut,
    ComplaintPage,
    ComplaintStatusUpdate,
    FeedbackCreate,
    ReopenRequest,
)
from app.services.upload import upload_photo

router = APIRouter(prefix="/complaints", tags=["complaints"])


@router.post("", response_model=ComplaintOut)
async def file_complaint(
    category: ComplaintCategory = Form(...),
    title: str = Form(...),
    description: str = Form(...),
    location: str = Form(...),
    is_anonymous: bool = Form(False),
    photo: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.student)),
):
    photo_url = await upload_photo(photo) if photo else None
    complaint = complaint_crud.create_complaint(
        db,
        student=current_user,
        category=category,
        title=title,
        description=description,
        location=location,
        is_anonymous=is_anonymous,
        photo_url=photo_url,
    )
    return complaint


@router.get("/mine", response_model=list[ComplaintOut])
def my_complaints(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.student)),
):
    return complaint_crud.list_mine(db, current_user.id)


@router.get("/assigned", response_model=list[ComplaintOut])
def assigned_complaints(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.warden)),
):
    # Structurally can never include ragging complaints — see crud layer.
    return complaint_crud.list_assigned_to_warden(db, current_user)


@router.get("", response_model=list[ComplaintOut])
def all_complaints(
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    return complaint_crud.list_all_for_admin(db, current_user.campus, limit)


@router.get("/search", response_model=ComplaintPage)
def search(
    q: Optional[str] = Query(None, max_length=100),
    status: Optional[ComplaintStatus] = None,
    category: Optional[ComplaintCategory] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    warden_id: Optional[str] = None,
    unassigned: bool = False,
    sort: str = Query("newest", pattern="^(newest|oldest)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Role-aware search: admins search the whole campus, wardens their
    assigned queue, students their own complaints. Ragging complaints stay
    invisible to wardens because they are never assigned to one."""
    return complaint_crud.search_complaints(
        db,
        current_user,
        q=q,
        status=status,
        category=category,
        date_from=date_from,
        date_to=date_to,
        warden_id=warden_id,
        unassigned=unassigned,
        sort=sort,
        page=page,
        page_size=page_size,
    )


def _get_visible_complaint(db: Session, complaint_id: str, user: User):
    complaint = complaint_crud.get_complaint(db, complaint_id)
    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    if user.role == UserRole.admin:
        return complaint
    if user.role == UserRole.student and complaint.student_id == user.id:
        return complaint
    if (
        user.role == UserRole.warden
        and complaint.assigned_warden_id == user.id
        and complaint.category != ComplaintCategory.ragging
    ):
        return complaint

    raise HTTPException(status_code=403, detail="You cannot view this complaint")


@router.get("/{complaint_id}", response_model=ComplaintOut)
def get_complaint(
    complaint_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return _get_visible_complaint(db, complaint_id, current_user)


@router.patch("/{complaint_id}/status", response_model=ComplaintOut)
def change_status(
    complaint_id: str,
    payload: ComplaintStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.warden, UserRole.admin)),
):
    complaint = _get_visible_complaint(db, complaint_id, current_user)
    return complaint_crud.update_status(db, complaint, payload.status, current_user)


@router.post("/{complaint_id}/comments", response_model=ComplaintOut)
def post_comment(
    complaint_id: str,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    complaint = _get_visible_complaint(db, complaint_id, current_user)
    return complaint_crud.add_comment(db, complaint, current_user, payload.text)


@router.post("/{complaint_id}/feedback", response_model=ComplaintOut)
def leave_feedback(
    complaint_id: str,
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.student)),
):
    complaint = _get_visible_complaint(db, complaint_id, current_user)
    if complaint.status != ComplaintStatus.resolved:
        raise HTTPException(status_code=400, detail="You can rate a complaint once it is resolved")
    if complaint.rating is not None:
        raise HTTPException(status_code=409, detail="You have already rated this complaint")
    return complaint_crud.add_feedback(db, complaint, payload.rating, payload.comment)


@router.post("/{complaint_id}/reopen", response_model=ComplaintOut)
def reopen(
    complaint_id: str,
    payload: ReopenRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.student)),
):
    complaint = _get_visible_complaint(db, complaint_id, current_user)
    if complaint.status != ComplaintStatus.resolved:
        raise HTTPException(status_code=400, detail="Only a resolved complaint can be reopened")
    deadline = complaint.reopen_deadline
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if deadline and now > deadline.replace(tzinfo=None):
        raise HTTPException(
            status_code=400,
            detail="The reopen window has closed. Please file a new complaint.",
        )
    return complaint_crud.reopen_complaint(db, complaint, current_user, payload.reason)


@router.patch("/{complaint_id}/assign", response_model=ComplaintOut)
def assign(
    complaint_id: str,
    payload: AssignRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    complaint = _get_visible_complaint(db, complaint_id, current_user)
    warden = None
    if payload.warden_id:
        if complaint.category == ComplaintCategory.ragging:
            # Same structural rule as at filing time: ragging never goes to a warden.
            raise HTTPException(status_code=400, detail="Ragging complaints cannot be assigned to a warden")
        warden = (
            db.query(User)
            .filter(
                User.id == payload.warden_id,
                User.role == UserRole.warden,
                User.campus == current_user.campus,
                User.is_active == True,  # noqa: E712
            )
            .first()
        )
        if not warden:
            raise HTTPException(status_code=404, detail="Active warden not found")
    return complaint_crud.assign_warden(db, complaint, warden)
