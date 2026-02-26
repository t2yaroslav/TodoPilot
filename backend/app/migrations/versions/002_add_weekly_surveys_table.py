"""Add weekly_surveys table for weekly retrospective feature.

Revision ID: 002_add_weekly_surveys
Revises: 001_extend_recurrence
Create Date: 2026-02-26
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision: str = "002_add_weekly_surveys"
down_revision: Union[str, None] = "001_extend_recurrence"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "weekly_surveys",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("week_start", sa.Date, nullable=False, index=True),
        sa.Column("achievements", JSONB, nullable=True),
        sa.Column("difficulties", JSONB, nullable=True),
        sa.Column("improvements", JSONB, nullable=True),
        sa.Column("weekly_goals", JSONB, nullable=True),
        sa.Column("dismissed", sa.Boolean, default=False, server_default=sa.text("false")),
        sa.Column("completed", sa.Boolean, default=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("weekly_surveys")
