"""Seed the vehicles table with a realistic Indian-market inventory.

Run from backend/:  python -m app.scripts.seed_vehicles
Safe to re-run: a car whose (make, model, year) already exists is skipped, except that a
missing (NULL) image_url is backfilled; an existing image_url is never overwritten.
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

# Wikimedia Commons photos, keyed by (make, model).
IMAGE_URLS: dict[tuple[str, str], str] = {
    ("MG", "ZS EV"): (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/"
        "MG_ZS_EV_Facelift_1X7A5867.jpg/"
        "960px-MG_ZS_EV_Facelift_1X7A5867.jpg"
    ),
    ("Tata", "Punch EV"): (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/"
        "Tata_punch.ev.jpg/"
        "960px-Tata_punch.ev.jpg"
    ),
    ("Tata", "Nexon EV"): (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/0/04/"
        "Tata_Nexon_EV_in_Hyderabad_01.jpg/"
        "960px-Tata_Nexon_EV_in_Hyderabad_01.jpg"
    ),
    ("Isuzu", "D-Max V-Cross"): (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6e/"
        "2023_Isuzu_D-Max_V-Cross_4-Door_3.0_Ddi_M.jpg/"
        "960px-2023_Isuzu_D-Max_V-Cross_4-Door_3.0_Ddi_M.jpg"
    ),
    ("Toyota", "Hilux"): (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/"
        "Toyota_HiLux_GR_Sport_1X7A7281.jpg/"
        "960px-Toyota_HiLux_GR_Sport_1X7A7281.jpg"
    ),
    ("MINI", "Cooper S Convertible"): (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a2/"
        "Mini_Cabrio_%28F67%29_JCW-Trim_DSC_7514.jpg/"
        "960px-Mini_Cabrio_%28F67%29_JCW-Trim_DSC_7514.jpg"
    ),
    ("BMW", "M2"): (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/"
        "BMW_G87_M2_1X7A1837.jpg/"
        "960px-BMW_G87_M2_1X7A1837.jpg"
    ),
    ("Kia", "Carens"): (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/"
        "Kia_Carens_2024_Model.jpg/"
        "960px-Kia_Carens_2024_Model.jpg"
    ),
    ("Toyota", "Innova Crysta"): (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/"
        "Toyota_Innova_Crysta_2.4_Z_front_right.jpg/"
        "960px-Toyota_Innova_Crysta_2.4_Z_front_right.jpg"
    ),
    ("Mahindra", "Scorpio-N"): (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/b/b4/"
        "2024_Mahindra_Scorpio_Z8L_front.jpg/"
        "960px-2024_Mahindra_Scorpio_Z8L_front.jpg"
    ),
    ("Hyundai", "Creta"): (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a0/"
        "2024_Hyundai_Creta_Alpha.jpg/"
        "960px-2024_Hyundai_Creta_Alpha.jpg"
    ),
    ("Skoda", "Slavia"): (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/"
        "2021_%C5%A0koda_Slavia_1.5_TSI_Style_%28India%29_front_view.png/"
        "960px-2021_%C5%A0koda_Slavia_1.5_TSI_Style_%28India%29_front_view.png"
    ),
    ("Honda", "City"): (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/"
        "2023_Honda_City_RS.jpg/"
        "960px-2023_Honda_City_RS.jpg"
    ),
    ("Hyundai", "i20"): (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/1/13/"
        "Hyundai_i20_%28BC3%29_Facelift_1X7A1941.jpg/"
        "960px-Hyundai_i20_%28BC3%29_Facelift_1X7A1941.jpg"
    ),
    ("Maruti Suzuki", "Swift"): (
        "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e7/"
        "2024_Suzuki_Swift.jpg/"
        "960px-2024_Suzuki_Swift.jpg"
    ),
}


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
        image_url=IMAGE_URLS[(make, model)],
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
    backfilled: int = 0


def seed_vehicles(db: Session, vehicles: Sequence[VehicleCreate] = SEED_VEHICLES) -> SeedResult:
    existing = {
        (car.make, car.model, car.year): car for car in db.scalars(select(Vehicle))
    }
    added = skipped = backfilled = 0
    for data in vehicles:
        key = (data.make, data.model, data.year)
        current = existing.get(key)
        if current is not None:
            if current.image_url is None and data.image_url is not None:
                current.image_url = data.image_url
                backfilled += 1
            else:
                skipped += 1
            continue
        vehicle = add_vehicle(db, data)
        existing[key] = vehicle
        added += 1
    db.commit()
    return SeedResult(added=added, skipped=skipped, backfilled=backfilled)


def main() -> int:
    with SessionLocal() as db:
        result = seed_vehicles(db)
    print(
        f"Seeded vehicles: {result.added} added, {result.backfilled} backfilled, "
        f"{result.skipped} skipped"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
