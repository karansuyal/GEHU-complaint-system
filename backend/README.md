# GEHU Bhimtal — Complaint Portal (Backend)

FastAPI backend for the campus complaint management system.

## Setup

```bash
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # SQLite works out of the box, no edits needed for local dev
```

The database schema is managed by **Alembic**. You don't have to run anything:
the app applies pending migrations on startup, and an older database created
before Alembic existed is adopted in place (your data is kept). To run them by
hand, or when you change a model:

```bash
alembic upgrade head                              # apply migrations
alembic revision --autogenerate -m "add thing"   # after editing a model
alembic check                                     # fails if models and migrations disagree
```

## Emails (Brevo)

The portal sends real, branded HTML emails (plain-text part included) through the
Brevo transactional API over HTTPS, so it works on hosts that block SMTP.

| Email | When |
|---|---|
| Verification code | signup / resend |
| Welcome | after the email is verified |
| Password reset code | forgot password |
| Password changed (security alert) | after a reset, or when an admin resets a staff password |
| Complaint received (with ticket no.) | student files a complaint. Anonymous/ragging ones stay generic |
| New complaint / status change / escalation | copy of the in-app notification (`EMAIL_NOTIFY_TYPES`) |
| Staff account created | admin adds a warden/admin (the password is never emailed) |

Setup:

1. Brevo > **Senders, Domains & Dedicated IPs** > add and verify a sender address.
2. Brevo > **SMTP & API** > **API Keys** > generate a key (starts with `xkeysib-`).
3. Brevo > **Security** > **Authorised IPs**: deactivate the blocking (cloud hosts change IP).
4. Put `BREVO_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME` in `.env` (see `.env.example`).
5. Check it: `python send_test_email.py you@example.com`. `GET /api/v1/health` also shows
   `email_provider` (`brevo`, `smtp` or `console`).

Sending never blocks or breaks a request: failures are logged, 429/5xx are retried, and
notification emails go out on a background thread. The free Brevo plan allows 300 emails/day.
For best inbox placement authenticate your own domain (SPF/DKIM/DMARC) in Brevo.

## Email verification and password reset

New students must prove they own their email. `POST /auth/register` creates the
account and emails a 6-digit code (valid 10 minutes, 5 wrong attempts, 60 s resend
cooldown); `POST /auth/verify-email` completes signup and logs them in.
"Forgot password" uses the same mechanism (`/auth/forgot-password` then
`/auth/reset-password`).

- **Local dev:** leave `BREVO_API_KEY` and `SMTP_HOST` blank. Emails are printed
  in the backend console instead of being sent.
- **Production (Brevo):** see the next section. Also set
  `ALLOWED_EMAIL_DOMAINS=gehu.ac.in` so only college emails can register.
- `REQUIRE_EMAIL_VERIFICATION=false` skips OTPs (quick testing only).
- Staff accounts created by an admin are verified immediately.

## Tests

```bash
pip install -r requirements-dev.txt
python -m pytest -q
```

## Create your first admin account

Registration (`/auth/register`) only ever creates **student** accounts, and
creating warden/admin accounts (`/auth/create-staff`) requires an existing
admin token — so run this once to bootstrap the first admin:

