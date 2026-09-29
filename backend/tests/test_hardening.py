"""Tests for the security / robustness fixes:
ticket ids, production config guard, rate limiting, photo upload validation,
input limits and the status state machine."""
import io
import re
from datetime import datetime, timedelta, timezone

import pytest

from tests.test_features import API, auth, login, make_admin, register_and_verify


# ------------------------------------------------------------- ticket ids


def test_ticket_id_format_and_uniqueness():
    from app.models.complaint import generate_ticket_id

    ids = {generate_ticket_id() for _ in range(5000)}
    assert len(ids) == 5000
    assert all(re.fullmatch(r"GEHU-[2-9A-HJKMNP-Z]{8}", i) for i in ids)


def test_ticket_collision_is_retried_not_500(client, sent_emails, monkeypatch):
    from app.crud import complaint as crud
    from app.db.database import SessionLocal
    from app.models.complaint import Complaint

    stu = register_and_verify(client, sent_emails, "collide1@gehu.ac.in")
    first = client.post(f"{API}/complaints", headers=auth(stu), data={
        "category": "mess", "title": "a", "description": "d", "location": "l"}).json()

    # Force the next generated id to collide once, then behave.
    seq = iter([first["ticket_id"], "GEHU-ZZZZZZZ2"])
    monkeypatch.setattr(crud, "generate_ticket_id", lambda: next(seq))
    r = client.post(f"{API}/complaints", headers=auth(stu), data={
        "category": "mess", "title": "b", "description": "d", "location": "l"})
    assert r.status_code == 200, r.text
    assert r.json()["ticket_id"] == "GEHU-ZZZZZZZ2"

    db = SessionLocal()
    assert db.query(Complaint).filter(Complaint.ticket_id == first["ticket_id"]).count() == 1
    db.close()


# ---------------------------------------------------- production config guard


def test_production_refuses_default_secret_key(monkeypatch):
    from app.core.config import Settings

    s = Settings(ENVIRONMENT="production", SECRET_KEY="dev-secret-change-me")
    with pytest.raises(RuntimeError, match="SECRET_KEY"):
        s.assert_safe_for_startup()
    with pytest.raises(RuntimeError):
        Settings(ENVIRONMENT="production", SECRET_KEY="too-short").assert_safe_for_startup()
    Settings(ENVIRONMENT="production", SECRET_KEY="x" * 40).assert_safe_for_startup()  # ok


def test_non_sqlite_database_counts_as_production():
    from app.core.config import Settings

    s = Settings(ENVIRONMENT="auto", DATABASE_URL="postgresql://u:p@h/db", SECRET_KEY="dev-secret-change-me")
    assert s.is_production
    with pytest.raises(RuntimeError):
        s.assert_safe_for_startup()
    assert not Settings(ENVIRONMENT="auto", DATABASE_URL="sqlite:///./x.db").is_production


# ---------------------------------------------------------- rate limiting


@pytest.fixture()
def rate_limits_on(monkeypatch):
    from app.core.config import settings
    from app.core.ratelimit import limiter

    monkeypatch.setattr(settings, "RATE_LIMIT_ENABLED", True)
    limiter.reset()
    yield
    limiter.reset()


def test_login_is_rate_limited_per_email(client, rate_limits_on):
    codes = []
    for _ in range(12):
        r = client.post(f"{API}/auth/login", json={"email": "victim@gehu.ac.in", "password": "wrongpass1"})
        codes.append(r.status_code)
    assert codes[:10] == [401] * 10
    assert 429 in codes[10:]
    assert "Retry-After" in r.headers
    # a different account is not affected by the first one's lockout
    assert client.post(f"{API}/auth/login", json={"email": "other@gehu.ac.in", "password": "wrongpass1"}).status_code == 401


def test_otp_email_spam_is_limited(client, rate_limits_on):
    codes = [client.post(f"{API}/auth/forgot-password", json={"email": "spam@gehu.ac.in"}).status_code for _ in range(7)]
    assert codes[:5] == [200] * 5
    assert codes[5] == 429


def test_rate_limit_can_be_disabled(client):
    for _ in range(15):
        assert client.post(f"{API}/auth/login", json={"email": "free@gehu.ac.in", "password": "wrongpass1"}).status_code == 401


# ------------------------------------------------------------ photo upload


JPEG = b"\xff\xd8\xff\xe0" + b"\x00" * 64
PNG = b"\x89PNG\r\n\x1a\n" + b"\x00" * 64


def _post_with_photo(client, token, name, content, ctype="image/jpeg"):
    return client.post(f"{API}/complaints", headers=auth(token), data={
        "category": "mess", "title": "t", "description": "d", "location": "l"},
        files={"photo": (name, io.BytesIO(content), ctype)})


@pytest.fixture()
def cloudinary_fake(monkeypatch):
    from app.services import upload

    monkeypatch.setattr(upload, "_configured", True)
    calls = []

    def fake_upload(contents, **kw):
        calls.append((len(contents), kw))
        return {"secure_url": "https://res.example/x.jpg"}

    monkeypatch.setattr(upload.cloudinary.uploader, "upload", fake_upload)
    return calls


