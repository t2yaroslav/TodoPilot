# Backend — FastAPI + SQLAlchemy

## Stack
Python 3.12, FastAPI, SQLAlchemy 2 (async + asyncpg), Alembic, Pydantic Settings, LiteLLM, python-jose (JWT), aiosmtplib

## Entry Point
`app/main.py` — CORS setup, lifespan (db tables creation), error handlers, router registration.

## Config
`app/config.py` — Pydantic Settings. Env vars: DATABASE_URL, JWT_SECRET/ALGORITHM/EXPIRE_MINUTES, SMTP_*, LLM_MODEL/API_KEY/API_BASE.

## DB Models (`app/models.py`)
- `User`: id, email, name, profile_text (AI psychoportrait), settings (JSONB), created_at
- `AuthCode`: id, email, code, expires_at, used
- `Goal`: id, user_id, title, color, goal_type (quarterly/yearly), parent_goal_id, created_at
- `Project`: id, user_id, title, color, goal_id, position, created_at
- `Task`: id, user_id, title, description, priority (0-4), due_date, completed, completed_at, project_id, goal_id, parent_task_id, recurrence (daily/weekly/biweekly/monthly/yearly), position, created_at, updated_at

## Routers (`app/routers/`)
| File | Prefix | Key Endpoints |
|------|--------|--------------|
| `auth.py` | `/auth` | POST /send-code, POST /verify, GET /me, PATCH /me |
| `tasks.py` | `/tasks` | CRUD + GET /counts, POST /{id}/complete, POST /{id}/incomplete. Filters: project_id, goal_id, completed, due_today, upcoming, inbox, parent_task_id |
| `projects.py` | `/projects` | CRUD + GET /task-counts |
| `goals.py` | `/goals` | CRUD |
| `stats.py` | `/stats` | GET /productivity?days=N |
| `ai.py` | `/ai` | POST /chat, GET /productivity-analysis, GET /retrospective, POST /onboarding |

## AI Service (`app/services/ai_service.py`)
LiteLLM wrapper. Functions: `chat()`, `analyze_productivity()`, `weekly_retrospective()`, `onboarding_chat()`. Uses `drop_params=True` for cross-provider compatibility. System prompts in Russian.

## Migrations
Alembic config in `alembic.ini`. Migrations in `app/migrations/`. Run: `alembic upgrade head`. Create: `alembic revision --autogenerate -m "description"`.

## Auth Flow
1. POST /auth/send-code → 6-digit code via SMTP (returns `dev_code` if SMTP not configured)
2. POST /auth/verify → validates code, creates user if new, returns JWT
3. JWT in Authorization: Bearer header on all protected endpoints
