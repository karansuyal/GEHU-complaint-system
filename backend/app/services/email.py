"""Outgoing email.

Provider order:
  1. Brevo transactional API   (BREVO_API_KEY set)   <- recommended, plain HTTPS
  2. SMTP                      (SMTP_HOST set)       <- e.g. smtp-relay.brevo.com:587
  3. Console                   (nothing set)         <- local dev, prints the mail

Nothing in here ever raises: a mail failure must not turn a signup or a status
change into a 500. Failures are logged instead.
"""
import logging
import smtplib
import time
from concurrent.futures import ThreadPoolExecutor
from email.message import EmailMessage
from email.utils import formataddr

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

# Small pool so notification emails never block the request that triggered
# them, without spawning unbounded threads.
_pool = ThreadPoolExecutor(max_workers=4, thread_name_prefix="mailer")


def email_enabled() -> bool:
    """True when a real provider is configured (not just the dev console)."""
    return settings.email_provider != "console"


def send_email(to: str, subject: str, body: str, html: str | None = None) -> bool:
    """Sends one email. ``body`` is the plain-text part, ``html`` the optional
    HTML part. Returns True when the provider accepted it."""
    provider = settings.email_provider
    try:
        if provider == "brevo":
            return _send_brevo(to, subject, body, html)
        if provider == "smtp":
            return _send_smtp(to, subject, body, html)
        _print_console(to, subject, body)
        return True
    except Exception:  # noqa: BLE001
        logger.exception("Failed to send email to %s", to)
        return False


def send_email_async(to: str, subject: str, body: str, html: str | None = None) -> None:
    """Fire-and-forget version for code paths without FastAPI BackgroundTasks
    (e.g. the notification service and the escalation scheduler)."""
    _pool.submit(send_email, to, subject, body, html)


# ------------------------------------------------------------------ Brevo


def _send_brevo(to: str, subject: str, body: str, html: str | None) -> bool:
    sender = settings.sender_address
    if not sender:
        logger.error("Brevo is configured but EMAIL_FROM_ADDRESS is empty; email to %s not sent", to)
        return False

    payload: dict = {
        "sender": {"name": settings.EMAIL_FROM_NAME, "email": sender},
        "to": [{"email": to}],
        "subject": subject,
        "textContent": body,
        "tags": ["gehu-complaint-portal"],
    }
    if html:
        payload["htmlContent"] = html
    if settings.EMAIL_REPLY_TO:
        payload["replyTo"] = {"email": settings.EMAIL_REPLY_TO}

    headers = {"api-key": settings.BREVO_API_KEY, "accept": "application/json", "content-type": "application/json"}

    attempts = settings.EMAIL_MAX_RETRIES + 1
    for attempt in range(1, attempts + 1):
        try:
            r = httpx.post(settings.BREVO_API_URL, json=payload, headers=headers,
                           timeout=settings.EMAIL_TIMEOUT_SECONDS)
        except httpx.HTTPError as exc:
            logger.warning("Brevo request failed (attempt %s/%s): %s", attempt, attempts, exc)
        else:
            if r.status_code in (200, 201, 202):
                return True
            # 429 (rate limit) and 5xx are worth retrying; other 4xx are our
            # fault (bad key, unverified sender, blocked IP) and will not fix themselves.
            if r.status_code == 429 or r.status_code >= 500:
                logger.warning("Brevo returned %s (attempt %s/%s)", r.status_code, attempt, attempts)
            else:
                logger.error("Brevo rejected the email to %s: %s %s", to, r.status_code, _brevo_error(r))
                return False
        if attempt < attempts:
            time.sleep(0.6 * attempt)
    logger.error("Brevo: giving up on email to %s after %s attempts", to, attempts)
    return False


def _brevo_error(r: httpx.Response) -> str:
    try:
        data = r.json()
        return f"{data.get('code', '')}: {data.get('message', '')}".strip(": ")
    except ValueError:
        return r.text[:200]


# ------------------------------------------------------------------- SMTP


def _send_smtp(to: str, subject: str, body: str, html: str | None) -> bool:
    msg = EmailMessage()
    msg["From"] = formataddr((settings.EMAIL_FROM_NAME, settings.sender_address)) if settings.EMAIL_FROM_ADDRESS else settings.EMAIL_FROM
    msg["To"] = to
    msg["Subject"] = subject
    if settings.EMAIL_REPLY_TO:
        msg["Reply-To"] = settings.EMAIL_REPLY_TO
    msg.set_content(body)
    if html:
        msg.add_alternative(html, subtype="html")

    if settings.SMTP_USE_SSL:
        server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=settings.EMAIL_TIMEOUT_SECONDS)
    else:
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=settings.EMAIL_TIMEOUT_SECONDS)
        server.starttls()
    with server:
        if settings.SMTP_USERNAME:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
        server.send_message(msg)
    return True


# ---------------------------------------------------------------- console


def _print_console(to: str, subject: str, body: str) -> None:
    print(
        "\n"
        "==================== EMAIL (dev mode - no email provider configured) ====================\n"
        f"To:      {to}\n"
        f"Subject: {subject}\n\n"
        f"{body}\n"
        "==========================================================================================\n",
        flush=True,
    )
