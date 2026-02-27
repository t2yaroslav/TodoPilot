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


async def submit(coro: Coroutine) -> str:
    """Start an async coroutine in the background, return task_id immediately."""
    task_id = str(uuid.uuid4())
    _tasks[task_id] = {
        "status": "running",
        "result": None,
        "error": None,
        "created_at": datetime.utcnow(),
    }

    async def _run():
        try:
            result = await coro
            _tasks[task_id]["status"] = "done"
            _tasks[task_id]["result"] = result
        except Exception as e:
            _tasks[task_id]["status"] = "error"
            _tasks[task_id]["error"] = str(e)

    asyncio.create_task(_run())
    _cleanup_old()
    return task_id


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
