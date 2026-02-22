# TodoPilot - AI-powered Task Manager

## Architecture
- **Frontend**: React 18 + Vite + TypeScript + Mantine UI v7 + Zustand + React Router v6 + Recharts
- **Backend**: Python FastAPI + SQLAlchemy (async) + Alembic + LiteLLM
- **DB**: PostgreSQL 18
- **Auth**: Passwordless email (JWT tokens)
- **Deploy**: Docker Compose (nginx + frontend + backend + postgres)

## Project Structure
```
TodoPilot/
├── CLAUDE.md              # This file
├── docker-compose.yml     # All services
├── docker-compose.dev.yml # Dev overrides (hot reload)
├── .env.example           # Environment variables template
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── app/
│   │   ├── main.py          # FastAPI app entry
│   │   ├── config.py        # Settings (pydantic-settings)
│   │   ├── database.py      # Async SQLAlchemy engine/session
│   │   ├── models.py        # SQLAlchemy ORM models
│   │   ├── schemas.py       # Pydantic schemas
│   │   ├── routers/
│   │   │   ├── auth.py      # Email code auth + JWT
│   │   │   ├── tasks.py     # CRUD tasks, subtasks
│   │   │   ├── projects.py  # CRUD projects
│   │   │   ├── goals.py     # CRUD goals
│   │   │   ├── stats.py     # Productivity statistics
│   │   │   └── ai.py        # AI assistant endpoints
│   │   ├── services/
│   │   │   └── ai_service.py # LiteLLM multi-provider wrapper
│   │   └── migrations/      # Alembic migrations
│   └── tests/
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── index.html
│   ├── src/
│   │   ├── main.tsx         # React entry
│   │   ├── App.tsx          # Router + providers
│   │   ├── api/client.ts    # Axios API client
│   │   ├── stores/          # Zustand stores
│   │   │   ├── authStore.ts
│   │   │   └── taskStore.ts
│   │   ├── pages/           # Route pages
│   │   ├── components/
│   │   │   ├── layout/      # Sidebar, AppShell
│   │   │   ├── tasks/       # TaskList, TaskItem, TaskForm
│   │   │   ├── ai/          # AIModal, AIChat
│   │   │   ├── stats/       # ProductivityChart
│   │   │   └── auth/        # LoginForm
│   │   └── lib/             # Helpers, constants
│   └── public/
└── nginx/
    └── nginx.conf           # Reverse proxy config
```

## Key Design Decisions
- **LiteLLM** for AI: unified API to switch between OpenAI/Claude/Deepseek/local via env var `LLM_MODEL`
- **Mantine UI v7**: full component library (modals, forms, notifications) → minimal custom CSS
- **Zustand**: lightweight state, no boilerplate vs Redux
- **Passwordless auth**: email code → JWT, no password storage
- **Entity hierarchy**: Task → Project → Goal → YearGoal (all links optional)

## DB Models (key entities)
- `User`: id, email, name, profile_text (AI psychoportrait), settings (JSONB)
- `Goal`: id, user_id, title, color, type (quarterly/yearly), parent_goal_id
- `Project`: id, user_id, title, color, goal_id (optional)
- `Task`: id, user_id, title, description, priority (0-3), due_date, completed, completed_at, project_id, goal_id, parent_task_id, recurrence, position
- `AuthCode`: id, email, code, expires_at

## AI Provider Config (env vars)
```
LLM_MODEL=gpt-4o-mini          # or claude-sonnet-4-20250514, deepseek/deepseek-chat, ollama/llama3
LLM_API_KEY=sk-...              # provider API key
LLM_API_BASE=                   # optional: for local models (http://ollama:11434)
```

## Commands
- `docker compose up -d` — start all services
- `docker compose -f docker-compose.yml -f docker-compose.dev.yml up` — dev mode with hot reload
- Backend only: `cd backend && uvicorn app.main:app --reload`
- Frontend only: `cd frontend && npm run dev`
- DB migrations: `cd backend && alembic upgrade head`
- Create migration: `cd backend && alembic revision --autogenerate -m "description"`
