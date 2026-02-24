from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Goal, Project, Task, User
from ..schemas import GoalCreate, GoalOut, GoalUpdate
from .auth import get_current_user

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("/stats")
async def goal_stats(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Return per-goal counts: total tasks, completed tasks, linked projects."""
    # Task counts per goal
    task_q = (
        select(
            Task.goal_id,
            func.count(Task.id).label("total"),
            func.count(Task.id).filter(Task.completed == True).label("completed"),  # noqa: E712
        )
        .where(Task.user_id == user.id, Task.goal_id != None)  # noqa: E711
        .group_by(Task.goal_id)
    )
    task_rows = (await db.execute(task_q)).all()

    # Project counts per goal
    proj_q = (
        select(Task.goal_id, func.count(func.distinct(Task.project_id)))
        .where(Task.user_id == user.id, Task.goal_id != None, Task.project_id != None)  # noqa: E711
        .group_by(Task.goal_id)
    )
    proj_rows = (await db.execute(proj_q)).all()

    # Direct project links
    direct_proj_q = (
        select(Project.goal_id, func.count(Project.id))
        .where(Project.user_id == user.id, Project.goal_id != None)  # noqa: E711
        .group_by(Project.goal_id)
    )
    direct_proj_rows = (await db.execute(direct_proj_q)).all()

    proj_map = {str(r[0]): r[1] for r in proj_rows}
    direct_proj_map = {str(r[0]): r[1] for r in direct_proj_rows}
    result = {}
    for row in task_rows:
        gid = str(row[0])
        result[gid] = {
            "total_tasks": row[1],
            "completed_tasks": row[2],
            "projects": max(proj_map.get(gid, 0), direct_proj_map.get(gid, 0)),
        }
    # Add goals that have projects but no tasks
    for gid, cnt in direct_proj_map.items():
        if gid not in result:
            result[gid] = {"total_tasks": 0, "completed_tasks": 0, "projects": cnt}
    return result


@router.get("", response_model=list[GoalOut])
async def list_goals(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Goal).where(Goal.user_id == user.id).order_by(Goal.created_at))
    return result.scalars().all()


@router.post("", response_model=GoalOut, status_code=201)
async def create_goal(body: GoalCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    goal = Goal(**body.model_dump(), user_id=user.id)
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.patch("/{goal_id}", response_model=GoalOut)
async def update_goal(goal_id: UUID, body: GoalUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    goal = await db.get(Goal, goal_id)
    if not goal or goal.user_id != user.id:
        raise HTTPException(status_code=404)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(goal_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    goal = await db.get(Goal, goal_id)
    if not goal or goal.user_id != user.id:
        raise HTTPException(status_code=404)
    await db.delete(goal)
    await db.commit()
