import logging
import os
import time
import traceback
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from .config import settings
from .database import engine
from .logging_config import setup_logging
from .models import Base
from .routers import ai, ai_tasks, auth, feedback, goals, logs, projects, stats, survey, tasks

DEV_MODE = os.getenv("FASTAPI_ENV", "development") != "production"

# Centralized structured logging
setup_logging(level=settings.log_level, fmt=settings.log_format)
logger = logging.getLogger("todopilot.http")

# LLM debug logging - the todopilot.llm logger inherits formatter from setup_logging()
if settings.llm_debug:
    logging.getLogger("todopilot.llm").setLevel(logging.DEBUG)


def _build_error_detail(request: Request, exc: Exception) -> dict:
    """Build a detailed error response for dev mode."""
    detail: dict = {
        "error": str(exc),
        "type": type(exc).__name__,
    }
    if DEV_MODE:
        detail["traceback"] = traceback.format_exception(type(exc), exc, exc.__traceback__)
        detail["method"] = request.method
        detail["url"] = str(request.url)
        # Extra context for DB errors
        if isinstance(exc, SQLAlchemyError):
            orig = getattr(exc, "orig", None)
            if orig:
                detail["db_error"] = str(orig)
                detail["db_error_type"] = type(orig).__name__
            stmt = getattr(exc, "statement", None)
            if stmt:
                detail["sql"] = str(stmt)
            params = getattr(exc, "params", None)
            if params:
                try:
                    detail["sql_params"] = str(params)
                except Exception:
                    pass
    return detail


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (use Alembic in production)
    async with engine.begin() as conn:
        await conn.execute(text("SELECT 1"))  # verify connection
        await conn.run_sync(Base.metadata.create_all)
        # Auto-migrate: widen color columns for existing databases
        await conn.execute(text("ALTER TABLE projects ALTER COLUMN color TYPE VARCHAR(25)"))
        await conn.execute(text("ALTER TABLE goals ALTER COLUMN color TYPE VARCHAR(25)"))
        # Auto-migrate: add recurrence column to tasks if missing
        await conn.execute(text(
            "ALTER TABLE tasks ADD COLUMN IF NOT EXISTS recurrence VARCHAR(20)"
        ))
        # Auto-migrate: add is_admin column to users if missing
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false"
        ))
        # Auto-migrate: add goal_outcomes column to weekly_surveys if missing
        await conn.execute(text(
            "ALTER TABLE weekly_surveys ADD COLUMN IF NOT EXISTS goal_outcomes JSONB"
        ))
        # Auto-migrate: add deleted_at column to projects for soft delete
        await conn.execute(text(
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ"
        ))
        # Auto-migrate: create operation_timings table if missing
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS operation_timings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                operation_type VARCHAR(100) NOT NULL,
                duration_ms INTEGER NOT NULL,
                created_at TIMESTAMPTZ DEFAULT now()
            )
        """))
        await conn.execute(text(
            "CREATE INDEX IF NOT EXISTS ix_operation_timings_operation_type ON operation_timings (operation_type)"
        ))
    yield


app = FastAPI(title="TodoPilot API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = uuid.uuid4().hex[:8]
    start = time.time()
    response = await call_next(request)
    duration_ms = int((time.time() - start) * 1000)

    if request.url.path != "/api/health":
        log_level = logging.WARNING if response.status_code >= 400 else logging.INFO
        logger.log(
            log_level,
            "%s %s %s",
            request.method,
            request.url.path,
            response.status_code,
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
        )

    response.headers["X-Request-ID"] = request_id
    return response


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    logger.error(
        "DB error: %s %s — %s", request.method, request.url.path, exc,
        extra={"error_type": type(exc).__name__, "path": str(request.url.path)},
    )
    detail = _build_error_detail(request, exc)
    return JSONResponse(status_code=500, content=detail)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(
        "Validation error: %s %s", request.method, request.url.path,
        extra={"error_type": "RequestValidationError", "path": str(request.url.path)},
    )
    detail: dict = {
        "error": "Ошибка валидации запроса",
        "type": "RequestValidationError",
    }
    if DEV_MODE:
        detail["validation_errors"] = exc.errors()
        detail["method"] = request.method
        detail["url"] = str(request.url)
        try:
            detail["body"] = str(exc.body)
        except Exception:
            pass
    return JSONResponse(status_code=422, content=detail)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(
        "Unhandled error: %s %s — %s", request.method, request.url.path, exc,
        extra={"error_type": type(exc).__name__, "path": str(request.url.path)},
        exc_info=True,
    )
    detail = _build_error_detail(request, exc)
    return JSONResponse(status_code=500, content=detail)


app.include_router(auth.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(goals.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(ai_tasks.router, prefix="/api")
app.include_router(survey.router, prefix="/api")
app.include_router(feedback.router, prefix="/api")
app.include_router(logs.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
