"""Seed the vehicles table with a realistic Indian-market inventory.

Run from backend/:  python -m app.scripts.seed_vehicles
Safe to re-run: a car whose (make, model, year) already exists is skipped, except that a
missing (NULL) image_url or spec/location field is backfilled; a non-NULL value is never
overwritten.
"""

import sys
from collections.abc import Sequence
from decimal import Decimal
from typing import Any, NamedTuple

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.models.vehicle import Drivetrain, FuelType, Vehicle, VehicleCategory
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
        "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/"
        "2020_Tata_Nexon_EV_%28India%29_front_view.png/"
        "960px-2020_Tata_Nexon_EV_%28India%29_front_view.png"
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
        "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/"
        "Suzuki_Swift_%282024%29_hybrid_DSC_7921.jpg/"
        "960px-Suzuki_Swift_%282024%29_hybrid_DSC_7921.jpg"
    ),
}

# Showroom specs and stock location, keyed by (make, model).
SPECS: dict[tuple[str, str], dict[str, Any]] = {
    ("Maruti Suzuki", "Swift"): {
        "fuel_type": FuelType.petrol,
        "transmission": "5-speed manual",
        "engine": "1197 cc, 3-cyl Z-series petrol",
        "power": "80 bhp @ 5700 rpm",
        "torque": "112 Nm @ 4300 rpm",
        "drivetrain": Drivetrain.fwd,
        "seats": 5,
        "mileage": "24.8 km/l (ARAI)",
        "color": "Lustre Blue",
        "location": "Andheri West, Mumbai",
    },
    ("Hyundai", "i20"): {
        "fuel_type": FuelType.petrol,
        "transmission": "7-speed DCT",
        "engine": "998 cc, 3-cyl turbo petrol",
        "power": "118 bhp @ 6000 rpm",
        "torque": "172 Nm @ 1500-4000 rpm",
        "drivetrain": Drivetrain.fwd,
        "seats": 5,
        "mileage": "20.0 km/l (ARAI)",
        "color": "Polar White",
        "location": "Banjara Hills, Hyderabad",
    },
    ("Honda", "City"): {
        "fuel_type": FuelType.petrol,
        "transmission": "CVT automatic",
        "engine": "1498 cc, 4-cyl i-VTEC petrol",
        "power": "119 bhp @ 6600 rpm",
        "torque": "145 Nm @ 4300 rpm",
        "drivetrain": Drivetrain.fwd,
        "seats": 5,
        "mileage": "18.4 km/l (ARAI)",
        "color": "Platinum White Pearl",
        "location": "Vasant Kunj, New Delhi",
    },
    ("Skoda", "Slavia"): {
        "fuel_type": FuelType.petrol,
        "transmission": "6-speed automatic",
        "engine": "999 cc, 3-cyl TSI turbo petrol",
        "power": "114 bhp @ 5000 rpm",
        "torque": "178 Nm @ 1750-4500 rpm",
        "drivetrain": Drivetrain.fwd,
        "seats": 5,
        "mileage": "18.1 km/l (ARAI)",
        "color": "Candy White",
        "location": "Koregaon Park, Pune",
    },
    ("Hyundai", "Creta"): {
        "fuel_type": FuelType.diesel,
        "transmission": "6-speed manual",
        "engine": "1493 cc, 4-cyl CRDi diesel",
        "power": "114 bhp @ 4000 rpm",
        "torque": "250 Nm @ 1500-2750 rpm",
        "drivetrain": Drivetrain.fwd,
        "seats": 5,
        "mileage": "21.8 km/l (ARAI)",
        "color": "Atlas White",
        "location": "Koramangala, Bengaluru",
    },
    ("Mahindra", "Scorpio-N"): {
        "fuel_type": FuelType.diesel,
        "transmission": "6-speed manual",
        "engine": "2198 cc, 4-cyl mHawk diesel",
        "power": "172 bhp @ 3500 rpm",
        "torque": "400 Nm @ 1750-2750 rpm",
        "drivetrain": Drivetrain.four_wd,
        "seats": 7,
        "mileage": "15.4 km/l (claimed)",
        "color": "Napoli Black",
        "location": "Adyar, Chennai",
    },
    ("Toyota", "Innova Crysta"): {
        "fuel_type": FuelType.diesel,
        "transmission": "6-speed automatic",
        "engine": "2393 cc, 4-cyl GD diesel",
        "power": "148 bhp @ 3400 rpm",
        "torque": "343 Nm @ 1400-2800 rpm",
        "drivetrain": Drivetrain.rwd,
        "seats": 7,
        "mileage": "15.6 km/l (ARAI)",
        "color": "Super White",
        "location": "Salt Lake, Kolkata",
    },
    ("Kia", "Carens"): {
        "fuel_type": FuelType.petrol,
        "transmission": "6-speed manual",
        "engine": "1497 cc, 4-cyl Smartstream petrol",
        "power": "113 bhp @ 6300 rpm",
        "torque": "144 Nm @ 4500 rpm",
        "drivetrain": Drivetrain.fwd,
        "seats": 7,
        "mileage": "16.5 km/l (ARAI)",
        "color": "Imperial Blue",
        "location": "SG Highway, Ahmedabad",
    },
    ("BMW", "M2"): {
        "fuel_type": FuelType.petrol,
        "transmission": "8-speed M Steptronic",
        "engine": "2993 cc, 6-cyl twin-turbo petrol",
        "power": "473 bhp @ 6250 rpm",
        "torque": "550 Nm @ 2650-5870 rpm",
        "drivetrain": Drivetrain.rwd,
        "seats": 4,
        "mileage": "10.0 km/l (claimed)",
        "color": "Zandvoort Blue",
        "location": "Worli, Mumbai",
    },
    ("MINI", "Cooper S Convertible"): {
        "fuel_type": FuelType.petrol,
        "transmission": "7-speed Steptronic DCT",
        "engine": "1998 cc, 4-cyl turbo petrol",
        "power": "189 bhp @ 5000 rpm",
        "torque": "280 Nm @ 1350-4600 rpm",
        "drivetrain": Drivetrain.fwd,
        "seats": 4,
        "mileage": "14.0 km/l (claimed)",
        "color": "Chili Red",
        "location": "Park Street, Kolkata",
    },
    ("Toyota", "Hilux"): {
        "fuel_type": FuelType.diesel,
        "transmission": "6-speed automatic",
        "engine": "2755 cc, 4-cyl diesel",
        "power": "201 bhp @ 3400 rpm",
        "torque": "500 Nm @ 1600-2800 rpm",
        "drivetrain": Drivetrain.four_wd,
        "seats": 5,
        "mileage": "10.0 km/l (claimed)",
        "color": "Super White",
        "location": "Jubilee Hills, Hyderabad",
    },
    ("Isuzu", "D-Max V-Cross"): {
        "fuel_type": FuelType.diesel,
        "transmission": "6-speed automatic",
        "engine": "2999 cc, 4-cyl turbo diesel",
        "power": "188 bhp @ 3600 rpm",
        "torque": "450 Nm @ 1600-2600 rpm",
        "drivetrain": Drivetrain.four_wd,
        "seats": 5,
        "mileage": "11.5 km/l (claimed)",
        "color": "Obsidian Grey",
        "location": "Baner, Pune",
    },
    ("Tata", "Nexon EV"): {
        "fuel_type": FuelType.electric,
        "transmission": "Single-speed automatic",
        "engine": "40.5 kWh battery, PMSM motor",
        "power": "142 bhp (106 kW)",
        "torque": "215 Nm",
        "drivetrain": Drivetrain.fwd,
        "seats": 5,
        "mileage": "465 km range (ARAI)",
        "color": "Daytona Grey",
        "location": "Indiranagar, Bengaluru",
    },
    ("Tata", "Punch EV"): {
        "fuel_type": FuelType.electric,
        "transmission": "Single-speed automatic",
        "engine": "35 kWh battery, PMSM motor",
        "power": "120 bhp (90 kW)",
        "torque": "190 Nm",
        "drivetrain": Drivetrain.fwd,
        "seats": 5,
        "mileage": "421 km range (MIDC)",
        "color": "Seaweed Green",
        "location": "Dwarka, New Delhi",
    },
    ("MG", "ZS EV"): {
        "fuel_type": FuelType.electric,
        "transmission": "Single-speed automatic",
        "engine": "50.3 kWh battery, PMSM motor",
        "power": "174 bhp (130 kW)",
        "torque": "280 Nm",
        "drivetrain": Drivetrain.fwd,
        "seats": 5,
        "mileage": "461 km range (ARAI)",
        "color": "Pristine White",
        "location": "T. Nagar, Chennai",
    },
}
SPEC_FIELDS = (
    "fuel_type", "transmission", "engine", "power", "torque",
    "drivetrain", "seats", "mileage", "color", "location",
)


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
        **SPECS[(make, model)],
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


def _backfill(current: Vehicle, data: VehicleCreate) -> bool:
    """Fill NULL image/spec fields from the seed data; never overwrite a non-NULL value."""
    changed = False
    for field in ("image_url", *SPEC_FIELDS):
        wanted = getattr(data, field)
        if getattr(current, field) is None and wanted is not None:
            setattr(current, field, wanted)
            changed = True
    return changed


def seed_vehicles(db: Session, vehicles: Sequence[VehicleCreate] = SEED_VEHICLES) -> SeedResult:
    existing = {
        (car.make, car.model, car.year): car for car in db.scalars(select(Vehicle))
    }
    added = skipped = backfilled = 0
    for data in vehicles:
        key = (data.make, data.model, data.year)
        current = existing.get(key)
        if current is not None:
            if _backfill(current, data):
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
