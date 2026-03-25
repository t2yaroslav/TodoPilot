"""Centralized structured logging for TodoPilot."""

import json
import logging
import sys
from datetime import datetime, timezone


class JSONFormatter(logging.Formatter):
    """Outputs one JSON object per log line."""

    def format(self, record: logging.LogRecord) -> str:
        entry: dict = {
            "ts": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ"),
            "level": record.levelname,
            "source": getattr(record, "source", "backend"),
            "logger": record.name,
            "message": record.getMessage(),
        }
        # Merge extra fields
        for key in ("request_id", "method", "path", "status_code", "duration_ms",
                     "user_id", "url", "stack", "user_agent", "error_type", "extra"):
            val = getattr(record, key, None)
            if val is not None:
                entry[key] = val
        if record.exc_info and record.exc_info[0] is not None:
            entry["traceback"] = self.formatException(record.exc_info)
        return json.dumps(entry, ensure_ascii=False, default=str)


class TextFormatter(logging.Formatter):
    """Human-readable format for local development."""

    def format(self, record: logging.LogRecord) -> str:
        ts = datetime.now().strftime("%H:%M:%S")
        source = getattr(record, "source", "backend")
        parts = [f"{ts} [{record.levelname}] [{source}] {record.getMessage()}"]
        for key in ("request_id", "duration_ms", "status_code", "path"):
            val = getattr(record, key, None)
            if val is not None:
                parts.append(f"{key}={val}")
        if record.exc_info and record.exc_info[0] is not None:
            parts.append(self.formatException(record.exc_info))
        return " | ".join(parts)


def setup_logging(level: str = "INFO", fmt: str = "json") -> None:
    """Configure the root todopilot logger. Call once at startup."""
    root = logging.getLogger("todopilot")
    root.setLevel(getattr(logging, level.upper(), logging.INFO))
    root.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter() if fmt == "json" else TextFormatter())
    root.addHandler(handler)

    # Prevent propagation to root logger (avoids duplicate uvicorn output)
    root.propagate = False
