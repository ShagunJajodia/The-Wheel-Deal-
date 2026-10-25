from collections.abc import Iterator
from contextlib import contextmanager
from decimal import Decimal

import bcrypt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.models.user import User, UserRole
from app.models.vehicle import Drivetrain, FuelType, Vehicle, VehicleCategory
from app.schemas.user import UserCreate
from app.schemas.vehicle import VehicleCreate
from app.scripts import create_admin, seed_vehicles


def count_vehicles(db: Session) -> int:
    return db.scalar(select(func.count()).select_from(Vehicle)) or 0


def admin_settings(**overrides: object) -> Settings:
    values: dict[str, object] = {
        "database_url": "postgresql+psycopg://unused/unused",
        "jwt_secret": "unused",
        "admin_email": "boss@example.com",
        "admin_password": "a-very-strong-password",
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)  # type: ignore[arg-type]


@pytest.fixture
def script_session(db_session: Session, monkeypatch: pytest.MonkeyPatch) -> Session:
    @contextmanager
    def fake_session_local() -> Iterator[Session]:
        yield db_session

    monkeypatch.setattr(create_admin, "SessionLocal", fake_session_local)
    monkeypatch.setattr(seed_vehicles, "SessionLocal", fake_session_local)
    return db_session


def test_create_admin_creates_user_with_working_password(db_session: Session) -> None:
    outcome = create_admin.create_or_promote_admin(
        db_session,
        UserCreate(email="Boss@Example.com", full_name="Big Boss", password="a-very-strong-password"),
    )

    assert outcome == "created"
    user = db_session.scalars(select(User).where(User.email == "boss@example.com")).one()
    assert user.role == UserRole.admin
    assert user.full_name == "Big Boss"
    assert bcrypt.checkpw(b"a-very-strong-password", user.password_hash.encode())


def test_create_admin_promotes_existing_user_and_resets_password(
    client: TestClient, db_session: Session, user_token: str
) -> None:
    before = db_session.scalars(select(User).where(User.email == "user@example.com")).one()
    user_id = before.id

    outcome = create_admin.create_or_promote_admin(
        db_session,
        UserCreate(email="USER@example.com", full_name="Ignored", password="brand-new-password"),
    )

    assert outcome == "promoted"
    db_session.expire_all()
    users = db_session.scalars(select(User).where(func.lower(User.email) == "user@example.com")).all()
    assert len(users) == 1
    assert users[0].id == user_id
    assert users[0].role == UserRole.admin
    assert users[0].full_name == "Regular User"
    login = client.post(
        "/api/auth/login", json={"email": "user@example.com", "password": "brand-new-password"}
    )
    assert login.status_code == 200
    old_login = client.post(
        "/api/auth/login", json={"email": "user@example.com", "password": "user-password"}
    )
    assert old_login.status_code == 401


def test_create_admin_is_idempotent(db_session: Session) -> None:
    admin = UserCreate(email="boss@example.com", full_name="Boss", password="a-very-strong-password")

    assert create_admin.create_or_promote_admin(db_session, admin) == "created"
    assert create_admin.create_or_promote_admin(db_session, admin) == "promoted"

    assert db_session.scalar(select(func.count()).select_from(User)) == 1


def test_create_admin_main_reports_result_without_password(
    script_session: Session, capsys: pytest.CaptureFixture[str]
) -> None:
    exit_code = create_admin.main(admin_settings())

    assert exit_code == 0
    output = capsys.readouterr()
    assert output.out.strip() == "Admin created: boss@example.com"
    assert "a-very-strong-password" not in output.out + output.err


@pytest.mark.parametrize(
    "overrides",
    [
        {"admin_email": None},
        {"admin_password": None},
        {"admin_email": None, "admin_password": None},
    ],
)
def test_create_admin_main_fails_when_variables_missing(
    capsys: pytest.CaptureFixture[str], overrides: dict[str, object]
) -> None:
    exit_code = create_admin.main(admin_settings(**overrides))

    assert exit_code == 1
    assert "ADMIN_EMAIL and ADMIN_PASSWORD" in capsys.readouterr().err


def test_create_admin_main_rejects_invalid_values_without_echoing_password(
    capsys: pytest.CaptureFixture[str],
) -> None:
    exit_code = create_admin.main(admin_settings(admin_email="not-an-email"))

    assert exit_code == 1
    output = capsys.readouterr()
    assert "email" in output.err
    assert "a-very-strong-password" not in output.err


def test_create_admin_main_rejects_placeholder_password(
    capsys: pytest.CaptureFixture[str],
) -> None:
    exit_code = create_admin.main(admin_settings(admin_password="CHANGE_ME_ADMIN_PASSWORD"))

    assert exit_code == 1
    assert "placeholder" in capsys.readouterr().err


def test_seed_vehicles_adds_realistic_inventory(db_session: Session) -> None:
    result = seed_vehicles.seed_vehicles(db_session)

    cars = db_session.scalars(select(Vehicle)).all()
    assert result.added == len(cars) == len(seed_vehicles.SEED_VEHICLES)
    assert result.skipped == 0
    assert 14 <= len(cars) <= 16
    assert {car.category for car in cars} == set(VehicleCategory)
    assert sum(1 for car in cars if car.quantity == 0) == 2
    assert all(isinstance(car.price, Decimal) and car.price > 0 for car in cars)


def test_seed_vehicles_is_idempotent(db_session: Session) -> None:
    first = seed_vehicles.seed_vehicles(db_session)
    second = seed_vehicles.seed_vehicles(db_session)

    assert second.added == 0
    assert second.skipped == first.added
    assert count_vehicles(db_session) == first.added


