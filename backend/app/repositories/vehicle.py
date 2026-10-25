from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle, VehicleCategory
from app.schemas.vehicle import VehicleCreate, VehicleUpdate


def add_vehicle(db: Session, data: VehicleCreate) -> Vehicle:
    vehicle = Vehicle(**data.model_dump())
    db.add(vehicle)
    return vehicle


def list_vehicles(db: Session) -> list[Vehicle]:
    return list(db.scalars(select(Vehicle).order_by(Vehicle.created_at.desc(), Vehicle.id.desc())))


def search_vehicles(
    db: Session,
    make: str | None = None,
    model: str | None = None,
    category: VehicleCategory | None = None,
    min_price: Decimal | None = None,
    max_price: Decimal | None = None,
) -> list[Vehicle]:
    stmt = select(Vehicle)
    if make:
        stmt = stmt.where(Vehicle.make.ilike(f"%{make}%"))
    if model:
        stmt = stmt.where(Vehicle.model.ilike(f"%{model}%"))
    if category is not None:
        stmt = stmt.where(Vehicle.category == category)
    if min_price is not None:
        stmt = stmt.where(Vehicle.price >= min_price)
    if max_price is not None:
        stmt = stmt.where(Vehicle.price <= max_price)
    stmt = stmt.order_by(Vehicle.created_at.desc(), Vehicle.id.desc())
    return list(db.scalars(stmt))


def get_vehicle_by_id(db: Session, vehicle_id: int) -> Vehicle | None:
    return db.get(Vehicle, vehicle_id)


def update_vehicle_data(_db: Session, vehicle: Vehicle, data: VehicleUpdate) -> Vehicle:
    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(vehicle, key, value)
    return vehicle


def remove_vehicle(db: Session, vehicle: Vehicle) -> None:
    db.delete(vehicle)
