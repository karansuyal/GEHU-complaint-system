from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field

from app.models.user import UserRole, ComplaintCategory


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8)
    enrollment_no: Optional[str] = None
    hostel_block: Optional[str] = None
    campus: str = "bhimtal"
    role: UserRole = UserRole.student
    handles_category: Optional[ComplaintCategory] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: UserRole
    campus: str
    enrollment_no: Optional[str] = None
    hostel_block: Optional[str] = None
    handles_category: Optional[ComplaintCategory] = None

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class RegisterResponse(BaseModel):
    """Either "check your email" (requires_verification) or, when email
    verification is switched off, a ready-to-use login like before."""

    requires_verification: bool
    email: EmailStr
    access_token: Optional[str] = None
    token_type: str = "bearer"
    user: Optional[UserOut] = None


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)


class EmailOnlyRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8)


class MessageResponse(BaseModel):
    message: str


class StaffOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: UserRole
    hostel_block: Optional[str] = None
    handles_category: Optional[ComplaintCategory] = None
    is_active: bool
    last_seen: Optional[datetime] = None
    open_complaints: int = 0
    resolved_complaints: int = 0
    avg_rating: Optional[float] = None


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    hostel_block: Optional[str] = None
    handles_category: Optional[ComplaintCategory] = None
    is_active: Optional[bool] = None


class StaffPasswordReset(BaseModel):
    new_password: str = Field(min_length=8)
