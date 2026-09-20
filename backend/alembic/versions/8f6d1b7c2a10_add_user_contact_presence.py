"""add user contact and presence fields

Revision ID: 8f6d1b7c2a10
Revises: dcb31071edb9
"""
from alembic import op
import sqlalchemy as sa


revision = "8f6d1b7c2a10"
down_revision = "dcb31071edb9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone", sa.String(length=30), nullable=True))
    op.create_index("ix_users_phone", "users", ["phone"], unique=False)
    op.add_column("users", sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "last_seen_at")
    op.drop_index("ix_users_phone", table_name="users")
    op.drop_column("users", "phone")