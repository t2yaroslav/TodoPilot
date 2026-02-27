"""
Generic polling endpoint for background AI tasks.

All AI endpoints that take long return { task_id: "..." }.
Frontend polls this endpoint until status is "done" or "error".
"""
from fastapi import APIRouter, HTTPException
from ..services import task_queue

router = APIRouter(prefix="/ai-tasks", tags=["ai-tasks"])


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
