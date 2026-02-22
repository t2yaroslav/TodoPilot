from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models import Goal, User
from ..schemas import GoalCreate, GoalOut, GoalUpdate
from .auth import get_current_user

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("", response_model=list[GoalOut])
async def list_goals(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Goal).where(Goal.user_id == user.id).order_by(Goal.created_at))
    return result.scalars().all()


@router.post("", response_model=GoalOut, status_code=201)
async def create_goal(body: GoalCreate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    goal = Goal(**body.model_dump(), user_id=user.id)
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.patch("/{goal_id}", response_model=GoalOut)
async def update_goal(goal_id: UUID, body: GoalUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    goal = await db.get(Goal, goal_id)
    if not goal or goal.user_id != user.id:
        raise HTTPException(status_code=404)
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(goal_id: UUID, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    goal = await db.get(Goal, goal_id)
    if not goal or goal.user_id != user.id:
        raise HTTPException(status_code=404)
    await db.delete(goal)
    await db.commit()
