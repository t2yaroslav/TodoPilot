from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, cast, Date
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Task, User
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