def test_photo_rejected_when_uploads_not_configured(client, sent_emails):
    stu = register_and_verify(client, sent_emails, "nophoto@gehu.ac.in")
    r = _post_with_photo(client, stu, "a.jpg", JPEG)
    assert r.status_code == 503  # explicit failure, not a silently dropped photo


def test_photo_valid_uploaded(client, sent_emails, cloudinary_fake):
    stu = register_and_verify(client, sent_emails, "goodphoto@gehu.ac.in")
    r = _post_with_photo(client, stu, "a.png", PNG, "image/png")
    assert r.status_code == 200, r.text
    assert r.json()["photo_url"] == "https://res.example/x.jpg"
    assert len(cloudinary_fake) == 1


def test_photo_wrong_type_and_disguised_file_rejected(client, sent_emails, cloudinary_fake):
    stu = register_and_verify(client, sent_emails, "badphoto@gehu.ac.in")
    # a script renamed to .jpg with an image content-type: caught by magic bytes
    r = _post_with_photo(client, stu, "evil.jpg", b"<?php echo 1; ?>" * 10, "image/jpeg")
    assert r.status_code == 415
    assert cloudinary_fake == []


def test_photo_too_large_rejected(client, sent_emails, cloudinary_fake, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "MAX_UPLOAD_MB", 1)
    stu = register_and_verify(client, sent_emails, "bigphoto@gehu.ac.in")
    r = _post_with_photo(client, stu, "big.jpg", JPEG + b"\x00" * (1024 * 1024 + 10))
    assert r.status_code == 413
    assert cloudinary_fake == []


def test_no_photo_still_works(client, sent_emails):
    stu = register_and_verify(client, sent_emails, "plain@gehu.ac.in")
    r = client.post(f"{API}/complaints", headers=auth(stu), data={
        "category": "mess", "title": "t", "description": "d", "location": "l"})
    assert r.status_code == 200 and r.json()["photo_url"] is None


# ------------------------------------------------------------ input limits


def test_field_length_limits(client, sent_emails):
    stu = register_and_verify(client, sent_emails, "limits@gehu.ac.in")
    base = {"category": "mess", "title": "t", "description": "d", "location": "l"}
    for field, too_long in (("title", "x" * 151), ("description", "x" * 2001), ("location", "x" * 151)):
        r = client.post(f"{API}/complaints", headers=auth(stu), data={**base, field: too_long})
        assert r.status_code == 422, field
    assert client.post(f"{API}/complaints", headers=auth(stu), data={**base, "title": "   "}).status_code == 422

    cid = client.post(f"{API}/complaints", headers=auth(stu), data=base).json()["id"]
    assert client.post(f"{API}/complaints/{cid}/comments", headers=auth(stu), json={"text": "x" * 1001}).status_code == 422
    assert client.post(f"{API}/complaints/{cid}/comments", headers=auth(stu), json={"text": "   "}).status_code == 422
    assert client.post(f"{API}/complaints/{cid}/comments", headers=auth(stu), json={"text": "ok"}).status_code == 200


def test_query_caps(client):
    email, pw = make_admin()
    admin = login(client, email, pw)
    assert client.get(f"{API}/complaints", headers=auth(admin), params={"limit": 100000}).status_code == 422
    assert client.get(f"{API}/analytics/trend", headers=auth(admin), params={"days": 100000}).status_code == 422
    assert client.get(f"{API}/notifications", headers=auth(admin), params={"limit": 100000}).status_code == 422


def test_registration_field_limits(client):
    r = client.post(f"{API}/auth/register", json={"name": "N" * 101, "email": "longname@gehu.ac.in", "password": "studentpass1"})
    assert r.status_code == 422
    r = client.post(f"{API}/auth/register", json={"name": "Ok", "email": "longpw@gehu.ac.in", "password": "p" * 73})
    assert r.status_code == 422
    r = client.post(f"{API}/auth/register", json={"name": "   ", "email": "blank@gehu.ac.in", "password": "studentpass1"})
    assert r.status_code == 422


# ------------------------------------------------------- status transitions


def _staff_and_complaint(client, sent_emails, tag):
    email, pw = make_admin()
    admin = login(client, email, pw)
    r = client.post(f"{API}/auth/create-staff", headers=auth(admin), json={
        "name": "W", "email": f"w_{tag}@gehu.ac.in", "password": "wardenpass1", "role": "warden", "handles_category": "cleanliness"})
    assert r.status_code == 200, r.text
    wid = r.json()["id"]
    warden = login(client, f"w_{tag}@gehu.ac.in", "wardenpass1")
    stu = register_and_verify(client, sent_emails, f"st_{tag}@gehu.ac.in")
    cid = client.post(f"{API}/complaints", headers=auth(stu), data={
        "category": "cleanliness", "title": "t", "description": "d", "location": "l"}).json()["id"]
    # other tests may have created earlier cleanliness wardens: pin it to ours
    assert client.patch(f"{API}/complaints/{cid}/assign", headers=auth(admin), json={"warden_id": wid}).status_code == 200
    return admin, warden, stu, cid


