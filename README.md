# TodoPilot

AI-powered task manager with productivity analytics. Combines Todoist-like minimalism with an AI assistant that connects daily tasks to long-term goals.

## Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, Vite 6, TypeScript 5, Mantine UI v7, Zustand 5, React Router v6, Recharts, Tabler Icons |
| **Backend** | Python 3.12, FastAPI, SQLAlchemy 2 (async), Alembic, Pydantic Settings |
| **AI** | LiteLLM (OpenAI / Claude / Deepseek / Ollama — switch via env var) |
| **Database** | PostgreSQL 18 |
| **Auth** | Passwordless email code + JWT |
| **Deploy** | Docker Compose (nginx + frontend + backend + postgres) |

## Features

- Task management with priorities P1–P4 (color-coded like Todoist)
- Subtasks with parent-child hierarchy
- Projects and Goals hierarchy (Task → Project → Goal → Year Goal, all links optional)
- Recurrence: daily, weekly, biweekly, monthly, yearly
- Views: Inbox, Today, Upcoming, Completed
- Productivity chart (line graph by day, colored by project)
- AI assistant: chat, productivity analysis, weekly retrospective, onboarding
- Passwordless auth (email code → JWT)
- Dark/light theme
- Responsive design

## Quick Start

```bash
# 1. Copy env file and configure
cp .env.example .env
# Edit .env: set JWT_SECRET, SMTP credentials, LLM_API_KEY

# 2. Run all services
docker compose up -d

# 3. Apply database migrations
docker compose exec backend alembic upgrade head

# 4. Open http://localhost
```

## Local Development

### Option A — Postgres in Docker, backend + frontend on host

```bash
# Start only Postgres
docker compose up postgres -d

# Backend (terminal 1)
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# Frontend (terminal 2)
cd frontend
npm install
npm run dev
```

> `.env` uses `DATABASE_URL` with `localhost` — works as-is for host access.

### Option B — Everything in Docker with hot reload

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

Backend and frontend source code is mounted as volumes, so file changes apply automatically.

> Docker Compose overrides `DATABASE_URL` to use `postgres` (service name) instead of `localhost`.

#### Force-rebuild frontend/backend (without losing DB data)

When you change `package.json`, `requirements.txt`, `Dockerfile`, or need a clean rebuild:

```bash
# Rebuild and restart only frontend
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build frontend

# Rebuild and restart only backend
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build backend

# Rebuild both (DB data is preserved — pgdata volume is not affected)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build backend frontend

# Full rebuild from scratch (still preserves DB — only removes container images)
docker compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache backend frontend
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

> DB data is stored in the `pgdata` Docker volume and is **never** deleted by `--build` or `--no-cache`.
> To actually reset the DB: `docker compose down -v` (removes volumes).

#### Apply new migrations after backend rebuild

```bash
docker compose exec backend alembic upgrade head
```

## AI Provider Switching

Set `LLM_MODEL` in `.env`:

| Provider | Model value | Notes |
|----------|------------|-------|
| OpenAI | `gpt-4o-mini`, `gpt-4o` | Default |
| Claude | `claude-sonnet-4-20250514`, `claude-haiku-4-20250414` | |
| Deepseek | `deepseek/deepseek-chat` | |
| Local (Ollama) | `ollama/llama3` | Set `LLM_API_BASE=http://ollama:11434` |

## Environment Variables

See [`.env.example`](.env.example) for all variables:

- **Database**: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `DATABASE_URL`
- **JWT**: `JWT_SECRET`, `JWT_ALGORITHM`, `JWT_EXPIRE_MINUTES`
- **SMTP**: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`
- **AI**: `LLM_MODEL`, `LLM_API_KEY`, `LLM_API_BASE`
- **Frontend**: `VITE_API_URL`

## API Endpoints

| Router | Key Endpoints |
|--------|--------------|
| `/auth` | `POST /send-code`, `POST /verify`, `GET /me`, `PATCH /me` |
| `/tasks` | CRUD + `GET /counts`, `POST /{id}/complete`, `POST /{id}/incomplete` |
| `/projects` | CRUD + `GET /task-counts` |
| `/goals` | CRUD |
| `/stats` | `GET /productivity?days=N` |
| `/ai` | `POST /chat`, `GET /productivity-analysis`, `GET /retrospective`, `POST /onboarding` |

## Project Structure

```
TodoPilot/
├── docker-compose.yml        # Production services
├── docker-compose.dev.yml    # Dev overrides (hot reload, volume mounts)
├── .env.example              # Environment variables template
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   └── app/
│       ├── main.py           # FastAPI entry + CORS + error handlers
│       ├── config.py         # Pydantic Settings
│       ├── database.py       # Async SQLAlchemy engine/session
│       ├── models.py         # ORM models (User, Task, Project, Goal, AuthCode)
│       ├── schemas.py        # Pydantic request/response schemas
│       ├── routers/          # auth, tasks, projects, goals, stats, ai
│       ├── services/
│       │   └── ai_service.py # LiteLLM multi-provider wrapper
│       └── migrations/       # Alembic migrations
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   └── src/
│       ├── main.tsx          # React entry + Mantine providers
│       ├── App.tsx           # Router + protected routes
│       ├── api/client.ts     # Axios client + auth interceptor
│       ├── stores/           # Zustand (authStore, taskStore)
│       ├── pages/            # Login, Today, Inbox, Upcoming, Completed, Project, Settings
│       ├── components/       # layout/, tasks/, ai/, stats/, auth/
│       └── lib/              # dates.ts, theme.ts
└── nginx/
    └── nginx.conf            # Reverse proxy (/ → frontend, /api → backend)
```
