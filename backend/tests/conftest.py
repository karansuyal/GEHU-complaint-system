import os
import sys
import tempfile
from pathlib import Path

# Must be set BEFORE the app (and its settings) is imported.
_tmp = tempfile.mkdtemp()
os.environ["DATABASE_URL"] = f"sqlite:///{_tmp}/test.db"
os.environ["OTP_RESEND_COOLDOWN_SECONDS"] = "0"
os.environ["ALLOWED_EMAIL_DOMAINS"] = ""
os.environ["SMTP_HOST"] = ""
os.environ["BREVO_API_KEY"] = ""
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import pytest
from fastapi.testclient import TestClient


@pytest.fixture(scope="session")
def client():
    from app.main import app

    with TestClient(app) as c:  # runs lifespan -> migrations
        yield c


@pytest.fixture()
def sent_emails(monkeypatch):
    """Captures OTP emails instead of printing them."""
    box = []
    monkeypatch.setattr("app.api.routes.auth.send_email", lambda to, subject, body, html=None: box.append((to, subject, body)))
    return box


def last_code(box, to):
    for addr, _subj, body in reversed(box):
        if addr.lower() == to.lower():
            return body.split("is ")[1].split()[0]
    raise AssertionError(f"no email sent to {to}")
