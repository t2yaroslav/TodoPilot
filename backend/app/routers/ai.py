import json
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Goal, Project, Task, User
from ..schemas import (
    AIChatMessage,
    AIMessage,
    BrainDumpItem,
    BrainDumpRequest,
    BrainDumpResponse,
    BrainDumpSaveRequest,
    TaskAction,
)
from ..services import ai_service
from ..services import task_queue
from .auth import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])


async def _gather_stats(user: User, db: AsyncSession) -> dict:
    """Gather comprehensive user statistics for AI analysis."""
    now = datetime.now(timezone.utc)
    today = date.today()

    # Total tasks
    total_q = await db.execute(
        select(func.count(Task.id)).where(Task.user_id == user.id)
    )
    total_tasks = total_q.scalar() or 0

    # Completed tasks
    completed_q = await db.execute(
        select(func.count(Task.id)).where(Task.user_id == user.id, Task.completed == True)  # noqa: E712
    )
    completed_tasks = completed_q.scalar() or 0

    # Pending
    pending_tasks = total_tasks - completed_tasks

    # Overdue
    overdue_q = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.completed == False,  # noqa: E712
            Task.due_date < now,
        )
    )
    overdue_items = overdue_q.scalars().all()
    overdue_tasks = len(overdue_items)
    overdue_list = [f"{t.title} (дедлайн: {t.due_date.strftime('%d.%m.%Y') if t.due_date else '?'})" for t in overdue_items[:10]]

    # Today's tasks
    today_q = await db.execute(
        select(func.count(Task.id)).where(
            Task.user_id == user.id,
            Task.completed == False,  # noqa: E712
            cast(Task.due_date, Date) == today,
        )
    )
    today_tasks = today_q.scalar() or 0

    # Completed in last 7 days
    week_ago = now - timedelta(days=7)
    c7d_q = await db.execute(
        select(func.count(Task.id)).where(
            Task.user_id == user.id,
            Task.completed == True,  # noqa: E712
            Task.completed_at >= week_ago,
        )
    )
    completed_7d = c7d_q.scalar() or 0

    # Completed in last 30 days
    month_ago = now - timedelta(days=30)
    c30d_q = await db.execute(
        select(func.count(Task.id)).where(
            Task.user_id == user.id,
            Task.completed == True,  # noqa: E712
            Task.completed_at >= month_ago,
        )
    )
    completed_30d = c30d_q.scalar() or 0

    avg_daily_7d = completed_7d / 7 if completed_7d else 0

    # Priority distribution (pending tasks)
    priority_counts = {}
    for prio in range(5):
        pq = await db.execute(
            select(func.count(Task.id)).where(
                Task.user_id == user.id,
                Task.completed == False,  # noqa: E712
                Task.priority == prio,
            )
        )
        priority_counts[prio] = pq.scalar() or 0

    # Projects count
    proj_q = await db.execute(
        select(func.count(Project.id)).where(Project.user_id == user.id)
    )
    total_projects = proj_q.scalar() or 0

    # Goals count
    goal_q = await db.execute(
        select(func.count(Goal.id)).where(Goal.user_id == user.id)
    )
    total_goals = goal_q.scalar() or 0

    # Goals progress
    goals_result = await db.execute(select(Goal).where(Goal.user_id == user.id))
    goals = goals_result.scalars().all()
    goals_progress = []
    for g in goals:
        gt_q = await db.execute(
            select(func.count(Task.id)).where(Task.goal_id == g.id)
        )
        gc_q = await db.execute(
            select(func.count(Task.id)).where(Task.goal_id == g.id, Task.completed == True)  # noqa: E712
        )
        goals_progress.append({
            "title": g.title,
            "total": gt_q.scalar() or 0,
            "completed": gc_q.scalar() or 0,
        })

    return {
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "pending_tasks": pending_tasks,
        "overdue_tasks": overdue_tasks,
        "overdue_list": overdue_list,
        "today_tasks": today_tasks,
        "completed_7d": completed_7d,
        "completed_30d": completed_30d,
        "avg_daily_7d": avg_daily_7d,
        "total_projects": total_projects,
        "total_goals": total_goals,
        "priority_p1": priority_counts.get(4, 0),
        "priority_p2": priority_counts.get(3, 0),
        "priority_p3": priority_counts.get(2, 0),
        "priority_p4": priority_counts.get(1, 0),
        "priority_none": priority_counts.get(0, 0),
        "goals_progress": goals_progress,
    }


