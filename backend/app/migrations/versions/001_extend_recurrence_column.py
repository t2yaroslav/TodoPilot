"""Extend recurrence column from String(20) to String(50) for complex patterns.

Revision ID: 001_extend_recurrence
Revises:
Create Date: 2026-02-24
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001_extend_recurrence"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "tasks",
        "recurrence",
        existing_type=sa.String(20),
        type_=sa.String(50),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "tasks",
        "recurrence",
        existing_type=sa.String(50),
        type_=sa.String(20),
        existing_nullable=True,
    )