def _set(client, token, cid, status):
    return client.patch(f"{API}/complaints/{cid}/status", headers=auth(token), json={"status": status})


def test_warden_transitions(client, sent_emails):
    admin, warden, stu, cid = _staff_and_complaint(client, sent_emails, "sm1")
    assert _set(client, warden, cid, "pending").status_code == 400  # same status
    assert _set(client, warden, cid, "escalated").status_code == 400  # system/admin only
    assert _set(client, warden, cid, "in_progress").status_code == 200
    assert _set(client, warden, cid, "resolved").status_code == 200
    # resolved is final for wardens: only the student can reopen
    assert _set(client, warden, cid, "pending").status_code == 400
    assert _set(client, warden, cid, "in_progress").status_code == 400
    r = client.post(f"{API}/complaints/{cid}/reopen", headers=auth(stu), json={"reason": "not fixed at all"})
    assert r.status_code == 200 and r.json()["status"] == "pending"


def test_admin_extra_transitions(client, sent_emails):
    admin, warden, stu, cid = _staff_and_complaint(client, sent_emails, "sm2")
    assert _set(client, admin, cid, "escalated").status_code == 200
    assert _set(client, warden, cid, "in_progress").status_code == 200  # warden takes it back
    assert _set(client, admin, cid, "resolved").status_code == 200
    assert _set(client, admin, cid, "in_progress").status_code == 200  # admin may reopen
    assert _set(client, admin, cid, "resolved").status_code == 200
    assert _set(client, admin, cid, "pending").status_code == 400


def test_allowed_transition_tables_are_consistent():
    from app.crud.complaint import ADMIN_TRANSITIONS, WARDEN_TRANSITIONS
    from app.models.complaint import ComplaintStatus

    for table in (ADMIN_TRANSITIONS, WARDEN_TRANSITIONS):
        assert set(table) == set(ComplaintStatus)
        for src, dsts in table.items():
            assert src not in dsts
    for src, dsts in WARDEN_TRANSITIONS.items():
        assert dsts <= ADMIN_TRANSITIONS[src]


# ------------------------------------------------------------- escalation


def _age(cid, **delta):
    from app.db.database import SessionLocal
    from app.models.complaint import Complaint

    db = SessionLocal()
    c = db.query(Complaint).filter(Complaint.id == cid).first()
    c.created_at = datetime.now(timezone.utc) - timedelta(**delta)
    db.commit()
    db.close()


def _status(cid):
    from app.db.database import SessionLocal
    from app.models.complaint import Complaint

    db = SessionLocal()
    st = db.query(Complaint).filter(Complaint.id == cid).first().status
    db.close()
    return st


def test_escalation_uses_per_category_sla_and_is_idempotent(client, sent_emails):
    from app.db.database import SessionLocal
    from app.models.complaint import Complaint, ComplaintStatus
    from app.models.status_history import StatusHistory
    from app.services.escalation import run_escalation_check

    stu = register_and_verify(client, sent_emails, "esc_sla@gehu.ac.in")
    mk = lambda cat: client.post(f"{API}/complaints", headers=auth(stu), data={
        "category": cat, "title": "t", "description": "d", "location": "l"}).json()["id"]
    normal_old, normal_new, rag_old, rag_new = mk("mess"), mk("mess"), mk("ragging"), mk("ragging")
    _age(normal_old, hours=49)
    _age(normal_new, hours=10)
    _age(rag_old, hours=7)
    _age(rag_new, hours=2)

    run_escalation_check()
    run_escalation_check()  # second run must not escalate / log / notify again

    assert _status(normal_old) == ComplaintStatus.escalated
    assert _status(normal_new) == ComplaintStatus.pending
    assert _status(rag_old) == ComplaintStatus.escalated
    assert _status(rag_new) == ComplaintStatus.pending

    db = SessionLocal()
    n = db.query(StatusHistory).filter(StatusHistory.complaint_id == normal_old, StatusHistory.status == ComplaintStatus.escalated).count()
    db.close()
    assert n == 1


def test_escalation_skips_complaint_resolved_meanwhile(client, sent_emails, monkeypatch):
    """If another worker/user changes the status between the SELECT and the claim,
    the conditional UPDATE must not overwrite it."""
    from app.models.complaint import ComplaintStatus
    from app.services import escalation

    stu = register_and_verify(client, sent_emails, "esc_race@gehu.ac.in")
    cid = client.post(f"{API}/complaints", headers=auth(stu), data={
        "category": "mess", "title": "t", "description": "d", "location": "l"}).json()["id"]
    _age(cid, hours=60)
    email, pw = make_admin()
    admin = login(client, email, pw)

    real_update = escalation.update

    def racing_update(*a, **kw):
        _set(client, admin, cid, "resolved")  # resolved right before we claim it
        return real_update(*a, **kw)

    monkeypatch.setattr(escalation, "update", racing_update)
    escalation.run_escalation_check()
    assert _status(cid) == ComplaintStatus.resolved
