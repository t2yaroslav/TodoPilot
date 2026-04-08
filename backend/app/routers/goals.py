from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, or_, and_
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Goal, GoalLink, Project, ProjectGoalLink, Task, User
from ..schemas import GoalCreate, GoalOut, GoalUpdate, LinkCreate, LinksOut
from .auth import get_current_user

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("/stats")
async def goal_stats(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Return per-goal counts: total tasks, completed tasks, linked projects."""
    # Task counts per goal (via Task.goal_id)
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

    # Project counts per goal via junction table
    proj_link_q = (
        select(ProjectGoalLink.goal_id, func.count(ProjectGoalLink.project_id))
        .where(ProjectGoalLink.user_id == user.id)
        .group_by(ProjectGoalLink.goal_id)
    )
    proj_link_rows = (await db.execute(proj_link_q)).all()

    # Also count projects via tasks (projects that have tasks linked to goal)
    proj_task_q = (
        select(Task.goal_id, func.count(func.distinct(Task.project_id)))
        .where(Task.user_id == user.id, Task.goal_id != None, Task.project_id != None)  # noqa: E711
        .group_by(Task.goal_id)
    )
    proj_task_rows = (await db.execute(proj_task_q)).all()

    proj_link_map = {str(r[0]): r[1] for r in proj_link_rows}
    proj_task_map = {str(r[0]): r[1] for r in proj_task_rows}

    result = {}
    for row in task_rows:
        gid = str(row[0])
        result[gid] = {
            "total_tasks": row[1],
            "completed_tasks": row[2],
            "projects": max(proj_link_map.get(gid, 0), proj_task_map.get(gid, 0)),
        }
    # Add goals that have linked projects but no tasks
    for gid, cnt in proj_link_map.items():
        if gid not in result:
            result[gid] = {"total_tasks": 0, "completed_tasks": 0, "projects": cnt}
    return result


@router.get("/links", response_model=LinksOut)
async def list_links(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Return all goal-goal and project-goal links for the user."""
    gl_result = await db.execute(
        select(GoalLink).where(GoalLink.user_id == user.id).order_by(GoalLink.created_at)
    )
    pgl_result = await db.execute(
        select(ProjectGoalLink).where(ProjectGoalLink.user_id == user.id).order_by(ProjectGoalLink.created_at)
    )
    return LinksOut(
        goal_links=gl_result.scalars().all(),
        project_goal_links=pgl_result.scalars().all(),
    )


@router.post("/links", status_code=201)
async def create_link(body: LinkCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Create a link between two entities (goal↔goal or project↔goal)."""
    if body.source_type == "goal" and body.target_type == "goal":
        # Check both goals exist and belong to user
        g1 = await db.get(Goal, body.source_id)
        g2 = await db.get(Goal, body.target_id)
        if not g1 or g1.user_id != user.id or not g2 or g2.user_id != user.id:
            raise HTTPException(status_code=404, detail="Goal not found")
        if body.source_id == body.target_id:
            raise HTTPException(status_code=400, detail="Cannot link goal to itself")
        # Check duplicate (either direction)
        existing = await db.execute(
            select(GoalLink).where(
                GoalLink.user_id == user.id,
                or_(
                    and_(GoalLink.source_goal_id == body.source_id, GoalLink.target_goal_id == body.target_id),
                    and_(GoalLink.source_goal_id == body.target_id, GoalLink.target_goal_id == body.source_id),
                )
            )
        )
        if existing.scalar():
            raise HTTPException(status_code=409, detail="Link already exists")
        link = GoalLink(user_id=user.id, source_goal_id=body.source_id, target_goal_id=body.target_id)
        db.add(link)
        await db.commit()
        await db.refresh(link)
        return {"id": str(link.id), "type": "goal_link"}

    elif (body.source_type == "project" and body.target_type == "goal") or \
         (body.source_type == "goal" and body.target_type == "project"):
        project_id = body.source_id if body.source_type == "project" else body.target_id
        goal_id = body.source_id if body.source_type == "goal" else body.target_id
        proj = await db.get(Project, project_id)
        goal = await db.get(Goal, goal_id)
        if not proj or proj.user_id != user.id or not goal or goal.user_id != user.id:
            raise HTTPException(status_code=404, detail="Entity not found")
        # Check duplicate
        existing = await db.execute(
            select(ProjectGoalLink).where(
                ProjectGoalLink.user_id == user.id,
                ProjectGoalLink.project_id == project_id,
                ProjectGoalLink.goal_id == goal_id,
            )
        )
        if existing.scalar():
            raise HTTPException(status_code=409, detail="Link already exists")
        link = ProjectGoalLink(user_id=user.id, project_id=project_id, goal_id=goal_id)
        db.add(link)
        await db.commit()
        await db.refresh(link)
        return {"id": str(link.id), "type": "project_goal_link"}

    else:
        raise HTTPException(status_code=400, detail="Unsupported link types")


@router.delete("/links/{link_id}", status_code=204)
async def delete_link(link_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    """Delete a link by ID (checks both goal_links and project_goal_links)."""
    # Try goal_links first
    link = await db.get(GoalLink, link_id)
    if link and link.user_id == user.id:
        await db.delete(link)
        await db.commit()
        return

    # Try project_goal_links
    link = await db.get(ProjectGoalLink, link_id)
    if link and link.user_id == user.id:
        await db.delete(link)
        await db.commit()
        return

    raise HTTPException(status_code=404, detail="Link not found")


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
