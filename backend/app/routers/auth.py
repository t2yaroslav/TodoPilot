import random
import string
from datetime import datetime, timedelta, timezone

import aiosmtplib
from email.message import EmailMessage
from fastapi import APIRouter, Depends, HTTPException
from jose import jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..models import AuthCode, User
from ..schemas import AuthRequest, AuthVerify, TokenResponse, UserOut, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


def create_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    return jwt.encode({"sub": user_id, "exp": expire}, settings.jwt_secret, algorithm=settings.jwt_algorithm)


async def get_current_user(
    db: AsyncSession = Depends(get_db),
    token: str = Depends(__import__("fastapi.security", fromlist=["HTTPBearer"]).HTTPBearer()),
) -> User:
    try:
        payload = jwt.decode(token.credentials, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
        user_id = payload.get("sub")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.post("/send-code")
async def send_code(body: AuthRequest, db: AsyncSession = Depends(get_db)):
    code = "".join(random.choices(string.digits, k=6))
    expires = datetime.now(timezone.utc) + timedelta(minutes=10)
    db.add(AuthCode(email=body.email, code=code, expires_at=expires))
    await db.commit()

    if settings.smtp_user:
        msg = EmailMessage()
        msg["From"] = settings.smtp_from
        msg["To"] = body.email
        msg["Subject"] = "TodoPilot — код входа"
        msg.set_content(f"Ваш код входа: {code}\n\nКод действителен 10 минут.")
        try:
            await aiosmtplib.send(
                msg,
                hostname=settings.smtp_host,
                port=settings.smtp_port,
                username=settings.smtp_user,
                password=settings.smtp_password,
                start_tls=True,
            )
        except Exception:
            pass  # In dev mode, code is returned below

    # In dev mode return code (remove in production)
    return {"message": "Code sent", "dev_code": code}


@router.post("/verify", response_model=TokenResponse)
async def verify_code(body: AuthVerify, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AuthCode)
        .where(AuthCode.email == body.email, AuthCode.code == body.code, AuthCode.used == False)
        .order_by(AuthCode.expires_at.desc())
        .limit(1)
    )
    auth_code = result.scalar_one_or_none()
    if not auth_code or auth_code.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Invalid or expired code")

    auth_code.used = True

    # Find or create user
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user:
        user = User(email=body.email)
        db.add(user)

    await db.commit()
    await db.refresh(user)
    return TokenResponse(access_token=create_token(str(user.id)))


@router.get("/me", response_model=UserOut)
async def get_me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserOut)
async def update_me(body: UserUpdate, user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user
