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
    SurveySaveDraftRequest,
    SurveyStatusOut,
    SurveySubmitRequest,
    SurveyUpdateRequest,
)
from ..services import ai_service
from ..services import task_queue
from .auth import get_current_user

router = APIRouter(prefix="/survey", tags=["survey"])


def _current_week_monday() -> date:
    """Return the Monday of the current week."""
    today = date.today()
    return today - timedelta(days=today.weekday())


async def _get_or_create_survey(user_id, monday, db: AsyncSession) -> WeeklySurvey:
    result = await db.execute(
        select(WeeklySurvey).where(
            WeeklySurvey.user_id == user_id,
            WeeklySurvey.week_start == monday,
        )
    )
    survey = result.scalar_one_or_none()
    if survey is None:
        survey = WeeklySurvey(user_id=user_id, week_start=monday)
        db.add(survey)
        await db.flush()
    return survey


async def _get_previous_retrospective(
    user_id, monday, db: AsyncSession, lookback_days: int = 31,
) -> dict | None:
    """Get the most recent completed survey before this week within lookback window."""
    earliest = monday - timedelta(days=lookback_days)
    result = await db.execute(
        select(WeeklySurvey)
        .where(
            WeeklySurvey.user_id == user_id,
            WeeklySurvey.week_start < monday,
            WeeklySurvey.week_start >= earliest,
            WeeklySurvey.completed == True,  # noqa: E712
        )
        .order_by(WeeklySurvey.week_start.desc())
        .limit(1)
    )
    prev = result.scalar_one_or_none()
    if prev is None:
        return None
    return {
        "achievements": prev.achievements or [],
        "difficulties": prev.difficulties or [],
        "improvements": prev.improvements or [],
        "weekly_goals": prev.weekly_goals or [],
        "goal_outcomes": prev.goal_outcomes or [],
    }


