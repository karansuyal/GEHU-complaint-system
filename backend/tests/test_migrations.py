"""Databases created by the old Base.metadata.create_all() (no Alembic) must be
adopted in place, without losing data."""
import os
import sqlite3
import subprocess
import sys
import textwrap
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]


def _run(args, env, code=None):
    cmd = [sys.executable, "-c", code] if code else [sys.executable, "-m", "alembic", *args]
    return subprocess.run(cmd, cwd=BACKEND, env=env, capture_output=True, text=True)


def test_legacy_database_is_upgraded_in_place(tmp_path):
    db_path = tmp_path / "legacy.db"
    env = {**os.environ, "DATABASE_URL": f"sqlite:///{db_path}"}

    # Revision 0001 IS the pre-Alembic schema. Build it, add data, then remove
    # alembic_version so the DB looks exactly like one made by create_all().
    assert _run(["upgrade", "0001"], env).returncode == 0
    con = sqlite3.connect(db_path)
    con.execute(
        "INSERT INTO users (id, name, email, hashed_password, role, campus) "
        "VALUES ('u1', 'Old Student', 'old@gehu.ac.in', 'x', 'student', 'bhimtal')"
    )
    con.execute(
        "INSERT INTO complaints (id, ticket_id, student_id, campus, category, title, description, "
        "location, is_anonymous, status, created_at, updated_at) VALUES "
        "('c1', 'GEHU-00001', 'u1', 'bhimtal', 'mess', 'Old complaint', 'd', 'l', 0, 'resolved', "
        "'2026-01-01 10:00:00', '2026-01-02 10:00:00')"
    )
    con.execute("DROP TABLE alembic_version")
    con.commit()
    con.close()

    check = textwrap.dedent(
        """
        from app.db.migrate import run_migrations
        from app.db.database import SessionLocal
        from app.models.user import User
        from app.models.complaint import Complaint
        run_migrations()
        run_migrations()  # must be idempotent
        db = SessionLocal()
        u = db.query(User).filter(User.email == "old@gehu.ac.in").one()
        assert u.is_verified is True and u.is_active is True, (u.is_verified, u.is_active)
        c = db.query(Complaint).one()
        assert c.title == "Old complaint" and c.reopened_count == 0
        assert c.resolved_at is not None, "resolved complaints get a resolved_at backfill"
        print("upgrade ok")
        """
    )
    r = _run(None, env, check)
    assert r.returncode == 0, r.stdout + r.stderr
    assert "upgrade ok" in r.stdout


def test_models_and_migrations_agree(tmp_path):
    env = {**os.environ, "DATABASE_URL": f"sqlite:///{tmp_path}/fresh.db"}
    assert _run(["upgrade", "head"], env).returncode == 0
    chk = _run(["check"], env)
    assert chk.returncode == 0, chk.stdout + chk.stderr
