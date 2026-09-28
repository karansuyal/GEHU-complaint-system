from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.models.notification import NotificationType


class NotificationOut(BaseModel):
    id: str
    type: NotificationType
    title: str
    body: str
    complaint_id: Optional[str] = None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UnreadCountOut(BaseModel):
    count: int


class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    keys: PushSubscriptionKeys


class PushSubscriptionDelete(BaseModel):
    endpoint: str


class VapidKeyOut(BaseModel):
    public_key: str
    enabled: bool
