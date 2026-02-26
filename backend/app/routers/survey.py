from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Goal, Project, Task, User, WeeklySurvey
from ..schemas import (
    SurveyGenerateRequest,
    SurveyGenerateResponse,
    SurveyOut,
    SurveyStatusOut,
    SurveySubmitRequest,
)
from ..services import ai_service
from .auth import get_current_user

router = APIRouter(prefix="/survey", tags=["survey"])


def _current_week_monday() -> date:
    """Return the Monday of the current week."""
    today = date.today()
    return today - timedelta(days=today.weekday())


@router.get("/status", response_model=SurveyStatusOut)
async def survey_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check if the weekly survey should be shown to the user."""
    today = date.today()
    monday = _current_week_monday()

    # Only show on Monday
    if today.weekday() != 0:
        return SurveyStatusOut(should_show=False)

    # Check if survey already exists for this week
    result = await db.execute(
        select(WeeklySurvey).where(
            WeeklySurvey.user_id == user.id,
            WeeklySurvey.week_start == monday,
        )
    )
    survey = result.scalar_one_or_none()

    if survey is None:
        return SurveyStatusOut(should_show=True)

    if survey.completed:
        return SurveyStatusOut(
            should_show=False,
            survey_id=survey.id,
            already_completed=True,
        )

    if survey.dismissed:
        return SurveyStatusOut(
            should_show=False,
            survey_id=survey.id,
            already_dismissed=True,
        )

    # Survey exists but not completed/dismissed — show it (user may have started it)
    return SurveyStatusOut(should_show=True, survey_id=survey.id)


@router.post("/dismiss")
async def dismiss_survey(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dismiss the weekly survey for this week."""
    monday = _current_week_monday()

    result = await db.execute(
        select(WeeklySurvey).where(
            WeeklySurvey.user_id == user.id,
            WeeklySurvey.week_start == monday,
        )
    )
    survey = result.scalar_one_or_none()

    if survey is None:
        survey = WeeklySurvey(user_id=user.id, week_start=monday, dismissed=True)
        db.add(survey)
    else:
        survey.dismissed = True

    await db.commit()
    return {"ok": True}


@router.post("/generate", response_model=SurveyGenerateResponse)
async def generate_suggestions(
    body: SurveyGenerateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate AI suggestions for a specific wizard step."""
    if body.step not in (1, 2, 3, 4):
        raise HTTPException(status_code=400, detail="step must be 1-4")

    # Fetch last week's tasks
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    tasks_result = await db.execute(
        select(Task).where(
            Task.user_id == user.id,
            Task.created_at >= week_ago,
        )
    )
    tasks = tasks_result.scalars().all()

    # Fetch project titles for context
    project_ids = {t.project_id for t in tasks if t.project_id}
    projects_map = {}
    if project_ids:
        proj_result = await db.execute(
            select(Project).where(Project.id.in_(project_ids))
        )
        projects_map = {p.id: p.title for p in proj_result.scalars().all()}

    week_tasks = [
        {
            "title": t.title,
            "completed": t.completed,
            "project_title": projects_map.get(t.project_id, ""),
        }
        for t in tasks
    ]

    # Fetch goals
    goals_result = await db.execute(select(Goal).where(Goal.user_id == user.id))
    goals = [{"title": g.title} for g in goals_result.scalars().all()]

    # Build previous answers context for steps 3-4
    previous_answers = {}
    if body.achievements:
        previous_answers["achievements"] = body.achievements
    if body.difficulties:
        previous_answers["difficulties"] = body.difficulties
    if body.improvements:
        previous_answers["improvements"] = body.improvements

    suggestions = await ai_service.generate_survey_step(
        step=body.step,
        week_tasks=week_tasks,
        goals=goals,
        user_profile=user.profile_text,
        previous_answers=previous_answers if previous_answers else None,
    )

    return SurveyGenerateResponse(suggestions=suggestions)


@router.post("/submit", response_model=SurveyOut)
async def submit_survey(
    body: SurveySubmitRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit the completed weekly survey."""
    monday = _current_week_monday()

    result = await db.execute(
        select(WeeklySurvey).where(
            WeeklySurvey.user_id == user.id,
            WeeklySurvey.week_start == monday,
        )
    )
    survey = result.scalar_one_or_none()

    if survey is None:
        survey = WeeklySurvey(user_id=user.id, week_start=monday)
        db.add(survey)

    survey.achievements = body.achievements
    survey.difficulties = body.difficulties
    survey.improvements = body.improvements
    survey.weekly_goals = body.weekly_goals
    survey.completed = True
    survey.dismissed = False

    await db.commit()
    await db.refresh(survey)
    return survey


@router.get("/results", response_model=list[SurveyOut])
async def get_survey_results(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all completed surveys for the user, newest first."""
    result = await db.execute(
        select(WeeklySurvey)
        .where(
            WeeklySurvey.user_id == user.id,
            WeeklySurvey.completed == True,  # noqa: E712
        )
        .order_by(WeeklySurvey.week_start.desc())
    )
    return result.scalars().all()


@router.get("/results/{survey_id}", response_model=SurveyOut)
async def get_survey_result(
    survey_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get a specific survey result."""
    result = await db.execute(
        select(WeeklySurvey).where(
            WeeklySurvey.id == survey_id,
            WeeklySurvey.user_id == user.id,
        )
    )
    survey = result.scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Опрос не найден")
    return survey
