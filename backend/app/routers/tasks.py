from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Task, User
from ..schemas import TaskCreate, TaskOut, TaskUpdate
from .auth import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/counts")
async def task_counts(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start.replace(hour=23, minute=59, second=59)

    base = select(func.count(Task.id)).where(
        Task.user_id == user.id,
        Task.completed == False,  # noqa: E712
        Task.parent_task_id == None,  # noqa: E711
    )

    today_q = base.where(and_(Task.due_date >= today_start, Task.due_date <= today_end))
    inbox_q = base.where(Task.project_id == None, Task.goal_id == None)  # noqa: E711
    completed_q = select(func.count(Task.id)).where(
        Task.user_id == user.id,
        Task.completed == True,  # noqa: E712
        Task.parent_task_id == None,  # noqa: E711
    )

    today_count = (await db.execute(today_q)).scalar() or 0
    inbox_count = (await db.execute(inbox_q)).scalar() or 0
    completed_count = (await db.execute(completed_q)).scalar() or 0

    return {"today": today_count, "inbox": inbox_count, "completed": completed_count}


@router.get("", response_model=list[TaskOut])
async def list_tasks(
    project_id: UUID | None = None,
    goal_id: UUID | None = None,
    completed: bool | None = None,
    due_today: bool = False,
    inbox: bool = False,
    parent_task_id: UUID | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    q = select(Task).where(Task.user_id == user.id)
    if project_id:
        q = q.where(Task.project_id == project_id)
    if goal_id:
        q = q.where(Task.goal_id == goal_id)
    if completed is not None:
        q = q.where(Task.completed == completed)
    if due_today:
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start.replace(hour=23, minute=59, second=59)
        q = q.where(and_(Task.due_date >= today_start, Task.due_date <= today_end))
    if inbox:
        q = q.where(Task.project_id == None, Task.goal_id == None)  # noqa: E711
    if parent_task_id:
        q = q.where(Task.parent_task_id == parent_task_id)
    else:
        q = q.where(Task.parent_task_id == None)  # noqa: E711 — top-level only by default
    q = q.order_by(Task.position, Task.created_at)
    result = await db.execute(q)
    return result.scalars().all()


@router.post("", response_model=TaskOut, status_code=201)
async def create_task(
    body: TaskCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Get next position
    result = await db.execute(
        select(func.coalesce(func.max(Task.position), -1)).where(Task.user_id == user.id)
    )
    max_pos = result.scalar()
    task = Task(**body.model_dump(), user_id=user.id, position=max_pos + 1)
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


@router.get("/{task_id}", response_model=TaskOut)
async def get_task(task_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    task = await db.get(Task, task_id)
    if not task or task.user_id != user.id:
        raise HTTPException(status_code=404)
    return task


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: UUID,
    body: TaskUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    task = await db.get(Task, task_id)
    if not task or task.user_id != user.id:
        raise HTTPException(status_code=404)

    data = body.model_dump(exclude_unset=True)
    if "completed" in data:
        if data["completed"] and not task.completed:
            task.completed_at = datetime.now(timezone.utc)
        elif not data["completed"]:
            task.completed_at = None

    for field, value in data.items():
        setattr(task, field, value)

    await db.commit()
    await db.refresh(task)
    return task


@router.delete("/{task_id}", status_code=204)
async def delete_task(task_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    task = await db.get(Task, task_id)
    if not task or task.user_id != user.id:
        raise HTTPException(status_code=404)
    await db.delete(task)
    await db.commit()
