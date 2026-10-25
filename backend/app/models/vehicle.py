from datetime import datetime
from decimal import Decimal
from enum import Enum

from sqlalchemy import CheckConstraint, DateTime, Integer, Numeric, String, Text, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class VehicleCategory(str, Enum):
    sedan = "sedan"
    suv = "suv"
    hatchback = "hatchback"
    coupe = "coupe"
    convertible = "convertible"
    truck = "truck"
    van = "van"
    ev = "ev"


class FuelType(str, Enum):
    petrol = "petrol"
    diesel = "diesel"
    electric = "electric"
    hybrid = "hybrid"
    cng = "cng"


class Drivetrain(str, Enum):
    fwd = "fwd"
    rwd = "rwd"
    awd = "awd"
    four_wd = "4wd"


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[int] = mapped_column(primary_key=True)
    make: Mapped[str] = mapped_column(String(100), nullable=False)
    model: Mapped[str] = mapped_column(String(100), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    category: Mapped[VehicleCategory] = mapped_column(
        SAEnum(VehicleCategory, name="vehicle_category"), nullable=False
    )
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(2048))
    description: Mapped[str | None] = mapped_column(Text)
    fuel_type: Mapped[FuelType | None] = mapped_column(SAEnum(FuelType, name="vehicle_fuel_type"))
    transmission: Mapped[str | None] = mapped_column(String(50))
    engine: Mapped[str | None] = mapped_column(String(100))
    power: Mapped[str | None] = mapped_column(String(50))
    torque: Mapped[str | None] = mapped_column(String(50))
    drivetrain: Mapped[Drivetrain | None] = mapped_column(
        SAEnum(Drivetrain, name="vehicle_drivetrain", values_callable=lambda e: [m.value for m in e])
    )
    seats: Mapped[int | None] = mapped_column(Integer)
    mileage: Mapped[str | None] = mapped_column(String(50))
    color: Mapped[str | None] = mapped_column(String(50))
    location: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    __table_args__ = (
        CheckConstraint("price > 0", name="ck_vehicles_price_positive"),
        CheckConstraint("quantity >= 0", name="ck_vehicles_quantity_nonnegative"),
    )
