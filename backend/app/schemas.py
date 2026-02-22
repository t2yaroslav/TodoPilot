from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr


# Auth
class AuthRequest(BaseModel):
    email: EmailStr


class AuthVerify(BaseModel):
    email: EmailStr
    code: str


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


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    priority: int | None = None
    due_date: datetime | None = None
    completed: bool | None = None
    project_id: UUID | None = None
    goal_id: UUID | None = None
    position: int | None = None


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
    position: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


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
