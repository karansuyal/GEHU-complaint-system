from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import settings
from app.db.migrate import run_migrations
from app.api.routes import auth, complaints, analytics, notifications, presence, staff
from app.services.escalation import run_escalation_check

# Import models so SQLAlchemy sees them before create_all
from app import models  # noqa: F401

scheduler = BackgroundScheduler()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Schema is managed by Alembic (see alembic/versions). Also adopts old
    # create_all() databases automatically.
    run_migrations()
    # Check for SLA-breached complaints every 15 minutes.
    scheduler.add_job(run_escalation_check, "interval", minutes=15, id="escalation_check")
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="GEHU Bhimtal Complaint Portal API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(complaints.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(presence.router, prefix="/api/v1")
app.include_router(staff.router, prefix="/api/v1")


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "campus": settings.CAMPUS_NAME, "email_provider": settings.email_provider}
