"""Add vehicle specs and showroom location.

Revision ID: 20261026_03
Revises: 20261025_02
"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision = "20261026_03"
down_revision = "20261025_02"
branch_labels = None
depends_on = None

fuel_type = postgresql.ENUM(
    "petrol", "diesel", "electric", "hybrid", "cng", name="vehicle_fuel_type", create_type=False
)
drivetrain = postgresql.ENUM(
    "fwd", "rwd", "awd", "4wd", name="vehicle_drivetrain", create_type=False
)

STRING_COLUMNS = (
    ("transmission", 50),
    ("engine", 100),
    ("power", 50),
    ("torque", 50),
    ("mileage", 50),
    ("color", 50),
    ("location", 100),
)


def upgrade() -> None:
    fuel_type.create(op.get_bind(), checkfirst=True)
    drivetrain.create(op.get_bind(), checkfirst=True)
    op.add_column("vehicles", sa.Column("fuel_type", fuel_type, nullable=True))
    op.add_column("vehicles", sa.Column("drivetrain", drivetrain, nullable=True))
    op.add_column("vehicles", sa.Column("seats", sa.Integer(), nullable=True))
    for name, length in STRING_COLUMNS:
        op.add_column("vehicles", sa.Column(name, sa.String(length=length), nullable=True))


def downgrade() -> None:
    for name, _ in reversed(STRING_COLUMNS):
        op.drop_column("vehicles", name)
    op.drop_column("vehicles", "seats")
    op.drop_column("vehicles", "drivetrain")
    op.drop_column("vehicles", "fuel_type")
    drivetrain.drop(op.get_bind(), checkfirst=True)
    fuel_type.drop(op.get_bind(), checkfirst=True)
