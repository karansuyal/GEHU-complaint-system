import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> None:
    """Sends a plain-text email. With no SMTP_HOST configured (local dev) the
    message is printed to the backend console instead, so signup / password
    reset can be tested without a mail server. Never raises: a mail failure
    must not turn a signup into a 500 - the user can just request a new code."""
    if not settings.SMTP_HOST:
        print(
            "\n"
            "==================== EMAIL (dev mode - SMTP not configured) ====================\n"
            f"To:      {to}\n"
            f"Subject: {subject}\n\n"
            f"{body}\n"
            "================================================================================\n",
            flush=True,
        )
        return

    msg = EmailMessage()
    msg["From"] = settings.EMAIL_FROM
    msg["To"] = to
    msg["Subject"] = subject
    msg.set_content(body)

    try:
        if settings.SMTP_USE_SSL:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
            server.starttls()
        with server:
            if settings.SMTP_USERNAME:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
    except Exception:  # noqa: BLE001
        logger.exception("Failed to send email to %s", to)