@router.post("/chat")
async def ai_chat(
    body: AIMessage,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Gather context (fast DB queries)
    result = await db.execute(
        select(Task).where(Task.user_id == user.id, Task.completed == False).limit(50)  # noqa: E712
    )
    tasks = result.scalars().all()
    tasks_ctx = "\n".join(f"- {t.title} (приоритет: {t.priority}, дедлайн: {t.due_date})" for t in tasks)

    messages = [{"role": "user", "content": body.message}]

    # Submit LLM call to background queue
    task_id = await task_queue.submit(
        ai_service.chat(messages, user_profile=user.profile_text, tasks_context=tasks_ctx)
    )
    return {"task_id": task_id}


@router.post("/analysis")
async def coaching_analysis(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Coaching analysis based on comprehensive user statistics."""
    stats = await _gather_stats(user, db)

    async def _run():
        analysis = await ai_service.coaching_analysis(stats, user_profile=user.profile_text)
        return {"analysis": analysis, "stats": stats}

    task_id = await task_queue.submit(_run())
    return {"task_id": task_id}


@router.post("/brain-dump")
async def brain_dump(
    body: BrainDumpRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Extract tasks, projects, goals from brain dump text."""
    async def _run():
        raw = await ai_service.brain_dump_extract(body.text, user_profile=user.profile_text)
        try:
            parsed = json.loads(raw)
            items = [BrainDumpItem(**item).model_dump() for item in parsed.get("items", [])]
            reply = parsed.get("reply", "Готово!")
        except (json.JSONDecodeError, Exception):
            return {"reply": "Не удалось распознать структуру. Попробуйте переформулировать.", "items": []}
        return {"reply": reply, "items": items}

    task_id = await task_queue.submit(_run())
    return {"task_id": task_id}


@router.post("/brain-dump/save")
async def brain_dump_save(
    body: BrainDumpSaveRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save confirmed brain dump items as tasks/projects/goals."""
    created = {"tasks": 0, "projects": 0, "goals": 0}

    # First pass: create goals and projects so we can link tasks
    goal_map: dict[str, str] = {}  # name -> id
    project_map: dict[str, str] = {}  # name -> id

    for item in body.items:
        if item.type == "goal":
            goal = Goal(title=item.title, user_id=user.id)
            db.add(goal)
            await db.flush()
            goal_map[item.title.lower()] = str(goal.id)
            created["goals"] += 1
        elif item.type == "project":
            project = Project(title=item.title, user_id=user.id)
            db.add(project)
            await db.flush()
            project_map[item.title.lower()] = str(project.id)
            created["projects"] += 1

    # Load existing projects and goals for matching
    existing_projects = await db.execute(select(Project).where(Project.user_id == user.id))
    for p in existing_projects.scalars().all():
        if p.title.lower() not in project_map:
            project_map[p.title.lower()] = str(p.id)

    existing_goals = await db.execute(select(Goal).where(Goal.user_id == user.id))
    for g in existing_goals.scalars().all():
        if g.title.lower() not in goal_map:
            goal_map[g.title.lower()] = str(g.id)

    # Second pass: create tasks with links
    for item in body.items:
        if item.type == "task":
            # Get next position
            pos_result = await db.execute(
                select(func.coalesce(func.max(Task.position), -1)).where(Task.user_id == user.id)
            )
            max_pos = pos_result.scalar()

            task_data = {
                "title": item.title,
                "priority": item.priority,
                "user_id": user.id,
                "position": max_pos + 1,
            }
            if item.due_date:
                try:
                    task_data["due_date"] = datetime.strptime(item.due_date, "%Y-%m-%d").replace(
                        tzinfo=timezone.utc
                    )
                except ValueError:
                    pass
            if item.project and item.project.lower() in project_map:
                task_data["project_id"] = project_map[item.project.lower()]
            if item.goal and item.goal.lower() in goal_map:
                task_data["goal_id"] = goal_map[item.goal.lower()]

            task = Task(**task_data)
            db.add(task)
            created["tasks"] += 1

    await db.commit()
    return {"status": "ok", "created": created}


@router.post("/morning-plan")
async def morning_plan(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate morning plan: which task to start with and why."""
    today = date.today()
    now = datetime.now(timezone.utc)

    # Today's tasks
    today_result = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.completed == False,  # noqa: E712
            cast(Task.due_date, Date) == today,
        ).order_by(Task.priority.desc(), Task.position)
    )
    today_tasks_raw = today_result.scalars().all()

    # Load projects/goals for context
    projects_result = await db.execute(select(Project).where(Project.user_id == user.id))
    projects = {str(p.id): p.title for p in projects_result.scalars().all()}

    goals_result = await db.execute(select(Goal).where(Goal.user_id == user.id))
    goals_all = goals_result.scalars().all()
    goals_map = {str(g.id): g.title for g in goals_all}

    today_tasks = [
        {
            "title": t.title,
            "priority": t.priority,
            "project": projects.get(str(t.project_id), "нет") if t.project_id else "нет",
            "goal": goals_map.get(str(t.goal_id), "нет") if t.goal_id else "нет",
        }
        for t in today_tasks_raw
    ]

    # All pending tasks
    pending_result = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.completed == False,  # noqa: E712
        ).order_by(Task.priority.desc(), Task.due_date.asc().nullslast()).limit(20)
    )
    all_tasks = [
        {
            "title": t.title,
            "priority": t.priority,
            "due_date": t.due_date.strftime("%d.%m.%Y") if t.due_date else None,
        }
        for t in pending_result.scalars().all()
    ]

    goals_list = [{"title": g.title} for g in goals_all]

    # Basic stats
    week_ago = now - timedelta(days=7)
    c7d_q = await db.execute(
        select(func.count(Task.id)).where(
            Task.user_id == user.id,
            Task.completed == True,  # noqa: E712
            Task.completed_at >= week_ago,
        )
    )
    completed_7d = c7d_q.scalar() or 0

    overdue_q = await db.execute(
        select(func.count(Task.id)).where(
            Task.user_id == user.id,
            Task.completed == False,  # noqa: E712
            Task.due_date < now,
        )
    )
    overdue_tasks = overdue_q.scalar() or 0

    stats = {"avg_daily_7d": completed_7d / 7, "overdue_tasks": overdue_tasks}
    profile = user.profile_text

    task_id = await task_queue.submit(
        ai_service.morning_plan(today_tasks, all_tasks, goals_list, stats, user_profile=profile)
    )
    return {"task_id": task_id}


