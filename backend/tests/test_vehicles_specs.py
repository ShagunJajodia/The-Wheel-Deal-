import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle
from tests.test_vehicles_crud import create_vehicle, vehicle_payload

SPEC_FIELDS = [
    "fuel_type", "transmission", "engine", "power", "torque",
    "drivetrain", "seats", "mileage", "color", "location",
]

SPECS: dict[str, object] = {
    "fuel_type": "petrol",
    "transmission": "6-speed manual",
    "engine": "1197 cc, 4-cyl petrol",
    "power": "88 bhp @ 6000 rpm",
    "torque": "113 Nm @ 4400 rpm",
    "drivetrain": "fwd",
    "seats": 5,
    "mileage": "24.8 km/l (ARAI)",
    "color": "Pearl White",
    "location": "Andheri West, Mumbai",
}


def auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_create_with_all_specs_returns_them_and_persists(
    client: TestClient, admin_token: str, db_session: Session
) -> None:
    body = create_vehicle(client, admin_token, **SPECS)

    for field, value in SPECS.items():
        assert body[field] == value
    db_session.expire_all()
    row = db_session.get(Vehicle, body["id"])
    assert row is not None
    assert row.fuel_type is not None and row.fuel_type.value == "petrol"
    assert row.drivetrain is not None and row.drivetrain.value == "fwd"
    assert row.seats == 5
    assert row.location == "Andheri West, Mumbai"


def test_create_without_specs_returns_nulls(client: TestClient, admin_token: str) -> None:
    body = create_vehicle(client, admin_token)

    for field in SPEC_FIELDS:
        assert body[field] is None


def test_stock_id_is_zero_padded_from_the_id(client: TestClient, admin_token: str) -> None:
    body = create_vehicle(client, admin_token)

    assert body["stock_id"] == f"WD-{body['id']:05d}"
    assert len(body["stock_id"]) >= len("WD-00000")


def test_get_list_and_detail_include_specs_and_stock_id(
    client: TestClient, admin_token: str
) -> None:
    created = create_vehicle(client, admin_token, **SPECS)

    detail = client.get(f"/api/vehicles/{created['id']}").json()
    listing = next(v for v in client.get("/api/vehicles").json() if v["id"] == created["id"])

    for body in (detail, listing):
        assert body["stock_id"] == f"WD-{created['id']:05d}"
        for field, value in SPECS.items():
            assert body[field] == value


def test_put_sets_specs_and_leaves_others_untouched(
    client: TestClient, admin_token: str, db_session: Session
) -> None:
    created = create_vehicle(client, admin_token)

    response = client.put(
        f"/api/vehicles/{created['id']}",
        headers=auth(admin_token),
        json={"fuel_type": "diesel", "seats": 7, "location": "Koramangala, Bengaluru"},
    )

    assert response.status_code == 200
    body = response.json()
    assert (body["fuel_type"], body["seats"], body["location"]) == (
        "diesel", 7, "Koramangala, Bengaluru",
    )
    assert body["transmission"] is None
    assert body["stock_id"] == created["stock_id"]
    db_session.expire_all()
    row = db_session.get(Vehicle, created["id"])
    assert row is not None and row.seats == 7 and row.fuel_type.value == "diesel"


@pytest.mark.parametrize("field", SPEC_FIELDS)
def test_put_can_clear_each_spec_with_null(
    client: TestClient, admin_token: str, db_session: Session, field: str
) -> None:
    created = create_vehicle(client, admin_token, **SPECS)

    response = client.put(
        f"/api/vehicles/{created['id']}", headers=auth(admin_token), json={field: None}
    )

    assert response.status_code == 200
    assert response.json()[field] is None
    for other in SPEC_FIELDS:
        if other != field:
            assert response.json()[other] == SPECS[other]
    db_session.expire_all()
    row = db_session.get(Vehicle, created["id"])
    assert row is not None and getattr(row, field) is None


INVALID_VALUES = [
    ("fuel_type", "steam"),
    ("fuel_type", ""),
    ("drivetrain", "6wd"),
    ("drivetrain", ""),
    ("seats", 0),
    ("seats", 13),
    ("seats", "five"),
    ("transmission", ""),
    ("transmission", "x" * 51),
    ("engine", ""),
    ("engine", "x" * 101),
    ("power", ""),
    ("power", "x" * 51),
    ("torque", ""),
    ("torque", "x" * 51),
    ("mileage", ""),
    ("mileage", "x" * 51),
    ("color", ""),
    ("color", "x" * 51),
    ("location", ""),
    ("location", "x" * 101),
]


@pytest.mark.parametrize(("field", "value"), INVALID_VALUES)
def test_create_rejects_invalid_spec_values(
    client: TestClient, admin_token: str, field: str, value: object
) -> None:
    response = client.post(
        "/api/vehicles", headers=auth(admin_token), json=vehicle_payload(**{field: value})
    )

    assert response.status_code == 422


@pytest.mark.parametrize(("field", "value"), INVALID_VALUES)
def test_put_rejects_invalid_spec_values(
    client: TestClient, admin_token: str, field: str, value: object
) -> None:
    created = create_vehicle(client, admin_token, **SPECS)

    response = client.put(
        f"/api/vehicles/{created['id']}", headers=auth(admin_token), json={field: value}
    )

    assert response.status_code == 422
    assert client.get(f"/api/vehicles/{created['id']}").json()[field] == SPECS[field]


@pytest.mark.parametrize("value", [1, 12])
def test_seats_boundaries_are_accepted(
    client: TestClient, admin_token: str, value: int
) -> None:
    assert create_vehicle(client, admin_token, seats=value)["seats"] == value


@pytest.mark.parametrize("extra", [{"stock_id": "WD-99999"}, {"quantity": 3}])
def test_put_rejects_stock_id_and_quantity(
    client: TestClient, admin_token: str, extra: dict[str, object]
) -> None:
    created = create_vehicle(client, admin_token, quantity=2)

    response = client.put(
        f"/api/vehicles/{created['id']}", headers=auth(admin_token), json={"color": "Red", **extra}
    )

    assert response.status_code == 422
    after = client.get(f"/api/vehicles/{created['id']}").json()
    assert after["stock_id"] == created["stock_id"]
    assert after["quantity"] == 2
    assert after["color"] is None


def test_create_ignores_client_supplied_stock_id(client: TestClient, admin_token: str) -> None:
    body = create_vehicle(client, admin_token, stock_id="WD-99999")

    assert body["stock_id"] == f"WD-{body['id']:05d}"
