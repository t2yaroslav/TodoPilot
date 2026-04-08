"""Add goal_links and project_goal_links tables for many-to-many entity linking

Revision ID: 008
Revises: 007
Create Date: 2026-04-06
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Goal-to-goal many-to-many links
    op.create_table(
        "goal_links",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_goal_id", UUID(as_uuid=True), sa.ForeignKey("goals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("target_goal_id", UUID(as_uuid=True), sa.ForeignKey("goals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("source_goal_id", "target_goal_id", name="uq_goal_link"),
    )

    # Project-to-goal many-to-many links
    op.create_table(
        "project_goal_links",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("user_id", UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("project_id", UUID(as_uuid=True), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("goal_id", UUID(as_uuid=True), sa.ForeignKey("goals.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("project_id", "goal_id", name="uq_project_goal_link"),
    )

    # Migrate existing Goal.parent_goal_id → goal_links
    op.execute("""
        INSERT INTO goal_links (user_id, source_goal_id, target_goal_id)
        SELECT user_id, id, parent_goal_id
        FROM goals
        WHERE parent_goal_id IS NOT NULL
        ON CONFLICT DO NOTHING
    """)

    # Migrate existing Project.goal_id → project_goal_links
    op.execute("""
        INSERT INTO project_goal_links (user_id, project_id, goal_id)
        SELECT p.user_id, p.id, p.goal_id
        FROM projects p
        WHERE p.goal_id IS NOT NULL
        ON CONFLICT DO NOTHING
    """)

    # Clear old FK columns (keep columns for backward compat, just null them out)
    op.execute("UPDATE goals SET parent_goal_id = NULL WHERE parent_goal_id IS NOT NULL")
    op.execute("UPDATE projects SET goal_id = NULL WHERE goal_id IS NOT NULL")


def downgrade() -> None:
    # Restore Goal.parent_goal_id from goal_links
    op.execute("""
        UPDATE goals g
        SET parent_goal_id = gl.target_goal_id
        FROM goal_links gl
        WHERE gl.source_goal_id = g.id
    """)

    # Restore Project.goal_id from project_goal_links (take first link)
    op.execute("""
        UPDATE projects p
        SET goal_id = pgl.goal_id
        FROM (
            SELECT DISTINCT ON (project_id) project_id, goal_id
            FROM project_goal_links
            ORDER BY project_id, created_at
        ) pgl
        WHERE pgl.project_id = p.id
    """)

    op.drop_table("project_goal_links")
    op.drop_table("goal_links")