@router.get("/status", response_model=SurveyStatusOut)
async def survey_status(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Check if the weekly survey should be shown to the user."""
    today = date.today()
    monday = _current_week_monday()

    # Always fetch previous week's goals (needed for manual wizard opening too)
    prev_retro = await _get_previous_retrospective(user.id, monday, db)
    prev_goals = prev_retro.get("weekly_goals", []) if prev_retro else []
    no_goals_msg = None
    if prev_retro is not None and not prev_goals:
        no_goals_msg = "В предыдущем обзоре не были указаны цели"

    # Only auto-show on Monday
    if today.weekday() != 0:
        return SurveyStatusOut(
            should_show=False,
            previous_week_goals=prev_goals or None,
            no_goals_message=no_goals_msg,
        )

    # Check if survey already exists for this week
    result = await db.execute(
        select(WeeklySurvey).where(
            WeeklySurvey.user_id == user.id,
            WeeklySurvey.week_start == monday,
        )
    )
    survey = result.scalar_one_or_none()

    if survey is None:
        return SurveyStatusOut(
            should_show=True,
            previous_week_goals=prev_goals or None,
            no_goals_message=no_goals_msg,
        )

    if survey.completed:
        return SurveyStatusOut(
            should_show=False,
            survey_id=survey.id,
            already_completed=True,
            previous_week_goals=prev_goals or None,
            no_goals_message=no_goals_msg,
        )

    if survey.dismissed:
        return SurveyStatusOut(
            should_show=False,
            survey_id=survey.id,
            already_dismissed=True,
            previous_week_goals=prev_goals or None,
            no_goals_message=no_goals_msg,
        )

    # Survey exists but not completed/dismissed - show it with draft data
    return SurveyStatusOut(
        should_show=True,
        survey_id=survey.id,
        draft=survey,
        previous_week_goals=prev_goals or None,
        no_goals_message=no_goals_msg,
    )


@router.post("/dismiss")
async def dismiss_survey(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dismiss the weekly survey for this week."""
    monday = _current_week_monday()
    survey = await _get_or_create_survey(user.id, monday, db)
    survey.dismissed = True
    await db.commit()
    return {"ok": True}


@router.post("/save-draft", response_model=SurveyOut)
async def save_draft(
    body: SurveySaveDraftRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Save partial survey data as a draft."""
    monday = _current_week_monday()
    survey = await _get_or_create_survey(user.id, monday, db)

    if body.goal_outcomes is not None:
        survey.goal_outcomes = [o.model_dump() for o in body.goal_outcomes]
    if body.achievements is not None:
        survey.achievements = body.achievements
    if body.difficulties is not None:
        survey.difficulties = body.difficulties
    if body.improvements is not None:
        survey.improvements = body.improvements
    if body.weekly_goals is not None:
        survey.weekly_goals = body.weekly_goals

    await db.commit()
    await db.refresh(survey)
    return survey


@router.post("/generate")
async def generate_suggestions(
    body: SurveyGenerateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Generate AI suggestions for steps 2, 4 or 5. Step 1 is goal outcomes, step 3 is manual."""
    if body.step not in (2, 4, 5):
        raise HTTPException(status_code=400, detail="AI generation is only for steps 2, 4, 5")

    monday = _current_week_monday()

    # Fetch last week's tasks (fast DB query)
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

    # Build previous answers context
    previous_answers = {}
    if body.goal_outcomes is not None:
        previous_answers["goal_outcomes"] = [o.model_dump() for o in body.goal_outcomes]
    if body.achievements is not None:
        previous_answers["achievements"] = body.achievements
    if body.difficulties is not None:
        previous_answers["difficulties"] = body.difficulties
    if body.improvements is not None:
        previous_answers["improvements"] = body.improvements

    # Fetch previous retrospective for context
    previous_retrospective = await _get_previous_retrospective(user.id, monday, db)

    # Submit LLM call to background queue (returns immediately)
    op_type = f"survey_generate_step_{body.step}"
    task_id = await task_queue.submit(
        ai_service.generate_survey_step(
            step=body.step,
            week_tasks=week_tasks,
            goals=goals,
            user_profile=user.profile_text,
            previous_answers=previous_answers if previous_answers else None,
            previous_retrospective=previous_retrospective,
            user_settings=user.settings,
        ),
        operation_type=op_type,
    )
    return {"task_id": task_id}


@router.post("/submit", response_model=SurveyOut)
async def submit_survey(
    body: SurveySubmitRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Submit the completed weekly survey. Returns immediately without AI processing."""
    monday = _current_week_monday()
    survey = await _get_or_create_survey(user.id, monday, db)

    survey.goal_outcomes = [o.model_dump() for o in body.goal_outcomes]
    survey.achievements = body.achievements
    survey.difficulties = body.difficulties
    survey.improvements = body.improvements
    survey.weekly_goals = body.weekly_goals
    survey.completed = True
    survey.dismissed = False

    await db.commit()
    await db.refresh(survey)
    return survey


@router.post("/update-profile")
async def update_profile_from_survey(
    body: SurveySubmitRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update psychoportrait based on survey answers. Called in the background."""
    user_id = user.id
    current_profile = user.profile_text
    u_settings = user.settings
    survey_data = {
        "goal_outcomes": [o.model_dump() for o in body.goal_outcomes],
        "achievements": body.achievements,
        "difficulties": body.difficulties,
        "improvements": body.improvements,
        "weekly_goals": body.weekly_goals,
    }

    async def _run():
        from ..database import async_session
        new_profile = await ai_service.update_psychoportrait(
            current_profile=current_profile,
            survey_data=survey_data,
            user_settings=u_settings,
        )
        if new_profile:
            async with async_session() as session:
                u = await session.get(User, user_id)
                if u:
                    u.profile_text = new_profile
                    await session.commit()
        return {"ok": True}

    task_id = await task_queue.submit(_run())
    return {"task_id": task_id}


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


@router.patch("/results/{survey_id}", response_model=SurveyOut)
async def update_survey_result(
    survey_id: str,
    body: SurveyUpdateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update a specific survey result (e.g. goal outcomes)."""
    result = await db.execute(
        select(WeeklySurvey).where(
            WeeklySurvey.id == survey_id,
            WeeklySurvey.user_id == user.id,
        )
    )
    survey = result.scalar_one_or_none()
    if not survey:
        raise HTTPException(status_code=404, detail="Опрос не найден")

    if body.goal_outcomes is not None:
        survey.goal_outcomes = [o.model_dump() for o in body.goal_outcomes]
    if body.achievements is not None:
        survey.achievements = body.achievements
    if body.difficulties is not None:
        survey.difficulties = body.difficulties
    if body.improvements is not None:
        survey.improvements = body.improvements
    if body.weekly_goals is not None:
        survey.weekly_goals = body.weekly_goals

    await db.commit()
    await db.refresh(survey)
    return survey


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
