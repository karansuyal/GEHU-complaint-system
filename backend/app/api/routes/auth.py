from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.security import create_access_token, hash_password, verify_password
from app.crud import user as user_crud
from app.db.database import get_db
from app.models.user import ComplaintCategory, User, UserRole
from app.schemas.auth import (
    EmailOnlyRequest,
    LoginRequest,
    MessageResponse,
    RegisterRequest,
    RegisterResponse,
    ResetPasswordRequest,
    TokenResponse,
    UserOut,
    VerifyEmailRequest,
)
from app.services.email import send_email
from app.services.email_templates import (
    otp_email,
    password_changed_email,
    staff_added_email,
    welcome_email,
)
from app.services.otp import PURPOSE_RESET, PURPOSE_VERIFY, OTPError, check_otp, create_otp

router = APIRouter(prefix="/auth", tags=["auth"])


def _token_for(user: User) -> TokenResponse:
    token = create_access_token({"sub": user.id, "role": user.role.value})
    return TokenResponse(access_token=token, user=UserOut.model_validate(user))


def _issue_code(db: Session, background: BackgroundTasks, email: str, purpose: str) -> None:
    """Creates an OTP (respecting the resend cooldown) and emails it in the
    background so the request returns immediately."""
    code = create_otp(db, email, purpose)
    if code is None:
        return
    subject, text, html = otp_email(code, purpose, settings.OTP_EXPIRE_MINUTES)
    background.add_task(send_email, email, subject, text, html)


def _check_domain(email: str) -> None:
    allowed = settings.allowed_email_domains
    if allowed and email.split("@")[-1].lower() not in allowed:
        pretty = ", ".join("@" + d for d in allowed)
        raise HTTPException(status_code=400, detail=f"Please use your college email ({pretty})")


@router.post("/register", response_model=RegisterResponse)
def register(payload: RegisterRequest, background: BackgroundTasks, db: Session = Depends(get_db)):
    _check_domain(payload.email)

    # Public self-registration is only allowed as a student. Warden/admin
    # accounts must be created by an existing admin (see /auth/create-staff),
    # so nobody can grant themselves elevated access through this endpoint.
    payload.role = UserRole.student
    payload.handles_category = None

    existing = user_crud.get_user_by_email(db, payload.email)
    if existing and (existing.is_verified or existing.role != UserRole.student):
        raise HTTPException(status_code=400, detail="Email already registered")

    if not settings.REQUIRE_EMAIL_VERIFICATION:
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")
        user = user_crud.create_user(db, payload, is_verified=True)
        tok = _token_for(user)
        return RegisterResponse(
            requires_verification=False,
            email=user.email,
            access_token=tok.access_token,
            user=tok.user,
        )

    if existing:
        # An unverified signup that was abandoned (or had a typo'd password):
        # let the person start over instead of locking the address forever.
        existing.name = payload.name
        existing.hashed_password = hash_password(payload.password)
        existing.enrollment_no = payload.enrollment_no
        existing.hostel_block = payload.hostel_block
        db.commit()
        user = existing
    else:
        user = user_crud.create_user(db, payload, is_verified=False)

    _issue_code(db, background, user.email, PURPOSE_VERIFY)
    return RegisterResponse(requires_verification=True, email=user.email)


@router.post("/verify-email", response_model=TokenResponse)
def verify_email(payload: VerifyEmailRequest, background: BackgroundTasks, db: Session = Depends(get_db)):
    user = user_crud.get_user_by_email(db, payload.email)
    try:
        if not user:
            raise OTPError("Invalid or expired code")
        check_otp(db, user.email, PURPOSE_VERIFY, payload.otp)
    except OTPError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    user.is_verified = True
    db.commit()
    db.refresh(user)
    subject, text, html = welcome_email(user.name)
    background.add_task(send_email, user.email, subject, text, html)
    return _token_for(user)


@router.post("/resend-otp", response_model=MessageResponse)
def resend_otp(payload: EmailOnlyRequest, background: BackgroundTasks, db: Session = Depends(get_db)):
    user = user_crud.get_user_by_email(db, payload.email)
    if user and not user.is_verified:
        _issue_code(db, background, user.email, PURPOSE_VERIFY)
    # Same answer whether or not the account exists, so this can't be used to
    # find out who has registered.
    return MessageResponse(message="If that account needs verification, a new code has been sent.")


@router.post("/forgot-password", response_model=MessageResponse)
def forgot_password(payload: EmailOnlyRequest, background: BackgroundTasks, db: Session = Depends(get_db)):
    user = user_crud.get_user_by_email(db, payload.email)
    if user and user.is_active:
        _issue_code(db, background, user.email, PURPOSE_RESET)
    return MessageResponse(message="If that email is registered, a reset code has been sent.")


@router.post("/reset-password", response_model=MessageResponse)
def reset_password(payload: ResetPasswordRequest, background: BackgroundTasks, db: Session = Depends(get_db)):
    user = user_crud.get_user_by_email(db, payload.email)
    try:
        if not user or not user.is_active:
            raise OTPError("Invalid or expired code")
        check_otp(db, user.email, PURPOSE_RESET, payload.otp)
    except OTPError as e:
        raise HTTPException(status_code=e.status_code, detail=e.detail)

    user.hashed_password = hash_password(payload.new_password)
    user.is_verified = True  # receiving the reset code proves they own the inbox
    db.commit()
    # Security alert: if this wasn't them, they find out immediately.
    subject, text, html = password_changed_email(user.name)
    background.add_task(send_email, user.email, subject, text, html)
    return MessageResponse(message="Password updated. You can sign in now.")


@router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, background: BackgroundTasks, db: Session = Depends(get_db)):
    user = user_crud.get_user_by_email(db, payload.email)
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="account_disabled")
    if not user.is_verified:
        # Password was right, so it's safe to (re)send a code and tell the
        # frontend to show the verification screen.
        _issue_code(db, background, user.email, PURPOSE_VERIFY)
        # Return the 403 as a real response carrying the background task:
        # tasks attached to a *raised* HTTPException are silently dropped.
        return JSONResponse(
            status_code=403, content={"detail": "email_not_verified"}, background=background
        )
    return _token_for(user)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/create-staff", response_model=UserOut)
def create_staff(
    payload: RegisterRequest,
    background: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Only an existing admin can create warden/admin accounts - this is the
    # sole path to a non-student role, keeping /register locked to students.
    if current_user.role != UserRole.admin:
        raise HTTPException(status_code=403, detail="Only an admin can create staff accounts")
    if user_crud.get_user_by_email(db, payload.email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if payload.role == UserRole.student:
        raise HTTPException(status_code=400, detail="Use /register for student accounts")
    if payload.role == UserRole.warden and payload.handles_category is None:
        raise HTTPException(status_code=400, detail="Warden accounts must have handles_category set")
    if payload.handles_category == ComplaintCategory.ragging:
        # No warden is ever assigned ragging complaints - enforced here too,
        # not just in the complaint-routing logic.
        raise HTTPException(
            status_code=400, detail="Wardens cannot be assigned the ragging category"
        )
    if payload.role == UserRole.admin:
        payload.handles_category = None
    payload.campus = current_user.campus

    user = user_crud.create_user(db, payload, is_verified=True)
    subject, text, html = staff_added_email(
        user.name, user.role.value, user.handles_category.value if user.handles_category else None
    )
    background.add_task(send_email, user.email, subject, text, html)
    return user