def test_seed_vehicles_skips_cars_that_already_exist(db_session: Session) -> None:
    template = seed_vehicles.SEED_VEHICLES[0]
    db_session.add(Vehicle(**template.model_dump()))
    db_session.commit()

    result = seed_vehicles.seed_vehicles(db_session)

    assert result.skipped == 1
    assert result.added == len(seed_vehicles.SEED_VEHICLES) - 1
    assert count_vehicles(db_session) == len(seed_vehicles.SEED_VEHICLES)


def test_seed_vehicles_gives_every_car_a_photo(db_session: Session) -> None:
    seed_vehicles.seed_vehicles(db_session)

    urls = db_session.scalars(select(Vehicle.image_url)).all()
    assert all(url and url.startswith("https://") for url in urls)


@pytest.mark.parametrize("url", sorted(seed_vehicles.IMAGE_URLS.values()))
def test_seed_photo_urls_are_well_formed_wikimedia_thumbnails(url: str) -> None:
    # .../commons/thumb/<a>/<ab>/<File>/960px-<File>: the file folder must be present.
    prefix = "https://upload.wikimedia.org/wikipedia/commons/thumb/"
    assert url.startswith(prefix)
    parts = url.removeprefix(prefix).split("/")
    assert len(parts) == 4
    hash_dir, hash_subdir, file_name, thumb_name = parts
    assert hash_subdir.startswith(hash_dir)
    assert thumb_name == f"960px-{file_name}"


def test_seed_vehicles_backfills_null_image_but_keeps_custom_image(db_session: Session) -> None:
    null_image, custom_image = seed_vehicles.SEED_VEHICLES[0], seed_vehicles.SEED_VEHICLES[1]
    db_session.add(Vehicle(**{**null_image.model_dump(), "image_url": None}))
    db_session.add(Vehicle(**{**custom_image.model_dump(), "image_url": "https://example.com/mine.jpg"}))
    db_session.commit()

    result = seed_vehicles.seed_vehicles(db_session)

    assert (result.added, result.backfilled, result.skipped) == (
        len(seed_vehicles.SEED_VEHICLES) - 2,
        1,
        1,
    )
    db_session.expire_all()
    filled = db_session.scalars(select(Vehicle).where(Vehicle.model == null_image.model)).one()
    kept = db_session.scalars(select(Vehicle).where(Vehicle.model == custom_image.model)).one()
    assert filled.image_url == null_image.image_url
    assert kept.image_url == "https://example.com/mine.jpg"


def test_seed_vehicles_gives_every_car_complete_specs_and_a_location(db_session: Session) -> None:
    seed_vehicles.seed_vehicles(db_session)

    cars = db_session.scalars(select(Vehicle)).all()
    for car in cars:
        for field in seed_vehicles.SPEC_FIELDS:
            assert getattr(car, field) is not None, (car.model, field)
        assert car.location and "," in car.location
        assert car.seats is not None and 1 <= car.seats <= 12
    cities = {car.location.rsplit(",", 1)[1].strip() for car in cars if car.location}
    assert 6 <= len(cities) <= 8


def test_seed_specs_are_consistent_with_each_car(db_session: Session) -> None:
    seed_vehicles.seed_vehicles(db_session)

    by_model = {car.model: car for car in db_session.scalars(select(Vehicle))}
    for car in by_model.values():
        assert (car.fuel_type == FuelType.electric) == (car.category == VehicleCategory.ev)
        if car.fuel_type == FuelType.electric:
            assert "kWh" in (car.engine or "")
            assert "range" in (car.mileage or "")
    assert by_model["M2"].drivetrain == Drivetrain.rwd
    assert by_model["Hilux"].drivetrain == Drivetrain.four_wd
    assert by_model["Nexon EV"].transmission == "Single-speed automatic"


def test_seed_specs_cover_exactly_the_seed_cars() -> None:
    assert set(seed_vehicles.SPECS) == {(car.make, car.model) for car in seed_vehicles.SEED_VEHICLES}


def test_seed_vehicles_backfills_null_specs_but_never_overwrites_values(
    db_session: Session,
) -> None:
    template = seed_vehicles.SEED_VEHICLES[0]
    db_session.add(
        Vehicle(
            **{
                **template.model_dump(),
                "location": None,
                "engine": None,
                "color": "Custom Pink",
                "seats": 4,
            }
        )
    )
    db_session.commit()

    result = seed_vehicles.seed_vehicles(db_session)

    assert (result.backfilled, result.skipped) == (1, 0)
    db_session.expire_all()
    car = db_session.scalars(select(Vehicle).where(Vehicle.model == template.model)).one()
    assert car.location == template.location
    assert car.engine == template.engine
    assert car.color == "Custom Pink"
    assert car.seats == 4


def test_seed_vehicles_ignores_duplicates_within_the_input(db_session: Session) -> None:
    car = VehicleCreate(
        make="Tata", model="Harrier", year=2024, category=VehicleCategory.suv,
        price=Decimal("1599000.00"), quantity=2,
    )

    result = seed_vehicles.seed_vehicles(db_session, [car, car])

    assert (result.added, result.skipped) == (1, 1)


def test_seed_vehicles_main_prints_counts(
    script_session: Session, capsys: pytest.CaptureFixture[str]
) -> None:
    assert seed_vehicles.main() == 0
    assert capsys.readouterr().out.strip() == (
        f"Seeded vehicles: {len(seed_vehicles.SEED_VEHICLES)} added, 0 backfilled, 0 skipped"
    )

    assert seed_vehicles.main() == 0
    assert capsys.readouterr().out.strip() == (
        f"Seeded vehicles: 0 added, 0 backfilled, {len(seed_vehicles.SEED_VEHICLES)} skipped"
    )
