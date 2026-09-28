"""Runs Alembic migrations programmatically at app startup.

Three situations are handled so nobody has to think about it:
  1. Fresh database          -> upgrade head builds everything.
  2. Already on Alembic      -> upgrade head applies whatever is new.
  3. Legacy database created by the old Base.metadata.create_all() (tables
     exist, no alembic_version) -> mark it as the baseline revision, then
     upgrade head, so existing data is kept and new columns are added.
"""
import logging
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect

from app.db.database import Base, engine

logger = logging.getLogger(__name__)

BACKEND_DIR = Path(__file__).resolve().parents[2]
BASELINE_REVISION = "0001"
# Tables that existed in the baseline schema (before Alembic was introduced).
BASELINE_TABLES = {
    "users",
    "complaints",
    "status_history",
    "comments",
    "notifications",
    "push_subscriptions",
}


def _alembic_config() -> Config:
    cfg = Config(str(BACKEND_DIR / "alembic.ini"))
    cfg.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    return cfg


def run_migrations() -> None:
    cfg = _alembic_config()
    tables = set(inspect(engine).get_table_names())

    if "alembic_version" not in tables and "users" in tables:
        logger.info("Legacy database detected - adopting it as Alembic baseline %s", BASELINE_REVISION)
        # Old versions created tables lazily, so a legacy DB may lack some
        # baseline tables. Create only those (checkfirst skips existing ones).
        baseline = [t for t in Base.metadata.sorted_tables if t.name in BASELINE_TABLES]
        Base.metadata.create_all(bind=engine, tables=baseline)
        command.stamp(cfg, BASELINE_REVISION)

    command.upgrade(cfg, "head")
