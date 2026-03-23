"""
In-memory async task queue for long-running AI operations.

Instead of keeping HTTP connections open for minutes waiting for LLM responses,
endpoints submit work to the queue and return a task_id immediately.
The frontend polls GET /api/ai-tasks/{task_id} for the result.
"""
import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Any, Coroutine


_tasks: dict[str, dict[str, Any]] = {}

# Auto-cleanup completed tasks older than this
_TTL = timedelta(minutes=10)


async def submit(coro: Coroutine, operation_type: str | None = None) -> str:
    """Start an async coroutine in the background, return task_id immediately.

    If operation_type is provided, the duration will be recorded in
    the operation_timings table when the task finishes.
    """
    task_id = str(uuid.uuid4())
    _tasks[task_id] = {
        "status": "running",
        "result": None,
        "error": None,
        "created_at": datetime.utcnow(),
        "operation_type": operation_type,
    }

    async def _run():
        start = datetime.utcnow()
        try:
            result = await coro
            _tasks[task_id]["status"] = "done"
            _tasks[task_id]["result"] = result
        except Exception as e:
            _tasks[task_id]["status"] = "error"
            _tasks[task_id]["error"] = str(e)

        # Record timing if operation_type was specified
        if operation_type:
            duration_ms = int((datetime.utcnow() - start).total_seconds() * 1000)
            try:
                await _record_timing(operation_type, duration_ms)
            except Exception:
                pass  # non-critical

    asyncio.create_task(_run())
    _cleanup_old()
    return task_id


async def _record_timing(operation_type: str, duration_ms: int):
    """Persist operation duration to DB for progress estimation."""
    from ..database import async_session
    from ..models import OperationTiming

    async with async_session() as session:
        timing = OperationTiming(operation_type=operation_type, duration_ms=duration_ms)
        session.add(timing)
        await session.commit()


def get(task_id: str) -> dict[str, Any] | None:
    """Get task status and result."""
    return _tasks.get(task_id)


def remove(task_id: str):
    """Remove a task from the store."""
    _tasks.pop(task_id, None)


def _cleanup_old():
    """Remove completed tasks older than TTL."""
    now = datetime.utcnow()
    to_remove = [
        tid for tid, t in _tasks.items()
        if t["status"] != "running" and now - t["created_at"] > _TTL
    ]
    for tid in to_remove:
        _tasks.pop(tid, None)
