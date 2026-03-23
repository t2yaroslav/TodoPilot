"""
Generic polling endpoint for background AI tasks.

All AI endpoints that take long return { task_id: "..." }.
Frontend polls this endpoint until status is "done" or "error".
"""
from fastapi import APIRouter, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from ..database import get_db
from ..models import OperationTiming
from ..services import task_queue

router = APIRouter(prefix="/ai-tasks", tags=["ai-tasks"])


@router.get("/avg-duration/{operation_type}")
async def get_avg_duration(
    operation_type: str,
    db: AsyncSession = Depends(get_db),
):
    """Get average duration (ms) for an operation type, based on last 20 runs across all users."""
    recent = (
        select(OperationTiming.duration_ms)
        .where(OperationTiming.operation_type == operation_type)
        .order_by(OperationTiming.created_at.desc())
        .limit(20)
        .subquery()
    )
    result = await db.execute(select(func.avg(recent.c.duration_ms)))
    avg_ms = result.scalar()
    return {"avg_duration_ms": int(avg_ms) if avg_ms else None}


@router.get("/{task_id}")
async def get_task_status(task_id: str):
    task = task_queue.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task["status"] == "running":
        return {"status": "running"}

    if task["status"] == "error":
        error = task["error"]
        task_queue.remove(task_id)
        return {"status": "error", "error": error}

    # done
    result = task["result"]
    task_queue.remove(task_id)
    return {"status": "done", "result": result}
