"""Seed data for new user onboarding."""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from ..models import Goal, Project, Task


async def create_onboarding_data(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Create example goal, project, and tasks so a new user sees a helpful starting point."""

    today = datetime.now(timezone.utc).replace(hour=20, minute=0, second=0, microsecond=0)
    tomorrow = today + timedelta(days=1)
    yesterday = today - timedelta(days=1)

    goal = Goal(
        user_id=user_id,
        title="Освоить TodoPilot",
        color="#6366f1",
        goal_type="quarterly",
    )
    db.add(goal)
    await db.flush()

    project = Project(
        user_id=user_id,
        title="Знакомство",
        color="#8b5cf6",
        goal_id=goal.id,
        position=0,
    )
    db.add(project)
    await db.flush()

    tasks = [
        Task(
            user_id=user_id,
            title="Создать свою первую задачу",
            priority=3,
            due_date=today,
            project_id=project.id,
            goal_id=goal.id,
            position=0,
        ),
        Task(
            user_id=user_id,
            title="Настроить приоритет и срок выполнения",
            priority=2,
            due_date=today,
            project_id=project.id,
            goal_id=goal.id,
            position=1,
        ),
        Task(
            user_id=user_id,
            title="Создать свой проект",
            description="Проекты помогают группировать задачи. Перейдите в раздел проектов и создайте свой первый проект.",
            priority=1,
            due_date=today,
            project_id=project.id,
            goal_id=goal.id,
            position=2,
        ),
        Task(
            user_id=user_id,
            title="Попробовать AI-ассистента",
            description="Откройте чат с AI - он поможет спланировать задачи, разбить цели на шаги и провести ретроспективу.",
            priority=1,
            due_date=today,
            project_id=project.id,
            goal_id=goal.id,
            position=3,
        ),
        Task(
            user_id=user_id,
            title="Найти лучший трекер задач",
            priority=4,
            due_date=yesterday,
            project_id=project.id,
            goal_id=goal.id,
            position=4
        ),
        Task(
            user_id=user_id,
            title="Удалить этот проект, когда освоитесь",
            description="Когда разберётесь - смело удаляйте этот проект. Удачного планирования!",
            priority=0,
            due_date=tomorrow,
            project_id=project.id,
            goal_id=goal.id,
            position=5,
        ),
    ]
    db.add_all(tasks)
