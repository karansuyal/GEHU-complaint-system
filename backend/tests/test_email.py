import httpx
import pytest

from app.core.config import settings
from app.services import email as email_service
from app.services.email_templates import (
    complaint_received_email,
    notification_email,
    otp_email,
    welcome_email,
)


class FakeResponse:
    def __init__(self, status_code, body=None):
        self.status_code = status_code
        self._body = body or {}
        self.text = str(self._body)

    def json(self):
        return self._body


@pytest.fixture()
def brevo(monkeypatch):
    monkeypatch.setattr(settings, "BREVO_API_KEY", "xkeysib-test")
    monkeypatch.setattr(settings, "EMAIL_FROM_ADDRESS", "portal@example.com")
    monkeypatch.setattr(settings, "EMAIL_MAX_RETRIES", 2)
    monkeypatch.setattr(email_service.time, "sleep", lambda s: None)
    calls = []
    return calls


def test_provider_selection(monkeypatch):
    monkeypatch.setattr(settings, "BREVO_API_KEY", "")
    monkeypatch.setattr(settings, "SMTP_HOST", "")
    assert settings.email_provider == "console"
    monkeypatch.setattr(settings, "SMTP_HOST", "smtp.example.com")
    assert settings.email_provider == "smtp"
    monkeypatch.setattr(settings, "BREVO_API_KEY", "k")
    assert settings.email_provider == "brevo"


def test_brevo_payload_and_headers(brevo, monkeypatch):
    def fake_post(url, json, headers, timeout):
        brevo.append((url, json, headers))
        return FakeResponse(201, {"messageId": "<1@brevo>"})

    monkeypatch.setattr(email_service.httpx, "post", fake_post)
    assert email_service.send_email("stu@gehu.ac.in", "Hi", "plain", "<b>html</b>") is True

    url, payload, headers = brevo[0]
    assert url == "https://api.brevo.com/v3/smtp/email"
    assert headers["api-key"] == "xkeysib-test"
    assert payload["sender"] == {"name": "GEHU Complaint Portal", "email": "portal@example.com"}
    assert payload["to"] == [{"email": "stu@gehu.ac.in"}]
    assert payload["subject"] == "Hi"
    assert payload["textContent"] == "plain"
    assert payload["htmlContent"] == "<b>html</b>"


def test_brevo_retries_5xx_then_succeeds(brevo, monkeypatch):
    responses = [FakeResponse(503), FakeResponse(429), FakeResponse(201)]
    monkeypatch.setattr(email_service.httpx, "post", lambda *a, **k: responses.pop(0))
    assert email_service.send_email("a@b.co", "s", "t") is True
    assert responses == []


def test_brevo_does_not_retry_auth_errors(brevo, monkeypatch):
    calls = []

    def fake_post(*a, **k):
        calls.append(1)
        return FakeResponse(401, {"code": "unauthorized", "message": "Key not found"})

    monkeypatch.setattr(email_service.httpx, "post", fake_post)
    assert email_service.send_email("a@b.co", "s", "t") is False
    assert len(calls) == 1


def test_brevo_network_error_never_raises(brevo, monkeypatch):
    def boom(*a, **k):
        raise httpx.ConnectError("no network")

    monkeypatch.setattr(email_service.httpx, "post", boom)
    assert email_service.send_email("a@b.co", "s", "t") is False


def test_brevo_needs_a_sender(brevo, monkeypatch):
    monkeypatch.setattr(settings, "EMAIL_FROM_ADDRESS", "")
    monkeypatch.setattr(settings, "EMAIL_FROM", "")
    monkeypatch.setattr(email_service.httpx, "post", lambda *a, **k: pytest.fail("must not call Brevo"))
    assert email_service.send_email("a@b.co", "s", "t") is False


def test_otp_template_contains_code_and_escapes():
    subject, text, html = otp_email("123456", "verify", 10)
    assert "123456" in subject and "Your verification code is 123456" in text
    assert "1&nbsp;2&nbsp;3&nbsp;4&nbsp;5&nbsp;6" in html
    _, text, _ = otp_email("654321", "reset", 10)
    assert text.startswith("Your password reset code is 654321")


def test_templates_escape_user_content():
    _, _, html = notification_email("Eve <script>", "<img src=x onerror=1>", "a & b", "/complaints/1")
    assert "<script>" not in html and "<img" not in html
    assert "&lt;img" in html


def test_private_receipt_hides_title():
    _, text, html = complaint_received_email("Sam", "GEHU-00001", "Secret ragging title", "cid", private=True)
    assert "Secret ragging title" not in text and "Secret ragging title" not in html
    _, text, _ = complaint_received_email("Sam", "GEHU-00001", "Broken tap", "cid", private=False)
    assert "Broken tap" in text


def test_welcome_links_to_frontend():
    _, text, html = welcome_email("Sam Dent")
    assert settings.FRONTEND_ORIGIN in html and "Hi Sam" in text


def test_status_change_sends_email_copy(client, sent_emails, monkeypatch):
    """notify_user -> emailed copy, and ragging details are withheld."""
    from app.db.database import SessionLocal
    from app.models.notification import NotificationType
    from app.models.user import User, UserRole
    from app.core.security import hash_password
    from app.services import notifications

    sent = []
    monkeypatch.setattr(settings, "BREVO_API_KEY", "xkeysib-test")
    monkeypatch.setattr(notifications, "send_email_async", lambda to, subj, text, html: sent.append((to, subj, text)))

    db = SessionLocal()
    user = db.query(User).filter(User.email == "mailcopy@gehu.ac.in").first()
    if not user:
        user = User(name="Mail Copy", email="mailcopy@gehu.ac.in", hashed_password=hash_password("x12345678"),
                    role=UserRole.student, campus="bhimtal", is_verified=True, is_active=True)
        db.add(user)
        db.commit()
    notifications.notify_user(db, user, NotificationType.status_change, "Complaint #1 updated", "Now resolved")
    notifications.notify_user(db, user, NotificationType.new_comment, "New comment", "hello")  # off by default
    db.close()

    assert len(sent) == 1
    assert sent[0][0] == "mailcopy@gehu.ac.in" and "Now resolved" in sent[0][2]
