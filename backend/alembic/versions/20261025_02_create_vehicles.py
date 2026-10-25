"""Create vehicle inventory.

Revision ID: 20261025_02
Revises: 20261025_01
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "20261025_02"
down_revision = "20261025_01"
branch_labels = None
depends_on = None

vehicle_category = postgresql.ENUM(
    "sedan", "suv", "hatchback", "coupe", "convertible", "truck", "van", "ev",
    name="vehicle_category",
    create_type=False,
)


def upgrade() -> None:
    vehicle_category.create(op.get_bind(), checkfirst=True)
    op.create_table(
        "vehicles",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("make", sa.String(length=100), nullable=False),
        sa.Column("model", sa.String(length=100), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("category", vehicle_category, nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("image_url", sa.String(length=2048), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.CheckConstraint("price > 0", name="ck_vehicles_price_positive"),
        sa.CheckConstraint("quantity >= 0", name="ck_vehicles_quantity_nonnegative"),
    )


def downgrade() -> None:
    op.drop_table("vehicles")
    vehicle_category.drop(op.get_bind(), checkfirst=True)
