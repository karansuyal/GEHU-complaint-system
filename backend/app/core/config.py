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

    # SMTP for sending OTP emails. Leave SMTP_HOST blank in dev: the code is
    # then printed in the backend console instead of being emailed.
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_USE_SSL: bool = False  # True for port 465; False = STARTTLS (587)
    EMAIL_FROM: str = "GEHU Complaint Portal <no-reply@gehu.ac.in>"

    # How long after a complaint is marked resolved the student can reopen it.
    REOPEN_WINDOW_DAYS: int = 7

    @property
    def allowed_email_domains(self) -> list[str]:
        return [d.strip().lower().lstrip("@") for d in self.ALLOWED_EMAIL_DOMAINS.split(",") if d.strip()]


settings = Settings()