@router.post("/smart-chat")
async def smart_chat(
    body: AIChatMessage,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """AI chat that can create/complete/move tasks via action buttons."""
    # Gather tasks context with IDs
    result = await db.execute(
        select(Task).where(Task.user_id == user.id, Task.completed == False).limit(50)  # noqa: E712
    )
    tasks = result.scalars().all()
    tasks_ctx = "\n".join(
        f"- [id:{t.id}] {t.title} (приоритет: {t.priority}, дедлайн: {t.due_date}, проект: {t.project_id})"
        for t in tasks
    )

    # Gather projects context
    proj_result = await db.execute(select(Project).where(Project.user_id == user.id))
    projects = proj_result.scalars().all()
    projects_ctx = "\n".join(f"- [id:{p.id}] {p.title}" for p in projects)

    # Build message history
    messages = body.history + [{"role": "user", "content": body.message}]
    profile = user.profile_text

    async def _run():
        raw = await ai_service.chat_with_actions(
            messages,
            tasks_context=tasks_ctx,
            projects_context=projects_ctx,
            user_profile=profile,
        )
        try:
            parsed = json.loads(raw)
            reply = parsed.get("reply", raw)
            actions = [TaskAction(**a).model_dump() for a in parsed.get("actions", [])]
            return {"reply": reply, "actions": actions}
        except (json.JSONDecodeError, Exception):
            return {"reply": raw, "actions": []}

    task_id = await task_queue.submit(_run())
    return {"task_id": task_id}


@router.post("/smart-chat/execute-action")
async def execute_action(
    body: TaskAction,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Execute a task action suggested by AI chat."""
    if body.action == "create":
        if not body.title:
            raise HTTPException(400, "Title required for create action")
        pos_result = await db.execute(
            select(func.coalesce(func.max(Task.position), -1)).where(Task.user_id == user.id)
        )
        max_pos = pos_result.scalar()
        task_data = {
            "title": body.title,
            "priority": body.priority or 0,
            "user_id": user.id,
            "position": max_pos + 1,
        }
        if body.due_date:
            try:
                task_data["due_date"] = datetime.strptime(body.due_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
            except ValueError:
                pass
        if body.project_id:
            task_data["project_id"] = body.project_id
        if body.goal_id:
            task_data["goal_id"] = body.goal_id

        task = Task(**task_data)
        db.add(task)
        await db.commit()
        await db.refresh(task)
        return {"status": "ok", "action": "create", "task_id": str(task.id), "title": task.title}

    elif body.action == "complete":
        if not body.task_id:
            raise HTTPException(400, "task_id required for complete action")
        task = await db.get(Task, body.task_id)
        if not task or task.user_id != user.id:
            raise HTTPException(404, "Task not found")
        task.completed = True
        task.completed_at = datetime.now(timezone.utc)
        await db.commit()
        return {"status": "ok", "action": "complete", "task_id": str(task.id), "title": task.title}

    elif body.action == "move":
        if not body.task_id:
            raise HTTPException(400, "task_id required for move action")
        task = await db.get(Task, body.task_id)
        if not task or task.user_id != user.id:
            raise HTTPException(404, "Task not found")
        if body.project_id is not None:
            task.project_id = body.project_id if body.project_id else None
        if body.goal_id is not None:
            task.goal_id = body.goal_id if body.goal_id else None
        await db.commit()
        return {"status": "ok", "action": "move", "task_id": str(task.id), "title": task.title}

    raise HTTPException(400, f"Unknown action: {body.action}")


@router.get("/productivity-analysis")
async def productivity_analysis(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    yesterday = datetime.now(timezone.utc) - timedelta(days=1)
    result = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.completed == True,  # noqa: E712
            Task.completed_at >= yesterday.replace(hour=0, minute=0, second=0),
            Task.completed_at <= yesterday.replace(hour=23, minute=59, second=59),
        )
    )
    tasks = [{"title": t.title, "completed_at": str(t.completed_at)} for t in result.scalars().all()]
    profile = user.profile_text

    task_id = await task_queue.submit(
        ai_service.analyze_productivity(tasks, user_profile=profile)
    )
    return {"task_id": task_id}


@router.get("/retrospective")
async def weekly_retrospective(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    result = await db.execute(
        select(Task).where(Task.user_id == user.id, Task.created_at >= week_ago)
    )
    tasks = [{"title": t.title, "completed": t.completed} for t in result.scalars().all()]

    goals_result = await db.execute(select(Goal).where(Goal.user_id == user.id))
    goals = [{"title": g.title} for g in goals_result.scalars().all()]
    profile = user.profile_text

    task_id = await task_queue.submit(
        ai_service.weekly_retrospective(tasks, goals, user_profile=profile)
    )
    return {"task_id": task_id}


@router.post("/onboarding")
async def onboarding(body: AIMessage, user: User = Depends(get_current_user)):
    history = []
    task_id = await task_queue.submit(
        ai_service.onboarding_chat(body.message, history)
    )
    return {"task_id": task_id}
