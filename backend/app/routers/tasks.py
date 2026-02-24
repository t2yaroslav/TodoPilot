import calendar
from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_, cast, Date, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Task, User
from ..schemas import TaskCreate, TaskOut, TaskUpdate
from .auth import get_current_user


def _add_months(dt: datetime, months: int) -> datetime:
    """Add months to a datetime, clamping the day to the last day of the target month."""
    month = dt.month - 1 + months
    year = dt.year + month // 12
    month = month % 12 + 1
    day = min(dt.day, calendar.monthrange(year, month)[1])
    return dt.replace(year=year, month=month, day=day)


RECURRENCE_DELTAS = {
    "daily": lambda d: d + timedelta(days=1),
    "weekly": lambda d: d + timedelta(weeks=1),
    "biweekly": lambda d: d + timedelta(weeks=2),
    "monthly": lambda d: _add_months(d, 1),
    "yearly": lambda d: _add_months(d, 12),
}

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/counts")
async def task_counts(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    today = date.today()

    base = select(func.count(Task.id)).where(
        Task.user_id == user.id,
        Task.completed == False,  # noqa: E712
        Task.parent_task_id == None,  # noqa: E711
    )

    today_q = base.where(cast(Task.due_date, Date) == today)
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
    upcoming: bool = False,
    inbox: bool = False,
    parent_task_id: UUID | None = Query(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    today = date.today()
    q = select(Task).where(Task.user_id == user.id)
    if project_id:
        q = q.where(Task.project_id == project_id)
    if goal_id:
        q = q.where(Task.goal_id == goal_id)
    if completed is not None:
        q = q.where(Task.completed == completed)
    if due_today:
        q = q.where(cast(Task.due_date, Date) == today)
    elif upcoming:
        q = q.where(cast(Task.due_date, Date) > today)
    elif inbox:
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
    should_recur = False
    if "completed" in data:
        if data["completed"] and not task.completed:
            task.completed_at = datetime.now(timezone.utc)
            # Check if this is a recurring task that needs a new occurrence
            if task.recurrence and task.recurrence in RECURRENCE_DELTAS:
                should_recur = True
        elif not data["completed"]:
            task.completed_at = None

    for field, value in data.items():
        setattr(task, field, value)

    # Create next occurrence for recurring tasks
    if should_recur:
        next_due = None
        if task.due_date:
            calc = RECURRENCE_DELTAS[task.recurrence]
            next_due = calc(task.due_date)
        else:
            # No due date — set next due relative to today
            calc = RECURRENCE_DELTAS[task.recurrence]
            next_due = calc(datetime.now(timezone.utc))

        # Get next position
        pos_result = await db.execute(
            select(func.coalesce(func.max(Task.position), -1)).where(Task.user_id == user.id)
        )
        max_pos = pos_result.scalar()

        new_task = Task(
            user_id=user.id,
            title=task.title,
            description=task.description,
            priority=task.priority,
            due_date=next_due,
            project_id=task.project_id,
            goal_id=task.goal_id,
            recurrence=task.recurrence,
            position=max_pos + 1,
        )
        db.add(new_task)

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
