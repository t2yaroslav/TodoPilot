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

## Logging
Centralized structured JSON logging across all services. Logs converge in backend stdout.

### Settings (`.env`)
- `LOG_LEVEL` — уровень логирования: `DEBUG`, `INFO` (default), `WARNING`, `ERROR`
- `LOG_FORMAT` — формат вывода: `json` (default) или `text` (человекочитаемый для локальной разработки)

### Architecture
- **Backend** (`app/logging_config.py`): JSON-line formatter, HTTP request middleware с `request_id` и `duration_ms`, все exception handlers пишут в логи
- **Frontend** (`src/lib/logger.ts`): батчированная отправка логов на `POST /api/logs`, буфер сбрасывается каждые 5с или при 10 записях, ошибки отправляются немедленно. `navigator.sendBeacon` при закрытии страницы
- **Browser**: глобальные обработчики `window.onerror` и `window.onunhandledrejection` (`src/main.tsx`)
- **Nginx**: JSON access log формат, совместимый с backend-логами
- **Docker**: ротация логов (max-size/max-file) на всех сервисах

### Sources
Каждая запись содержит поле `source`:
- `backend` — HTTP-запросы, ошибки БД, необработанные исключения
- `frontend` — ошибки API (Axios interceptor), ошибки JS в браузере
- `nginx` — HTTP access logs

### Filtering logs

**Linux / macOS (bash):**
```bash
# Только ошибки
docker compose logs | grep '"level":"ERROR"'

# Логи из браузера
docker compose logs backend | grep '"source":"frontend"'

# Nginx access logs
docker compose logs nginx | grep '"source":"nginx"'

# По пользователю
docker compose logs backend | grep '"user_id":"<uuid>"'

# Медленные запросы (>1s)
docker compose logs backend | grep '"duration_ms":' | grep -E '"duration_ms":[0-9]{4,}'
```

**Windows (PowerShell):**
```powershell
# Только ошибки
docker compose logs | Select-String '"level":"ERROR"'

# Логи из браузера
docker compose logs backend | Select-String '"source":"frontend"'

# Nginx access logs
docker compose logs nginx | Select-String '"source":"nginx"'

# По пользователю
docker compose logs backend | Select-String '"user_id":"<uuid>"'

# Медленные запросы (>1s)
docker compose logs backend | Select-String '"duration_ms":\d{4,}'
```

### Frontend logger API (`src/lib/logger.ts`)
```typescript
import { logger } from './lib/logger';

logger.debug('отладочное сообщение', { key: 'value' });
logger.info('информация');
logger.warn('предупреждение');
logger.error('ошибка', { stack: error.stack });
```

### Log endpoint
`POST /api/logs` — принимает массив `LogEntry[]`, требует JWT. Rate limit: 100 записей/мин на пользователя.

## Detailed docs
- Backend: see `backend/CLAUDE.md`
- Frontend: see `frontend/CLAUDE.md`
