import re

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "sqlite:///./complaints.db"

    SECRET_KEY: str = "dev-secret-change-me"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    ESCALATION_SLA_HOURS: int = 48
    RAGGING_ESCALATION_SLA_HOURS: int = 6

    FRONTEND_ORIGIN: str = "http://localhost:5173"

    CAMPUS_NAME: str = "bhimtal"

    # Web Push (VAPID) — generate with `python generate_vapid_keys.py`.
    # Leave blank to disable push sends; in-app notifications still work.
    VAPID_PUBLIC_KEY: str = ""
    VAPID_PRIVATE_KEY: str = ""
    VAPID_CLAIM_EMAIL: str = "admin@gehu.ac.in"

    # A user counts as "online" for the presence indicator if their last
    # heartbeat was within this many seconds.
    PRESENCE_ONLINE_WINDOW_SECONDS: int = 90

    # ---- Email verification / password reset ----
    # Comma-separated list, e.g. "gehu.ac.in". Empty = any email may register.
    ALLOWED_EMAIL_DOMAINS: str = ""
    # If False, new students are auto-verified and logged in straight away
    # (handy for quick local testing without reading OTPs from the console).
    REQUIRE_EMAIL_VERIFICATION: bool = True
    OTP_EXPIRE_MINUTES: int = 10
    OTP_MAX_ATTEMPTS: int = 5
    OTP_RESEND_COOLDOWN_SECONDS: int = 60

    # ---- Brevo (https://www.brevo.com) transactional email ----
    # Preferred provider. Uses Brevo's HTTPS API (port 443), so it works on
    # hosts that block SMTP (Render/Railway free tiers etc.).
    # Create a v3 API key at Brevo -> SMTP & API -> API Keys (starts "xkeysib-").
    BREVO_API_KEY: str = ""
    BREVO_API_URL: str = "https://api.brevo.com/v3/smtp/email"
    # Must be a sender you verified in Brevo (Senders, Domains & Dedicated IPs).
    EMAIL_FROM_ADDRESS: str = ""
    EMAIL_FROM_NAME: str = "GEHU Complaint Portal"
    EMAIL_REPLY_TO: str = ""
    EMAIL_TIMEOUT_SECONDS: int = 10
    EMAIL_MAX_RETRIES: int = 2

    # Email copies of in-app notifications (status changes, escalations, ...).
    # Only sent when a real provider (Brevo or SMTP) is configured.
    EMAIL_NOTIFICATIONS_ENABLED: bool = True
    # Which notification types are also emailed. new_comment is off by default
    # so a busy thread doesn't flood inboxes.
    EMAIL_NOTIFY_TYPES: str = "new_complaint,status_change,escalation"

    # Fallback SMTP (Brevo's relay smtp-relay.brevo.com:587 also works here).
    # With neither BREVO_API_KEY nor SMTP_HOST set (local dev) emails are
    # printed to the backend console instead.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_SSL: bool = False  # True for port 465; False = STARTTLS (587)
    EMAIL_FROM: str = "GEHU Complaint Portal <no-reply@gehu.ac.in>"

    # How long after a complaint is marked resolved the student can reopen it.
    REOPEN_WINDOW_DAYS: int = 7

    @property
    def email_notify_types(self) -> set[str]:
        return {t.strip() for t in self.EMAIL_NOTIFY_TYPES.split(",") if t.strip()}

    @property
    def email_provider(self) -> str:
        if self.BREVO_API_KEY:
            return "brevo"
        if self.SMTP_HOST:
            return "smtp"
        return "console"

    @property
    def sender_address(self) -> str:
        """Bare sender address. Falls back to the address inside EMAIL_FROM."""
        if self.EMAIL_FROM_ADDRESS:
            return self.EMAIL_FROM_ADDRESS
        m = re.search(r"<([^>]+)>", self.EMAIL_FROM)
        return m.group(1) if m else self.EMAIL_FROM

    @property
    def allowed_email_domains(self) -> list[str]:
        return [d.strip().lower().lstrip("@") for d in self.ALLOWED_EMAIL_DOMAINS.split(",") if d.strip()]


settings = Settings()
