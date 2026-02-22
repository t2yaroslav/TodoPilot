from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Project, Task, User
from ..schemas import ProjectCreate, ProjectOut, ProjectUpdate
from .auth import get_current_user

router = APIRouter(prefix="/projects", tags=["projects"])


@router.get("/task-counts")
async def project_task_counts(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Task.project_id, func.count(Task.id))
        .where(Task.user_id == user.id, Task.completed == False, Task.project_id != None)  # noqa: E711, E712
        .group_by(Task.project_id)
    )
    return {str(row[0]): row[1] for row in result.all()}


@router.get("", response_model=list[ProjectOut])
async def list_projects(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Project).where(Project.user_id == user.id).order_by(Project.position, Project.created_at)
    )
    return result.scalars().all()


@router.post("", response_model=ProjectOut, status_code=201)
async def create_project(body: ProjectCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    project = Project(**body.model_dump(), user_id=user.id)
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


@router.patch("/{project_id}", response_model=ProjectOut)
async def update_project(project_id: UUID, body: ProjectUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project or project.user_id != user.id:
        raise HTTPException(status_code=404)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    await db.commit()
    await db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=204)
async def delete_project(project_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    project = await db.get(Project, project_id)
    if not project or project.user_id != user.id:
        raise HTTPException(status_code=404)
    await db.delete(project)
    await db.commit()
