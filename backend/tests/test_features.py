from datetime import datetime, timedelta, timezone

import pytest

from tests.conftest import last_code

API = "/api/v1"


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def make_admin(email="admin@gehu.ac.in", password="adminpass1"):
    from app.core.security import hash_password
    from app.db.database import SessionLocal
    from app.models.user import User, UserRole

    db = SessionLocal()
    if not db.query(User).filter(User.email == email).first():
        db.add(User(name="Admin", email=email, hashed_password=hash_password(password),
                    role=UserRole.admin, campus="bhimtal", is_verified=True, is_active=True))
        db.commit()
    db.close()
    return email, password


def login(client, email, password):
    r = client.post(f"{API}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def register_and_verify(client, sent, email, name="Stu Dent", password="studentpass1"):
    r = client.post(f"{API}/auth/register", json={"name": name, "email": email, "password": password,
                                                  "enrollment_no": "E1", "hostel_block": "C"})
    assert r.status_code == 200, r.text
    assert r.json()["requires_verification"] is True
    assert r.json().get("access_token") is None
    r = client.post(f"{API}/auth/verify-email", json={"email": email, "otp": last_code(sent, email)})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


# ------------------------------------------------------------------ auth


def test_health_after_migrations(client):
    assert client.get(f"{API}/health").json()["status"] == "ok"


def test_register_verify_login_flow(client, sent_emails):
    email = "flow1@gehu.ac.in"
    r = client.post(f"{API}/auth/register", json={"name": "F One", "email": email, "password": "password123"})
    assert r.json()["requires_verification"] is True

    # cannot log in before verifying, and a fresh code is sent
    sent_emails.clear()
    r = client.post(f"{API}/auth/login", json={"email": email, "password": "password123"})
    assert r.status_code == 403 and r.json()["detail"] == "email_not_verified"
    code = last_code(sent_emails, email)

    # wrong code, then right code
    r = client.post(f"{API}/auth/verify-email", json={"email": email, "otp": "000000" if code != "000000" else "111111"})
    assert r.status_code == 400
    r = client.post(f"{API}/auth/verify-email", json={"email": email, "otp": code})
    assert r.status_code == 200 and r.json()["user"]["email"] == email
    # code is single-use
    r = client.post(f"{API}/auth/verify-email", json={"email": email, "otp": code})
    assert r.status_code == 400
    assert client.post(f"{API}/auth/login", json={"email": email, "password": "password123"}).status_code == 200


def test_wrong_password_never_reveals_verification_state(client, sent_emails):
    r = client.post(f"{API}/auth/register", json={"name": "X", "email": "flow2@gehu.ac.in", "password": "password123"})
    r = client.post(f"{API}/auth/login", json={"email": "flow2@gehu.ac.in", "password": "WRONGPASS"})
    assert r.status_code == 401


def test_otp_lockout_after_too_many_attempts(client, sent_emails):
    email = "lock@gehu.ac.in"
    client.post(f"{API}/auth/register", json={"name": "L", "email": email, "password": "password123"})
    good = last_code(sent_emails, email)
    bad = "000000" if good != "000000" else "111111"
    statuses = [client.post(f"{API}/auth/verify-email", json={"email": email, "otp": bad}).status_code for _ in range(6)]
    assert statuses[:5] == [400] * 5 and statuses[5] == 429
    # after lockout even the right (old) code no longer works
    assert client.post(f"{API}/auth/verify-email", json={"email": email, "otp": good}).status_code == 400


def test_resend_cooldown(client, sent_emails, monkeypatch):
    from app.core.config import settings

    email = "cool@gehu.ac.in"
    monkeypatch.setattr(settings, "OTP_RESEND_COOLDOWN_SECONDS", 60)
    client.post(f"{API}/auth/register", json={"name": "C", "email": email, "password": "password123"})
    n = len(sent_emails)
    r = client.post(f"{API}/auth/resend-otp", json={"email": email})
    assert r.status_code == 200
    assert len(sent_emails) == n  # blocked by cooldown, silently


def test_unverified_signup_can_be_restarted(client, sent_emails):
    email = "restart@gehu.ac.in"
    client.post(f"{API}/auth/register", json={"name": "Old", "email": email, "password": "oldpassword1"})
    r = client.post(f"{API}/auth/register", json={"name": "New", "email": email, "password": "newpassword1"})
    assert r.status_code == 200
    client.post(f"{API}/auth/verify-email", json={"email": email, "otp": last_code(sent_emails, email)})
    assert client.post(f"{API}/auth/login", json={"email": email, "password": "newpassword1"}).status_code == 200
    # verified account can't be re-registered
    assert client.post(f"{API}/auth/register", json={"name": "Z", "email": email, "password": "whatever123"}).status_code == 400


def test_password_reset(client, sent_emails):
    email = "reset@gehu.ac.in"
    register_and_verify(client, sent_emails, email, password="firstpassword1")
    # unknown email gives the same response, sends nothing
    n = len(sent_emails)
    assert client.post(f"{API}/auth/forgot-password", json={"email": "nobody@gehu.ac.in"}).status_code == 200
    assert len(sent_emails) == n

    assert client.post(f"{API}/auth/forgot-password", json={"email": email}).status_code == 200
    code = last_code(sent_emails, email)
    r = client.post(f"{API}/auth/reset-password", json={"email": email, "otp": code, "new_password": "secondpassword2"})
    assert r.status_code == 200
    assert client.post(f"{API}/auth/login", json={"email": email, "password": "firstpassword1"}).status_code == 401
    assert client.post(f"{API}/auth/login", json={"email": email, "password": "secondpassword2"}).status_code == 200
    # a verify-purpose code can't be used to reset
    assert client.post(f"{API}/auth/reset-password", json={"email": email, "otp": code, "new_password": "thirdpassword3"}).status_code == 400


def test_domain_restriction(client, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "ALLOWED_EMAIL_DOMAINS", "gehu.ac.in")
    r = client.post(f"{API}/auth/register", json={"name": "G", "email": "someone@gmail.com", "password": "password123"})
    assert r.status_code == 400 and "gehu.ac.in" in r.json()["detail"]


def test_verification_can_be_switched_off(client, monkeypatch):
    from app.core.config import settings

    monkeypatch.setattr(settings, "REQUIRE_EMAIL_VERIFICATION", False)
    r = client.post(f"{API}/auth/register", json={"name": "Q", "email": "quick@gehu.ac.in", "password": "password123"})
    assert r.status_code == 200 and r.json()["requires_verification"] is False and r.json()["access_token"]


# ------------------------------------------------------------------ staff


def test_staff_management_and_reassignment(client, sent_emails):
    email, pw = make_admin()
    admin = login(client, email, pw)

    def create(name, mail, cat):
        r = client.post(f"{API}/auth/create-staff", headers=auth(admin), json={
            "name": name, "email": mail, "password": "wardenpass1", "role": "warden", "handles_category": cat})
        assert r.status_code == 200, r.text
        return r.json()["id"]

    w1 = create("Warden One", "w1@gehu.ac.in", "wifi")
    w2 = create("Warden Two", "w2@gehu.ac.in", "wifi")
    # staff are verified immediately
    assert client.post(f"{API}/auth/login", json={"email": "w1@gehu.ac.in", "password": "wardenpass1"}).status_code == 200

    staff = client.get(f"{API}/staff", headers=auth(admin)).json()
    assert {s["email"] for s in staff} >= {"w1@gehu.ac.in", "w2@gehu.ac.in", email}

    # a student files a wifi complaint -> goes to first wifi warden
    stu = register_and_verify(client, sent_emails, "wifi_student@gehu.ac.in")
    r = client.post(f"{API}/complaints", headers=auth(stu), data={
        "category": "wifi", "title": "Wifi down in C block", "description": "no internet", "location": "C-214"})
    assert r.status_code == 200, r.text
    cid = r.json()["id"]
    owner = r.json()["assigned_warden_id"]
    assert owner in (w1, w2)
    other = w2 if owner == w1 else w1

    # deactivating the owner hands the open complaint to the other wifi warden
    r = client.patch(f"{API}/staff/{owner}", headers=auth(admin), json={"is_active": False})
    assert r.status_code == 200 and r.json()["is_active"] is False
    c = client.get(f"{API}/complaints/{cid}", headers=auth(admin)).json()
    assert c["assigned_warden_id"] == other
    # a deactivated account is locked out
    owner_email = "w1@gehu.ac.in" if owner == w1 else "w2@gehu.ac.in"
    r = client.post(f"{API}/auth/login", json={"email": owner_email, "password": "wardenpass1"})
    assert r.status_code == 403 and r.json()["detail"] == "account_disabled"

    # with nobody left in that category the complaint becomes unassigned (admin's)
    client.patch(f"{API}/staff/{other}", headers=auth(admin), json={"is_active": False})
    assert client.get(f"{API}/complaints/{cid}", headers=auth(admin)).json()["assigned_warden_id"] is None

    # guards
    admin_id = [s["id"] for s in staff if s["email"] == email][0]
    assert client.patch(f"{API}/staff/{admin_id}", headers=auth(admin), json={"is_active": False}).status_code == 400
    assert client.patch(f"{API}/staff/{w1}", headers=auth(admin), json={"handles_category": "ragging"}).status_code == 400
    assert client.post(f"{API}/staff/{w1}/reset-password", headers=auth(admin), json={"new_password": "brandnewpass1"}).status_code == 200
    assert client.get(f"{API}/staff", headers=auth(stu)).status_code == 403


def test_admin_manual_assign_rules(client, sent_emails):
    email, pw = make_admin()
    admin = login(client, email, pw)
    r = client.post(f"{API}/auth/create-staff", headers=auth(admin), json={
        "name": "Mess Warden", "email": "mess@gehu.ac.in", "password": "wardenpass1", "role": "warden", "handles_category": "mess"})
    wid = r.json()["id"]
    stu = register_and_verify(client, sent_emails, "assign_student@gehu.ac.in")
    cid = client.post(f"{API}/complaints", headers=auth(stu), data={
        "category": "cleanliness", "title": "Dirty corridor", "description": "d", "location": "B"}).json()["id"]
    r = client.patch(f"{API}/complaints/{cid}/assign", headers=auth(admin), json={"warden_id": wid})
    assert r.status_code == 200 and r.json()["assigned_warden_name"] == "Mess Warden"

    rid = client.post(f"{API}/complaints", headers=auth(stu), data={
        "category": "ragging", "title": "Ragging", "description": "d", "location": "B"}).json()["id"]
    assert client.patch(f"{API}/complaints/{rid}/assign", headers=auth(admin), json={"warden_id": wid}).status_code == 400
    assert client.patch(f"{API}/complaints/{cid}/assign", headers=auth(stu), json={"warden_id": wid}).status_code == 403


# ------------------------------------------------------- feedback / reopen


@pytest.fixture()
def resolved_complaint(client, sent_emails):
    email, pw = make_admin()
    admin = login(client, email, pw)
    stu = register_and_verify(client, sent_emails, f"fb{datetime.now().timestamp()}@gehu.ac.in")
    cid = client.post(f"{API}/complaints", headers=auth(stu), data={
        "category": "security", "title": "Gate light broken", "description": "d", "location": "Gate"}).json()["id"]
    r = client.patch(f"{API}/complaints/{cid}/status", headers=auth(admin), json={"status": "resolved"})
    assert r.status_code == 200
    return stu, admin, cid


def test_feedback_only_when_resolved_and_once(client, sent_emails, resolved_complaint):
    stu, admin, cid = resolved_complaint
    assert client.post(f"{API}/complaints/{cid}/feedback", headers=auth(stu), json={"rating": 6}).status_code == 422
    r = client.post(f"{API}/complaints/{cid}/feedback", headers=auth(stu), json={"rating": 4, "comment": "ok"})
    assert r.status_code == 200 and r.json()["rating"] == 4
    assert client.post(f"{API}/complaints/{cid}/feedback", headers=auth(stu), json={"rating": 5}).status_code == 409
    assert client.post(f"{API}/complaints/{cid}/feedback", headers=auth(admin), json={"rating": 5}).status_code == 403

    # not resolved -> can't rate
    s2 = register_and_verify(client, sent_emails, "fb_open@gehu.ac.in")
    c2 = client.post(f"{API}/complaints", headers=auth(s2), data={
        "category": "security", "title": "t", "description": "d", "location": "l"}).json()["id"]
    assert client.post(f"{API}/complaints/{c2}/feedback", headers=auth(s2), json={"rating": 3}).status_code == 400


def test_reopen_flow_and_window(client, resolved_complaint):
    stu, admin, cid = resolved_complaint
    c = client.get(f"{API}/complaints/{cid}", headers=auth(stu)).json()
    assert c["reopen_deadline"] is not None
    client.post(f"{API}/complaints/{cid}/feedback", headers=auth(stu), json={"rating": 2})

    assert client.post(f"{API}/complaints/{cid}/reopen", headers=auth(stu), json={"reason": "no"}).status_code == 422
    r = client.post(f"{API}/complaints/{cid}/reopen", headers=auth(stu), json={"reason": "Light is still broken"})
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "pending" and body["reopened_count"] == 1
    assert body["rating"] is None and body["reopen_deadline"] is None
    assert any("Light is still broken" in cm["text"] for cm in body["comments"])
    assert body["status_history"][-1]["status"] == "pending"
    # can't reopen something that isn't resolved
    assert client.post(f"{API}/complaints/{cid}/reopen", headers=auth(stu), json={"reason": "again again"}).status_code == 400

    # window expiry
    client.patch(f"{API}/complaints/{cid}/status", headers=auth(admin), json={"status": "resolved"})
    from app.db.database import SessionLocal
    from app.models.complaint import Complaint

    db = SessionLocal()
    c = db.query(Complaint).filter(Complaint.id == cid).first()
    c.resolved_at = datetime.now(timezone.utc) - timedelta(days=30)
    db.commit()
    db.close()
    r = client.post(f"{API}/complaints/{cid}/reopen", headers=auth(stu), json={"reason": "too late now"})
    assert r.status_code == 400 and "window" in r.json()["detail"]


def test_reopen_restarts_sla_clock(client, resolved_complaint):
    from app.db.database import SessionLocal
    from app.models.complaint import Complaint, ComplaintStatus
    from app.services.escalation import run_escalation_check

    stu, admin, cid = resolved_complaint
    client.post(f"{API}/complaints/{cid}/reopen", headers=auth(stu), json={"reason": "Still broken!!"})
    db = SessionLocal()
    c = db.query(Complaint).filter(Complaint.id == cid).first()
    c.created_at = datetime.now(timezone.utc) - timedelta(days=10)  # originally filed long ago
    db.commit()
    db.close()

    run_escalation_check()
    db = SessionLocal()
    assert db.query(Complaint).filter(Complaint.id == cid).first().status == ComplaintStatus.pending  # fresh SLA
    c = db.query(Complaint).filter(Complaint.id == cid).first()
    c.reopened_at = datetime.now(timezone.utc) - timedelta(hours=72)
    db.commit()
    db.close()
    run_escalation_check()
    db = SessionLocal()
    assert db.query(Complaint).filter(Complaint.id == cid).first().status == ComplaintStatus.escalated
    db.close()


# ----------------------------------------------------------------- search


def test_search_filters_pagination_and_visibility(client, sent_emails):
    email, pw = make_admin()
    admin = login(client, email, pw)
    r = client.post(f"{API}/auth/create-staff", headers=auth(admin), json={
        "name": "Clean Warden", "email": "clean@gehu.ac.in", "password": "wardenpass1", "role": "warden", "handles_category": "cleanliness"})
    warden = login(client, "clean@gehu.ac.in", "wardenpass1")
    s1 = register_and_verify(client, sent_emails, "srch1@gehu.ac.in")
    s2 = register_and_verify(client, sent_emails, "srch2@gehu.ac.in")

    for i in range(5):
        client.post(f"{API}/complaints", headers=auth(s1), data={
            "category": "cleanliness", "title": f"Zebra corridor dirty {i}", "description": "muddy", "location": "Block Z"})
    client.post(f"{API}/complaints", headers=auth(s2), data={
        "category": "cleanliness", "title": "Other student's issue", "description": "x", "location": "Block Y"})
    client.post(f"{API}/complaints", headers=auth(s1), data={
        "category": "ragging", "title": "Zebra ragging secret", "description": "x", "location": "Block Z"})

    # admin: text search + pagination
    r = client.get(f"{API}/complaints/search", headers=auth(admin), params={"q": "zebra", "page_size": 2, "page": 1}).json()
    assert r["total"] == 6 and r["pages"] == 3 and len(r["items"]) == 2
    r = client.get(f"{API}/complaints/search", headers=auth(admin), params={"q": "zebra", "category": "ragging"}).json()
    assert r["total"] == 1
    # LIKE wildcards are treated literally
    assert client.get(f"{API}/complaints/search", headers=auth(admin), params={"q": "%"}).json()["total"] == 0
    # date filter (future range -> nothing)
    assert client.get(f"{API}/complaints/search", headers=auth(admin), params={"date_from": "2999-01-01"}).json()["total"] == 0
    # unassigned filter includes the ragging one
    un = client.get(f"{API}/complaints/search", headers=auth(admin), params={"unassigned": True, "q": "zebra"}).json()
    assert un["total"] == 1 and un["items"][0]["category"] == "ragging"

    # warden never sees ragging, even when searching for it explicitly
    w = client.get(f"{API}/complaints/search", headers=auth(warden), params={"q": "zebra"}).json()
    assert w["total"] == 5 and all(i["category"] != "ragging" for i in w["items"])
    assert client.get(f"{API}/complaints/search", headers=auth(warden), params={"category": "ragging"}).json()["total"] == 0

    # student only sees own
    st = client.get(f"{API}/complaints/search", headers=auth(s2)).json()
    assert st["total"] == 1 and st["items"][0]["title"] == "Other student's issue"

    # bad params
    assert client.get(f"{API}/complaints/search", headers=auth(admin), params={"page_size": 1000}).status_code == 422
    assert client.get(f"{API}/complaints/search", headers=auth(admin), params={"status": "nope"}).status_code == 422


def test_analytics_overview_new_fields(client):
    email, pw = make_admin()
    admin = login(client, email, pw)
    o = client.get(f"{API}/analytics/overview", headers=auth(admin)).json()
    assert {"avg_rating", "unassigned", "reopened"} <= set(o)
