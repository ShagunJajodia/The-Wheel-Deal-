from sqlalchemy.orm import Session

from app.core.errors import VehicleNotFound
from app.models.vehicle import Vehicle
from app.repositories.vehicle import (
    add_vehicle,
    get_vehicle_by_id,
    list_vehicles,
    search_vehicles,
)
from app.schemas.vehicle import VehicleCreate, VehicleSearchParams


def create_vehicle(db: Session, data: VehicleCreate) -> Vehicle:
    vehicle = add_vehicle(db, data)
    db.commit()
    db.refresh(vehicle)
    return vehicle


def get_vehicle(db: Session, vehicle_id: int) -> Vehicle:
    vehicle = get_vehicle_by_id(db, vehicle_id)
    if vehicle is None:
        raise VehicleNotFound
    return vehicle


def get_vehicles(db: Session) -> list[Vehicle]:
    return list_vehicles(db)


def find_vehicles(db: Session, params: VehicleSearchParams) -> list[Vehicle]:
    return search_vehicles(
        db,
        make=params.make,
        model=params.model,
        category=params.category,
        min_price=params.min_price,
        max_price=params.max_price,
    )
