from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, Field, field_validator

from app.models.complaint import ComplaintStatus
from app.models.user import ComplaintCategory


class StatusHistoryOut(BaseModel):
    status: ComplaintStatus
    timestamp: datetime

    model_config = {"from_attributes": True}


class CommentOut(BaseModel):
    author_name: str
    text: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ComplaintOut(BaseModel):
    id: str
    ticket_id: str
    category: ComplaintCategory
    title: str
    description: str
    location: str
    photo_url: Optional[str] = None
    is_anonymous: bool
    status: ComplaintStatus
    created_at: datetime
    updated_at: datetime
    assigned_warden_id: Optional[str] = None
    assigned_warden_name: Optional[str] = None
    resolved_at: Optional[datetime] = None
    reopen_deadline: Optional[datetime] = None
    sla_deadline: Optional[datetime] = None
    reopened_count: int = 0
    reopen_reason: Optional[str] = None
    rating: Optional[int] = None
    feedback_text: Optional[str] = None
    status_history: List[StatusHistoryOut] = []
    comments: List[CommentOut] = []

    model_config = {"from_attributes": True}


class ComplaintListItem(BaseModel):
    """Lightweight row for lists and search - no history/comments."""

    id: str
    ticket_id: str
    category: ComplaintCategory
    title: str
    location: str
    is_anonymous: bool
    status: ComplaintStatus
    created_at: datetime
    updated_at: datetime
    assigned_warden_id: Optional[str] = None
    assigned_warden_name: Optional[str] = None
    reopened_count: int = 0
    rating: Optional[int] = None
    sla_deadline: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ComplaintPage(BaseModel):
    items: List[ComplaintListItem]
    total: int
    page: int
    page_size: int
    pages: int


class ComplaintStatusUpdate(BaseModel):
    status: ComplaintStatus


class CommentCreate(BaseModel):
    text: str = Field(min_length=1, max_length=1000)

    @field_validator("text")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Comment cannot be empty")
        return v


class FeedbackCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = Field(default=None, max_length=500)


class ReopenRequest(BaseModel):
    reason: str = Field(min_length=5, max_length=500)


class AssignRequest(BaseModel):
    warden_id: Optional[str] = None  # null = leave unassigned (admin handles it)
