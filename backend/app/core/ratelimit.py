"""Small in-memory sliding-window rate limiter.

No extra dependency and no external store: enough for a single-instance
campus deployment. Limits are per process, so with N workers the effective
limit is N times higher. For a multi-instance setup swap this for Redis.
"""
import threading
import time
from collections import deque

from fastapi import HTTPException, Request

from app.core.config import settings

_SWEEP_EVERY_SECONDS = 300


class RateLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, tuple[deque, int]] = {}
        self._lock = threading.Lock()
        self._last_sweep = time.monotonic()

    def reset(self) -> None:
        with self._lock:
            self._hits.clear()

    def _sweep(self, now: float) -> None:
        if now - self._last_sweep < _SWEEP_EVERY_SECONDS:
            return
        self._last_sweep = now
        dead = [k for k, (q, window) in self._hits.items() if not q or q[-1] <= now - window]
        for k in dead:
            del self._hits[k]

    def check(self, key: str, limit: int, window_seconds: int) -> None:
        """Records one hit for `key`; raises 429 if it exceeds `limit` per window."""
        if not settings.RATE_LIMIT_ENABLED:
            return
        now = time.monotonic()
        with self._lock:
            self._sweep(now)
            q, _ = self._hits.setdefault(key, (deque(), window_seconds))
            while q and q[0] <= now - window_seconds:
                q.popleft()
            if len(q) >= limit:
                retry_after = int(q[0] + window_seconds - now) + 1
                raise HTTPException(
                    status_code=429,
                    detail=f"Too many attempts. Please try again in {retry_after} seconds.",
                    headers={"Retry-After": str(retry_after)},
                )
            q.append(now)


limiter = RateLimiter()


def client_ip(request: Request) -> str:
    if settings.TRUST_PROXY_HEADERS:
        forwarded = request.headers.get("x-forwarded-for")
        if forwarded:
            return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def ip_limit(bucket: str, limit: int, window_seconds: int):
    """FastAPI dependency: at most `limit` requests per `window_seconds` per client IP."""

    def dependency(request: Request) -> None:
        limiter.check(f"{bucket}:ip:{client_ip(request)}", limit, window_seconds)

    return dependency


def key_limit(bucket: str, identifier: str, limit: int, window_seconds: int) -> None:
    """Per-identifier limit (e.g. per email address), called from inside a handler."""
    limiter.check(f"{bucket}:id:{identifier.strip().lower()}", limit, window_seconds)
