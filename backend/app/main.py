import logging
import os
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from .config import settings
from .database import engine
from .models import Base
from .routers import ai, ai_tasks, auth, goals, projects, stats, survey, tasks

DEV_MODE = os.getenv("FASTAPI_ENV", "development") != "production"

# LLM debug logging — activate with LLM_DEBUG=true in .env
if settings.llm_debug:
    _llm_logger = logging.getLogger("todopilot.llm")
    _llm_logger.setLevel(logging.DEBUG)
    _handler = logging.StreamHandler()
    _handler.setFormatter(logging.Formatter("%(asctime)s %(message)s", datefmt="%H:%M:%S"))
    _llm_logger.addHandler(_handler)


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
    yield


app = FastAPI(title="TodoPilot API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(SQLAlchemyError)
async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    detail = _build_error_detail(request, exc)
    return JSONResponse(status_code=500, content=detail)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
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


@app.get("/api/health")
async def health():
    return {"status": "ok"}
