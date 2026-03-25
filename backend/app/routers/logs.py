"""Endpoint for collecting frontend/browser logs."""

import logging
import time
from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt
from pydantic import BaseModel, field_validator

from ..config import settings

_bearer = HTTPBearer()


async def _get_user_id(
    token: HTTPAuthorizationCredentials = Depends(_bearer),
) -> str:
    """Extract user_id from JWT without DB lookup (lightweight for logging)."""
    try:
        payload = jwt.decode(
            token.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm]
        )
        uid = payload.get("sub")
        if not uid:
            raise ValueError
        return uid
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

router = APIRouter(tags=["logs"])
logger = logging.getLogger("todopilot.frontend")

# Simple rate limiter: {user_id: (count, window_start)}
_rate: dict[str, tuple[int, float]] = defaultdict(lambda: (0, 0.0))
_RATE_LIMIT = 100  # entries per minute


class LogEntry(BaseModel):
    level: str
    message: str
    source: str = "frontend"
    url: Optional[str] = None
    stack: Optional[str] = None
    user_agent: Optional[str] = None
    extra: Optional[dict] = None
    timestamp: Optional[str] = None

    @field_validator("level")
    @classmethod
    def validate_level(cls, v: str) -> str:
        v = v.lower()
        if v not in ("debug", "info", "warn", "warning", "error"):
            raise ValueError("level must be one of: debug, info, warn, error")
        return v


_LEVEL_MAP = {
    "debug": logging.DEBUG,
    "info": logging.INFO,
    "warn": logging.WARNING,
    "warning": logging.WARNING,
    "error": logging.ERROR,
}


@router.post("/logs", status_code=status.HTTP_204_NO_CONTENT)
async def collect_logs(
    entries: list[LogEntry],
    user_id: str = Depends(_get_user_id),
):
    # Rate limiting
    now = time.time()
    count, window_start = _rate[user_id]
    if now - window_start > 60:
        count, window_start = 0, now
    count += len(entries)
    _rate[user_id] = (count, window_start)
    if count > _RATE_LIMIT:
        raise HTTPException(status_code=429, detail="Too many log entries")

    for entry in entries:
        log_level = _LEVEL_MAP.get(entry.level, logging.INFO)
        logger.log(
            log_level,
            entry.message,
            extra={
                "source": entry.source,
                "user_id": user_id,
                "url": entry.url,
                "stack": entry.stack,
                "user_agent": entry.user_agent,
                "extra": entry.extra,
            },
        )
