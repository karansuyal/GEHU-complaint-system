# GEHU Bhimtal Complaint Portal

Campus complaint management for GEHU Bhimtal: students file and track complaints (mess, wifi, maintenance,
security, cleanliness, ragging), wardens work their queue, admins oversee everything. Ragging complaints are
always anonymous and are never visible to wardens.

| Part | Stack | Docs |
|---|---|---|
| `backend/` | FastAPI, SQLAlchemy, Alembic, APScheduler, Brevo email, Web Push | [backend/README.md](backend/README.md) |
| `frontend/` | React 18, Vite, Tailwind, installable PWA | [frontend/README.md](frontend/README.md) |

## Quick start

```bash
# 1. Backend (http://localhost:8000/docs)
cd backend
python -m venv venv && source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python seed_admin.py                                  # creates the first admin
uvicorn app.main:app --reload --port 8000

# 2. Frontend (http://localhost:5173), in another terminal
cd frontend
cp .env.example .env
npm install
npm run dev
```

## Tests

```bash
cd backend  && pip install -r requirements-dev.txt && python -m pytest -q
cd frontend && npm test
```

GitHub Actions (`.github/workflows/ci.yml`) runs both suites, the frontend build and `alembic check` on every push and PR.

## Deploying: checklist

1. **Backend env:** `ENVIRONMENT=production`, a strong `SECRET_KEY` (the app will not start without one),
   Postgres `DATABASE_URL`, `FRONTEND_ORIGIN=https://<your frontend>`, `ALLOWED_EMAIL_DOMAINS=gehu.ac.in`,
   Brevo and Cloudinary credentials, and `TRUST_PROXY_HEADERS=true` if the host puts a proxy in front of the app.
2. **Frontend env:** `VITE_API_URL=https://<your backend>/api/v1`.
3. **Several backend instances?** Set `RUN_SCHEDULER=false` on all but one, and move rate limiting to Redis.
4. Frontend security headers (CSP etc.) are configured in `frontend/vercel.json`. If you change the inline theme
   script in `frontend/index.html`, update its `sha256-...` hash in the CSP (the browser console shows the new one).
