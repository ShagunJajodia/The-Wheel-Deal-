from sqlalchemy.orm import Session

from app.core.errors import (
    CheckoutOutOfStock,
    CheckoutVehicleNotFound,
    OutOfStock,
    VehicleNotFound,
)
from app.models.vehicle import Vehicle
from app.repositories.vehicle import (
    add_vehicle,
    decrement_stock,
    get_vehicle_by_id,
    increment_stock,
    list_vehicles,
    remove_vehicle,
    search_vehicles,
    update_vehicle_data,
    vehicle_exists,
)
from app.schemas.vehicle import (
    CartItem,
    VehicleCreate,
    VehicleSearchParams,
    VehicleUpdate,
)


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


def modify_vehicle(db: Session, vehicle_id: int, data: VehicleUpdate) -> Vehicle:
    vehicle = get_vehicle(db, vehicle_id)
    update_vehicle_data(db, vehicle, data)
    db.commit()
    db.refresh(vehicle)
    return vehicle


def delete_vehicle(db: Session, vehicle_id: int) -> None:
    vehicle = get_vehicle(db, vehicle_id)
    remove_vehicle(db, vehicle)
    db.commit()


def purchase_vehicle(db: Session, vehicle_id: int, quantity: int) -> Vehicle:
    vehicle = decrement_stock(db, vehicle_id, quantity)
    if vehicle is None:
        if not vehicle_exists(db, vehicle_id):
            raise VehicleNotFound
        raise OutOfStock
    db.commit()
    db.refresh(vehicle)
    return vehicle


def restock_vehicle(db: Session, vehicle_id: int, quantity: int) -> Vehicle:
    vehicle = increment_stock(db, vehicle_id, quantity)
    if vehicle is None:
        raise VehicleNotFound
    db.commit()
    db.refresh(vehicle)
    return vehicle


def checkout_cart(db: Session, items: list[CartItem]) -> list[Vehicle]:
    """Buy every item or none: one transaction, rows locked in ascending id order."""
    updated: dict[int, Vehicle] = {}
    for item in sorted(items, key=lambda line: line.vehicle_id):
        vehicle = decrement_stock(db, item.vehicle_id, item.quantity)
        if vehicle is None:
            missing = not vehicle_exists(db, item.vehicle_id)
            current = None if missing else get_vehicle_by_id(db, item.vehicle_id)
            label = f"{current.year} {current.make} {current.model}" if current else ""
            db.rollback()
            if missing:
                raise CheckoutVehicleNotFound(item.vehicle_id)
            raise CheckoutOutOfStock(label)
        updated[item.vehicle_id] = vehicle
    db.commit()
    result = [updated[item.vehicle_id] for item in items]
    for vehicle in result:
        db.refresh(vehicle)
    return result