```bash
python seed_admin.py
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

API docs (Swagger): http://localhost:8000/docs

## Then, as that admin:

1. Log in via `/auth/login` to get a token.
2. Use `/auth/create-staff` (with the token) to create warden accounts —
   each warden needs `handles_category` set (e.g. `maintenance`, `mess`).
   Wardens can never be assigned `ragging`.
3. Students self-register via `/auth/register` from the frontend.

## Core design decisions

- **Ragging complaints are structurally isolated.** `category == ragging`
  forces `is_anonymous = True` and `assigned_warden_id` is never set — not
  just skipped by convention, but literally impossible to assign, so a
  warden's `/complaints/assigned` query can never return one. Only `admin`
  role can see them, via `/complaints` (all) or `/complaints/{id}` (direct).
- **Auto-escalation.** A background job (APScheduler) runs every 15 minutes
  and escalates any complaint still `pending`/`in_progress` past its SLA —
  48h default, 6h for ragging (configurable via `.env`). Escalation also
  fires a notification to whoever owns the complaint.
- **Anonymity in comments.** If a complaint is anonymous, the filer's own
  comments show as "Student (anonymous)" rather than their real name — even
  though the DB always keeps the real `student_id` link for admin audit.
- **SQLite by default, Postgres-ready.** Just swap `DATABASE_URL` in `.env`
  for production; SQLAlchemy handles both identically here.
- **Notifications are in-app first, push second.** Every notification is
  always written to the `notifications` table regardless of whether push is
  configured — so the bell in the UI always works. Web Push (VAPID) is a
  best-effort fan-out on top: a dead/expired subscription is quietly
  removed rather than retried forever, and any other push failure is
  logged, never raised (it never blocks the request that triggered it).
- **Presence has no sockets.** `/presence/heartbeat` just bumps
  `User.last_seen`; `/presence/staff-online` counts wardens/admins whose
  last heartbeat is within `PRESENCE_ONLINE_WINDOW_SECONDS` (default 90s).
  Simple, stateless, and fine at this scale.

- **Reopen restarts the SLA.** Reopening a resolved complaint sets it back to
  `pending`, clears the old rating and measures the escalation deadline from the
  reopen time, not from the original filing date.
- **Deactivating a warden never strands complaints.** Their open complaints move
  to another active warden in the same category, or become unassigned (which puts
  them in front of the admins). The same happens when a warden's category changes.
- **Search respects visibility.** `/complaints/search` narrows an already
  role-restricted query, so a warden can't surface a ragging complaint by
  filtering for it.

## Push notifications (Web Push / VAPID)

```bash
python generate_vapid_keys.py
```

Paste the two printed values into `.env` as `VAPID_PUBLIC_KEY` and
`VAPID_PRIVATE_KEY`. Restart the backend. The frontend will pick the public
key up automatically from `/notifications/push/vapid-public-key` — no
frontend `.env` edit required, though you can also set
`VITE_VAPID_PUBLIC_KEY` there directly. Leaving the keys blank simply
disables push; in-app notifications (the bell) work regardless.

## Routes

| Method | Path | Role |
|---|---|---|
| POST | `/api/v1/auth/register` | public (creates student) |
| POST | `/api/v1/auth/verify-email` | public - finishes signup, returns a token |
| POST | `/api/v1/auth/resend-otp` | public |
| POST | `/api/v1/auth/forgot-password` | public |
| POST | `/api/v1/auth/reset-password` | public |
| POST | `/api/v1/auth/login` | public |
| GET | `/api/v1/auth/me` | any logged-in user |
| POST | `/api/v1/auth/create-staff` | admin only |
| POST | `/api/v1/complaints` | student |
| GET | `/api/v1/complaints/mine` | student |
| GET | `/api/v1/complaints/assigned` | warden |
| GET | `/api/v1/complaints` | admin |
| GET | `/api/v1/complaints/search` | any role - filtered/paginated, sees only what that role may see |
| POST | `/api/v1/complaints/{id}/feedback` | student (own, resolved only) - 1-5 rating |
| POST | `/api/v1/complaints/{id}/reopen` | student (own, resolved, within `REOPEN_WINDOW_DAYS`) |
| PATCH | `/api/v1/complaints/{id}/assign` | admin - reassign to a warden or unassign |
| GET | `/api/v1/staff` | admin - wardens/admins with workload and average rating |
| PATCH | `/api/v1/staff/{id}` | admin - rename, change category, deactivate/reactivate |
| POST | `/api/v1/staff/{id}/reset-password` | admin |
| GET | `/api/v1/complaints/{id}` | student (own) / warden (assigned) / admin |
| PATCH | `/api/v1/complaints/{id}/status` | warden / admin |
| POST | `/api/v1/complaints/{id}/comments` | any visible-to role |
| GET | `/api/v1/analytics/overview` | admin |
| GET | `/api/v1/analytics/categories` | admin |
| GET | `/api/v1/analytics/trend` | admin — daily filed vs. resolved, `?days=` |
| GET | `/api/v1/analytics/resolution-time` | admin — avg hours to resolve, last 30d |
| GET | `/api/v1/notifications` | any logged-in user |
| GET | `/api/v1/notifications/unread-count` | any logged-in user |
| POST | `/api/v1/notifications/{id}/read` | any logged-in user (own) |
| POST | `/api/v1/notifications/read-all` | any logged-in user |
| GET | `/api/v1/notifications/push/vapid-public-key` | any logged-in user |
| POST | `/api/v1/notifications/push/subscribe` | any logged-in user |
| POST | `/api/v1/notifications/push/unsubscribe` | any logged-in user |
| POST | `/api/v1/presence/heartbeat` | any logged-in user |
| GET | `/api/v1/presence/staff-online` | any logged-in user |
