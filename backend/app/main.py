import os
import traceback
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from .database import engine
from .models import Base
from .routers import ai, auth, goals, projects, stats, tasks

DEV_MODE = os.getenv("FASTAPI_ENV", "development") != "production"


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


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    detail = {"error": str(exc)}
    if DEV_MODE:
        detail["traceback"] = traceback.format_exception(exc)
        detail["type"] = type(exc).__name__
    return JSONResponse(status_code=500, content=detail)


app.include_router(auth.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(projects.router, prefix="/api")
app.include_router(goals.router, prefix="/api")
app.include_router(stats.router, prefix="/api")
app.include_router(ai.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
