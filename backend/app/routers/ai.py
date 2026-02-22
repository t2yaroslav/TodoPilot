from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Goal, Task, User
from ..schemas import AIMessage, AIResponse
from ..services import ai_service
from .auth import get_current_user

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/chat", response_model=AIResponse)
async def ai_chat(
    body: AIMessage,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Gather context
    result = await db.execute(
        select(Task).where(Task.user_id == user.id, Task.completed == False).limit(50)  # noqa: E712
    )
    tasks = result.scalars().all()
    tasks_ctx = "\n".join(f"- {t.title} (приоритет: {t.priority}, дедлайн: {t.due_date})" for t in tasks)

    messages = [{"role": "user", "content": body.message}]
    reply = await ai_service.chat(messages, user_profile=user.profile_text, tasks_context=tasks_ctx)
    return AIResponse(reply=reply)


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
    analysis = await ai_service.analyze_productivity(tasks, user_profile=user.profile_text)
    return {"analysis": analysis}


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

    retro = await ai_service.weekly_retrospective(tasks, goals, user_profile=user.profile_text)
    return retro


@router.post("/onboarding")
async def onboarding(body: AIMessage, user: User = Depends(get_current_user)):
    history = []
    reply = await ai_service.onboarding_chat(body.message, history)
    return {"reply": reply}
