import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy import select, desc
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..database import get_db
from ..models import Feedback, User
from ..schemas import FeedbackOut, FeedbackAdminOut, FeedbackAdminUpdate
from .auth import get_current_user

router = APIRouter(prefix="/feedback", tags=["feedback"])

UPLOAD_DIR = Path(settings.upload_dir) / "feedback"


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.post("", response_model=FeedbackOut)
async def create_feedback(
    category: str = Form(...),
    message: str = Form(...),
    screenshot: UploadFile | None = File(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    screenshot_path = None
    if screenshot and screenshot.filename:
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        ext = Path(screenshot.filename).suffix.lower()
        if ext not in (".png", ".jpg", ".jpeg", ".gif", ".webp"):
            raise HTTPException(status_code=400, detail="Unsupported image format")
        filename = f"{uuid.uuid4()}{ext}"
        filepath = UPLOAD_DIR / filename
        content = await screenshot.read()
        if len(content) > 10 * 1024 * 1024:  # 10 MB limit
            raise HTTPException(status_code=400, detail="File too large (max 10 MB)")
        filepath.write_bytes(content)
        screenshot_path = f"feedback/{filename}"

    fb = Feedback(
        user_id=user.id,
        category=category,
        message=message,
        screenshot_path=screenshot_path,
    )
    db.add(fb)
    await db.commit()
    await db.refresh(fb)
    return fb


@router.get("", response_model=list[FeedbackOut])
async def list_my_feedback(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Feedback)
        .where(Feedback.user_id == user.id)
        .order_by(desc(Feedback.created_at))
    )
    return result.scalars().all()


@router.get("/uploads/{filename:path}")
async def serve_upload(filename: str, _user: User = Depends(get_current_user)):
    filepath = Path(settings.upload_dir) / filename
    if not filepath.is_file():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(filepath)


# --- Admin endpoints ---

@router.get("/admin", response_model=list[FeedbackAdminOut])
async def admin_list_feedback(
    status: str | None = None,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    query = select(Feedback, User.email, User.name).join(User, Feedback.user_id == User.id)
    if status:
        query = query.where(Feedback.status == status)
    query = query.order_by(desc(Feedback.created_at))
    result = await db.execute(query)
    rows = result.all()
    items = []
    for fb, email, name in rows:
        out = FeedbackAdminOut.model_validate(fb)
        out.user_email = email
        out.user_name = name
        items.append(out)
    return items


@router.patch("/admin/{feedback_id}", response_model=FeedbackAdminOut)
async def admin_update_feedback(
    feedback_id: str,
    body: FeedbackAdminUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    fb = await db.get(Feedback, feedback_id)
    if not fb:
        raise HTTPException(status_code=404, detail="Feedback not found")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(fb, field, value)
    await db.commit()
    await db.refresh(fb)
    user = await db.get(User, fb.user_id)
    out = FeedbackAdminOut.model_validate(fb)
    out.user_email = user.email if user else ""
    out.user_name = user.name if user else None
    return out
