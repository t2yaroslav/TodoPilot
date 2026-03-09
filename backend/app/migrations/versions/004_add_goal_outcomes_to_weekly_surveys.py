"""Add goal_outcomes column to weekly_surveys

Revision ID: 004
Revises: 003
Create Date: 2026-03-09
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("weekly_surveys", sa.Column("goal_outcomes", JSONB, nullable=True))


def downgrade() -> None:
    op.drop_column("weekly_surveys", "goal_outcomes")
