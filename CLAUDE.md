# TodoPilot

## Architecture
- **Frontend**: React 18 + Vite 6 + TypeScript + Mantine UI v7 + Zustand + React Router v6 + Recharts
- **Backend**: Python 3.12 + FastAPI + SQLAlchemy 2 (async) + Alembic + LiteLLM
- **DB**: PostgreSQL 18
- **Auth**: Passwordless email → JWT
- **Deploy**: Docker Compose (nginx → frontend + backend + postgres)

## Commands
- Start all: `docker compose up -d`
- Dev mode: `docker compose -f docker-compose.yml -f docker-compose.dev.yml up`
- Backend only: `cd backend && uvicorn app.main:app --reload`
- Frontend only: `cd frontend && npm run dev`
- DB migrate: `docker compose exec backend alembic upgrade head`
- Create migration: `cd backend && alembic revision --autogenerate -m "description"`
- Rebuild service (keep DB): `docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build backend`

## Entity Hierarchy
Task → Project → Goal → YearGoal (all links optional). Tasks support subtasks via `parent_task_id`.

## Key Conventions
- AI provider configured via `LLM_MODEL` env var (LiteLLM)
- `DATABASE_URL` in `.env` uses `localhost`; Docker Compose overrides to `postgres` service name
- Frontend API calls go through Axios client (`api/client.ts`) with JWT Bearer interceptor
- All state managed via Zustand stores (`authStore`, `taskStore`)
- UI language: Russian

## Detailed docs
- Backend: see `backend/CLAUDE.md`
- Frontend: see `frontend/CLAUDE.md`
