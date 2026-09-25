"""add product variants and order item variant snapshots

Revision ID: 4c3a8b2f91d7
Revises: 8f6d1b7c2a10
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "4c3a8b2f91d7"
down_revision = "8f6d1b7c2a10"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "product_variants",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("price_override", sa.Numeric(10, 2), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["products.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("product_id", "name", name="uq_product_variant_name"),
    )
    op.create_index("ix_product_variants_product_id", "product_variants", ["product_id"])
    op.add_column("order_items", sa.Column("variant_name", sa.String(length=100), nullable=True))


def downgrade() -> None:
    op.drop_column("order_items", "variant_name")
    op.drop_index("ix_product_variants_product_id", table_name="product_variants")
    op.drop_table("product_variants")