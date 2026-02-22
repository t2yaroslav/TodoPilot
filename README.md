# TodoPulse

AI-powered task manager with productivity analytics. Combines Todoist-like minimalism with an AI assistant that connects daily tasks to long-term goals.

## Stack

- **Frontend**: React 18 + Vite + Mantine UI v7 + Zustand + Recharts
- **Backend**: Python FastAPI + SQLAlchemy (async) + PostgreSQL
- **AI**: LiteLLM (OpenAI / Claude / Deepseek / Ollama — switch via env var)
- **Auth**: Passwordless email code + JWT
- **Deploy**: Docker Compose

## Quick Start

```bash
# 1. Copy env file
cp .env.example .env
# Edit .env with your settings (SMTP, LLM API key)

# 2. Run with Docker
docker compose up -d

# 3. Open http://localhost
```

## Development

```bash
# Start DB + backend + frontend with hot reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or run separately:
# Backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

## AI Provider Switching

Set `LLM_MODEL` in `.env`:

| Provider | Model value |
|----------|------------|
| OpenAI | `gpt-4o-mini`, `gpt-4o` |
| Claude | `claude-sonnet-4-20250514` |
| Deepseek | `deepseek/deepseek-chat` |
| Local (Ollama) | `ollama/llama3` + `LLM_API_BASE=http://localhost:11434` |

## Features (MVP)

- Task management with priorities (P1-P4 color-coded like Todoist)
- Projects and Goals hierarchy (all links optional)
- Inbox, Today, Upcoming, Completed views
- Productivity chart (line graph by day, colored by project)
- AI assistant: chat, productivity analysis, weekly retrospective
- Passwordless auth (email code)
- Dark/light theme
- Responsive design
