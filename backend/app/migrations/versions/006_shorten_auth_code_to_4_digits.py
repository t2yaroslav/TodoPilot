"""Shorten auth_codes.code column from 6 to 4 characters

Revision ID: 006
Revises: 005
Create Date: 2026-03-26
"""
from alembic import op
import sqlalchemy as sa

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column("auth_codes", "code", type_=sa.String(4), existing_type=sa.String(6), existing_nullable=False)


def downgrade():
    op.alter_column("auth_codes", "code", type_=sa.String(6), existing_type=sa.String(4), existing_nullable=False)
