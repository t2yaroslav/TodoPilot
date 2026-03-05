import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, cast, Date, extract
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Task, User, Project
from ..schemas import DayStat
from .auth import get_current_user

router = APIRouter(prefix="/stats", tags=["stats"])


@router.get("/productivity", response_model=list[DayStat])
async def productivity(
    days: int = Query(7, ge=1, le=365),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Total per day
    result = await db.execute(
        select(cast(Task.completed_at, Date).label("day"), func.count().label("cnt"))
        .where(Task.user_id == user.id, Task.completed == True, Task.completed_at >= since)  # noqa: E712
        .group_by("day")
        .order_by("day")
    )
    day_counts = {str(row.day): row.cnt for row in result.all()}

    # Breakdown by project
    result2 = await db.execute(
        select(
            cast(Task.completed_at, Date).label("day"),
            Task.project_id,
            func.count().label("cnt"),
        )
        .where(Task.user_id == user.id, Task.completed == True, Task.completed_at >= since)  # noqa: E712
        .group_by("day", Task.project_id)
        .order_by("day")
    )
    breakdown: dict[str, dict[str, int]] = {}
    for row in result2.all():
        d = str(row.day)
        pid = str(row.project_id) if row.project_id else "inbox"
        breakdown.setdefault(d, {})[pid] = row.cnt

    # Fill all days
    stats = []
    for i in range(days):
        d = str((since + timedelta(days=i + 1)).date())
        stats.append(DayStat(date=d, count=day_counts.get(d, 0), breakdown=breakdown.get(d, {})))
    return stats


@router.get("/dashboard-token")
async def get_dashboard_token(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate or return existing dashboard token for the current user."""
    settings = dict(user.settings or {})
    if "dashboard_token" not in settings:
        settings["dashboard_token"] = secrets.token_urlsafe(32)
        user.settings = settings
        db.add(user)
        await db.commit()
    return {"token": settings["dashboard_token"]}


@router.get("/dashboard/{token}")
async def get_dashboard(
    token: str,
    days: int = Query(30, ge=7, le=90),
    db: AsyncSession = Depends(get_db),
):
    """Public endpoint — returns dashboard data for the given token (no auth required)."""
    result = await db.execute(
        select(User).where(User.settings["dashboard_token"].astext == token)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Дашборд не найден")

    since = datetime.now(timezone.utc) - timedelta(days=days)
    since_week = datetime.now(timezone.utc) - timedelta(days=7)

    # Projects
    proj_result = await db.execute(
        select(Project).where(Project.user_id == user.id).order_by(Project.position)
    )
    projects = proj_result.scalars().all()
    proj_map = {str(p.id): {"id": str(p.id), "title": p.title, "color": p.color} for p in projects}

    # 1. By project per day (stacked area chart)
    r1 = await db.execute(
        select(
            cast(Task.completed_at, Date).label("day"),
            Task.project_id,
            func.count().label("cnt"),
        )
        .where(Task.user_id == user.id, Task.completed == True, Task.completed_at >= since)  # noqa: E712
        .group_by("day", Task.project_id)
        .order_by("day")
    )
    proj_day_map: dict[str, dict[str, int]] = {}
    for row in r1.all():
        d = str(row.day)
        pid = str(row.project_id) if row.project_id else "inbox"
        proj_day_map.setdefault(d, {})[pid] = row.cnt

    by_project_per_day = []
    all_pids = list(proj_map.keys()) + ["inbox"]
    for i in range(days):
        d = str((since + timedelta(days=i + 1)).date())
        entry: dict = {"date": d[5:]}  # MM-DD
        for pid in all_pids:
            entry[pid] = proj_day_map.get(d, {}).get(pid, 0)
        by_project_per_day.append(entry)

    # 2. By priority per day (grouped bar chart)
    r2 = await db.execute(
        select(
            cast(Task.completed_at, Date).label("day"),
            Task.priority,
            func.count().label("cnt"),
        )
        .where(Task.user_id == user.id, Task.completed == True, Task.completed_at >= since)  # noqa: E712
        .group_by("day", Task.priority)
        .order_by("day")
    )
    prio_day_map: dict[str, dict[str, int]] = {}
    for row in r2.all():
        d = str(row.day)
        prio_day_map.setdefault(d, {})[f"p{row.priority}"] = row.cnt

    by_priority_per_day = []
    for i in range(days):
        d = str((since + timedelta(days=i + 1)).date())
        entry = {"date": d[5:]}
        for p in range(5):
            entry[f"p{p}"] = prio_day_map.get(d, {}).get(f"p{p}", 0)
        by_priority_per_day.append(entry)

    # 3. Weekly by project — donut chart
    r3 = await db.execute(
        select(Task.project_id, func.count().label("cnt"))
        .where(Task.user_id == user.id, Task.completed == True, Task.completed_at >= since_week)  # noqa: E712
        .group_by(Task.project_id)
    )
    weekly_by_project = []
    for row in r3.all():
        pid = str(row.project_id) if row.project_id else None
        if pid and pid in proj_map:
            weekly_by_project.append({"id": pid, "title": proj_map[pid]["title"], "color": proj_map[pid]["color"], "count": row.cnt})
        else:
            weekly_by_project.append({"id": "inbox", "title": "Входящие", "color": "#94a3b8", "count": row.cnt})

    # 4. By weekday — horizontal bar chart
    # PostgreSQL DOW: 0=Sunday, 1=Monday, ..., 6=Saturday
    r4 = await db.execute(
        select(
            extract("dow", Task.completed_at).label("dow"),
            func.count().label("cnt"),
        )
        .where(Task.user_id == user.id, Task.completed == True, Task.completed_at >= since)  # noqa: E712
        .group_by("dow")
    )
    dow_map = {int(row.dow): row.cnt for row in r4.all()}
    weekdays_ru = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"]
    # Reorder Mon→Sun: indices 1,2,3,4,5,6,0
    by_weekday = [
        {"day": weekdays_ru[i], "count": dow_map.get(i, 0)}
        for i in [1, 2, 3, 4, 5, 6, 0]
    ]

    return {
        "user_name": user.name or user.email,
        "projects": list(proj_map.values()),
        "by_project_per_day": by_project_per_day,
        "by_priority_per_day": by_priority_per_day,
        "weekly_by_project": weekly_by_project,
        "by_weekday": by_weekday,
        "days": days,
    }
