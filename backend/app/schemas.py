from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


# Auth
class AuthRequest(BaseModel):
    email: EmailStr


class AuthVerify(BaseModel):
    email: EmailStr
    code: str


class GoogleAuthRequest(BaseModel):
    credential: str  # Google ID token from Google Sign-In


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# User
class UserOut(BaseModel):
    id: UUID
    email: str
    name: str | None
    profile_text: str | None
    settings: dict | None
    is_admin: bool = False

    model_config = {"from_attributes": True}


class UserUpdate(BaseModel):
    name: str | None = None
    profile_text: str | None = None
    settings: dict | None = None


# Goal
class GoalCreate(BaseModel):
    title: str
    color: str = "#6366f1"
    goal_type: str = "quarterly"
    parent_goal_id: UUID | None = None


class GoalUpdate(BaseModel):
    title: str | None = None
    color: str | None = None
    goal_type: str | None = None
    parent_goal_id: UUID | None = None


class GoalOut(BaseModel):
    id: UUID
    title: str
    color: str
    goal_type: str
    parent_goal_id: UUID | None
    created_at: datetime

    model_config = {"from_attributes": True}


# Entity Links
class LinkCreate(BaseModel):
    source_type: str  # "goal" or "project"
    source_id: UUID
    target_type: str  # "goal" or "project"
    target_id: UUID


class GoalLinkOut(BaseModel):
    id: UUID
    source_goal_id: UUID
    target_goal_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectGoalLinkOut(BaseModel):
    id: UUID
    project_id: UUID
    goal_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


class LinksOut(BaseModel):
    goal_links: list[GoalLinkOut]
    project_goal_links: list[ProjectGoalLinkOut]


# Project
class ProjectCreate(BaseModel):
    title: str
    color: str = "#8b5cf6"
    goal_id: UUID | None = None


class ProjectUpdate(BaseModel):
    title: str | None = None
    color: str | None = None
    goal_id: UUID | None = None
    position: int | None = None


class ProjectOut(BaseModel):
    id: UUID
    title: str
    color: str
    goal_id: UUID | None
    position: int
    created_at: datetime
    deleted_at: datetime | None = None

    model_config = {"from_attributes": True}


# Task
class TaskCreate(BaseModel):
    title: str
    description: str | None = None
    priority: int = 0
    due_date: datetime | None = None
    project_id: UUID | None = None
    goal_id: UUID | None = None
    parent_task_id: UUID | None = None
    recurrence: str | None = None  # daily, weekly, biweekly, monthly, yearly


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: int | None = None
    due_date: datetime | None = None
    completed: bool | None = None
    project_id: UUID | None = None
    goal_id: UUID | None = None
    position: int | None = None
    recurrence: str | None = None


class TaskOut(BaseModel):
    id: UUID
    title: str
    description: str | None
    priority: int
    due_date: datetime | None
    completed: bool
    completed_at: datetime | None
    project_id: UUID | None
    goal_id: UUID | None
    parent_task_id: UUID | None
    recurrence: str | None
    position: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Feedback
class FeedbackOut(BaseModel):
    id: UUID
    user_id: UUID
    category: str
    message: str
    screenshot_path: str | None
    status: str
    admin_response: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class FeedbackAdminOut(FeedbackOut):
    user_email: str = ""
    user_name: str | None = None


class FeedbackAdminUpdate(BaseModel):
    status: str | None = None
    admin_response: str | None = None


# Stats
class DayStat(BaseModel):
    date: str
    count: int
    breakdown: dict[str, int] = {}


# AI
class AIMessage(BaseModel):
    message: str
    context: str | None = None  # "onboarding", "retrospective", "general"


class AIResponse(BaseModel):
    reply: str
    suggestions: list[dict] | None = None


# AI Chat with actions
class AIChatMessage(BaseModel):
    message: str
    history: list[dict] = []


class TaskAction(BaseModel):
    action: str  # "create", "complete", "move"
    task_id: str | None = None
    title: str | None = None
    project_id: str | None = None
    goal_id: str | None = None
    priority: int | None = None
    due_date: str | None = None


class AIChatResponse(BaseModel):
    reply: str
    actions: list[TaskAction] = []


# Brain dump
class BrainDumpRequest(BaseModel):
    text: str


class BrainDumpItem(BaseModel):
    type: str  # "task", "project", "goal"
    title: str
    priority: int = 0
    due_date: str | None = None
    project: str | None = None
    goal: str | None = None


class BrainDumpResponse(BaseModel):
    reply: str
    items: list[BrainDumpItem] = []


class BrainDumpSaveRequest(BaseModel):
    items: list[BrainDumpItem]


# Weekly Survey
class SurveyStatusOut(BaseModel):
    should_show: bool
    survey_id: UUID | None = None
    already_completed: bool = False
    already_dismissed: bool = False
    draft: "SurveyOut | None" = None  # existing draft data
    previous_week_goals: list[str] | None = None  # goals from previous completed survey
    no_goals_message: str | None = None  # message when previous survey exists but has no goals


class GoalOutcome(BaseModel):
    goal: str
    completed: bool | None = None


class SurveyGenerateRequest(BaseModel):
    step: int  # 1-5 (step 0 is goal outcomes, step 3 is manual)
    goal_outcomes: list[GoalOutcome] | None = None
    achievements: list[str] | None = None
    difficulties: list[str] | None = None
    improvements: list[str] | None = None


class SurveyGenerateResponse(BaseModel):
    suggestions: list[str]


class SurveySaveDraftRequest(BaseModel):
    goal_outcomes: list[GoalOutcome] | None = None
    achievements: list[str] | None = None
    difficulties: list[str] | None = None
    improvements: list[str] | None = None
    weekly_goals: list[str] | None = None


class SurveySubmitRequest(BaseModel):
    goal_outcomes: list[GoalOutcome]
    achievements: list[str]
    difficulties: list[str]
    improvements: list[str]
    weekly_goals: list[str]


class SurveyUpdateRequest(BaseModel):
    goal_outcomes: list[GoalOutcome] | None = None
    achievements: list[str] | None = None
    difficulties: list[str] | None = None
    improvements: list[str] | None = None
    weekly_goals: list[str] | None = None


class SurveyOut(BaseModel):
    id: UUID
    week_start: datetime
    goal_outcomes: list[GoalOutcome] | None
    achievements: list[str] | None
    difficulties: list[str] | None
    improvements: list[str] | None
    weekly_goals: list[str] | None
    dismissed: bool
    completed: bool
    created_at: datetime

    model_config = {"from_attributes": True}
