"""Seed the vehicles table with a realistic Indian-market inventory.

Run from backend/:  python -m app.scripts.seed_vehicles
Safe to re-run: a car whose (make, model, year) already exists is skipped.
"""

import sys
from collections.abc import Sequence
from decimal import Decimal
from typing import NamedTuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.vehicle import Vehicle, VehicleCategory
from app.repositories.vehicle import add_vehicle
from app.schemas.vehicle import VehicleCreate


def _car(
    make: str,
    model: str,
    year: int,
    category: VehicleCategory,
    price: str,
    quantity: int,
    description: str,
) -> VehicleCreate:
    return VehicleCreate(
        make=make,
        model=model,
        year=year,
        category=category,
        price=Decimal(price),
        quantity=quantity,
        image_url=None,
        description=description,
    )


SEED_VEHICLES: tuple[VehicleCreate, ...] = (
    _car("Maruti Suzuki", "Swift", 2024, VehicleCategory.hatchback, "649000.00", 14,
         "Fuel-efficient city hatchback with the new Z-series petrol engine."),
    _car("Hyundai", "i20", 2024, VehicleCategory.hatchback, "749000.00", 9,
         "Premium hatchback with a sunroof option and a feature-rich cabin."),
    _car("Honda", "City", 2024, VehicleCategory.sedan, "1209000.00", 7,
         "Refined mid-size sedan known for its roomy rear seat and smooth engine."),
    _car("Skoda", "Slavia", 2024, VehicleCategory.sedan, "1169000.00", 5,
         "European-feel sedan with a punchy 1.0 TSI turbo-petrol engine."),
    _car("Hyundai", "Creta", 2024, VehicleCategory.suv, "1099000.00", 11,
         "India's favourite compact SUV with petrol and diesel options."),
    _car("Mahindra", "Scorpio-N", 2024, VehicleCategory.suv, "1360000.00", 6,
         "Rugged body-on-frame SUV with 4x4 availability and a commanding stance."),
    _car("Toyota", "Innova Crysta", 2024, VehicleCategory.van, "1999000.00", 4,
         "Seven-seat family MPV built for comfort and long highway drives."),
    _car("Kia", "Carens", 2024, VehicleCategory.van, "1099000.00", 0,
         "Three-row family MPV with flexible seating. Currently sold out."),
    _car("BMW", "M2", 2024, VehicleCategory.coupe, "10300000.00", 1,
         "Rear-wheel-drive performance coupe with a 3.0-litre turbo six."),
    _car("MINI", "Cooper S Convertible", 2024, VehicleCategory.convertible, "5400000.00", 2,
         "Open-top fun with go-kart handling and a turbocharged engine."),
    _car("Toyota", "Hilux", 2024, VehicleCategory.truck, "3390000.00", 3,
         "Tough 4x4 pickup with a 2.8-litre diesel and serious off-road ability."),
    _car("Isuzu", "D-Max V-Cross", 2024, VehicleCategory.truck, "2590000.00", 0,
         "Lifestyle pickup with a durable diesel engine. Currently sold out."),
    _car("Tata", "Nexon EV", 2024, VehicleCategory.ev, "1499000.00", 8,
         "Popular electric compact SUV with a claimed range of about 450 km."),
    _car("Tata", "Punch EV", 2024, VehicleCategory.ev, "1099000.00", 10,
         "Small electric SUV with fast-charging support and a practical boot."),
    _car("MG", "ZS EV", 2024, VehicleCategory.ev, "1899000.00", 3,
         "Spacious electric SUV with a large battery and connected-car features."),
)


class SeedResult(NamedTuple):
    added: int
    skipped: int


def seed_vehicles(db: Session, vehicles: Sequence[VehicleCreate] = SEED_VEHICLES) -> SeedResult:
    existing = {
        (make, model, year)
        for make, model, year in db.execute(select(Vehicle.make, Vehicle.model, Vehicle.year))
    }
    added = skipped = 0
    for data in vehicles:
        key = (data.make, data.model, data.year)
        if key in existing:
            skipped += 1
            continue
        add_vehicle(db, data)
        existing.add(key)
        added += 1
    db.commit()
    return SeedResult(added=added, skipped=skipped)


def main() -> int:
    with SessionLocal() as db:
        result = seed_vehicles(db)
    print(f"Seeded vehicles: {result.added} added, {result.skipped} skipped")
    return 0


if __name__ == "__main__":
    sys.exit(main())
