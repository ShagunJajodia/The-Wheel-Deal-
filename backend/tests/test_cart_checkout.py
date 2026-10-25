import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle
from tests.test_vehicles_crud import create_vehicle

CHECKOUT = "/api/cart/checkout"


def stored_quantity(db_session: Session, vehicle_id: int) -> int:
    # Select the column (not the entity) so a stale identity-map object cannot hide the DB value.
    return db_session.execute(select(Vehicle.quantity).where(Vehicle.id == vehicle_id)).scalar_one()


def line(vehicle_id: int, quantity: int) -> dict[str, int]:
    return {"vehicle_id": vehicle_id, "quantity": quantity}


def test_checkout_decrements_every_vehicle_and_returns_them_in_request_order(
    client: TestClient, admin_token: str, auth_headers: dict[str, str], db_session: Session
) -> None:
    first = create_vehicle(client, admin_token, quantity=5)
    second = create_vehicle(client, admin_token, quantity=4)

    response = client.post(
        CHECKOUT,
        headers=auth_headers,
        json={"items": [line(second["id"], 3), line(first["id"], 2)]},
    )

    assert response.status_code == 200
    items = response.json()["items"]
    assert [(item["id"], item["quantity"]) for item in items] == [
        (second["id"], 1),
        (first["id"], 3),
    ]
    assert stored_quantity(db_session, first["id"]) == 3
    assert stored_quantity(db_session, second["id"]) == 1


def test_checkout_short_item_returns_409_and_rolls_back_earlier_items(
    client: TestClient, admin_token: str, auth_headers: dict[str, str], db_session: Session
) -> None:
    valid = create_vehicle(client, admin_token, quantity=5)
    short = create_vehicle(client, admin_token, quantity=1)
    assert valid["id"] < short["id"]

    response = client.post(
        CHECKOUT,
        headers=auth_headers,
        json={"items": [line(valid["id"], 2), line(short["id"], 2)]},
    )

    assert response.status_code == 409
    assert response.json() == {
        "detail": f"Not enough stock for {short['year']} {short['make']} {short['model']}"
    }
    assert stored_quantity(db_session, valid["id"]) == 5
    assert stored_quantity(db_session, short["id"]) == 1


def test_checkout_unknown_vehicle_returns_404_and_changes_nothing(
    client: TestClient, admin_token: str, auth_headers: dict[str, str], db_session: Session
) -> None:
    first = create_vehicle(client, admin_token, quantity=5)
    second = create_vehicle(client, admin_token, quantity=3)
    missing_id = 2_000_000_000

    response = client.post(
        CHECKOUT,
        headers=auth_headers,
        json={"items": [line(first["id"], 1), line(second["id"], 1), line(missing_id, 1)]},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": f"Vehicle {missing_id} not found"}
    assert stored_quantity(db_session, first["id"]) == 5
    assert stored_quantity(db_session, second["id"]) == 3


def test_checkout_exact_remaining_stock_leaves_zero(
    client: TestClient, admin_token: str, auth_headers: dict[str, str], db_session: Session
) -> None:
    car = create_vehicle(client, admin_token, quantity=3)

    response = client.post(CHECKOUT, headers=auth_headers, json={"items": [line(car["id"], 3)]})

    assert response.status_code == 200
    assert response.json()["items"][0]["quantity"] == 0
    assert stored_quantity(db_session, car["id"]) == 0


@pytest.mark.parametrize(
    "payload",
    [
        {"items": []},
        {"items": [line(1, 0)]},
        {"items": [line(0, 1)]},
        {"items": [line(2_147_483_648, 1)]},
        {"items": [line(1, 1), line(1, 2)]},
        {"items": [line(vehicle_id, 1) for vehicle_id in range(1, 22)]},
        {},
    ],
    ids=["empty", "zero-quantity", "zero-id", "id-over-int-range", "duplicate-ids", "21-items", "no-items"],
)
def test_checkout_rejects_invalid_payload(
    client: TestClient, auth_headers: dict[str, str], payload: dict[str, object]
) -> None:
    response = client.post(CHECKOUT, headers=auth_headers, json=payload)

    assert response.status_code == 422


def test_checkout_duplicate_ids_do_not_change_stock(
    client: TestClient, admin_token: str, auth_headers: dict[str, str], db_session: Session
) -> None:
    car = create_vehicle(client, admin_token, quantity=5)

    response = client.post(
        CHECKOUT,
        headers=auth_headers,
        json={"items": [line(car["id"], 1), line(car["id"], 1)]},
    )

    assert response.status_code == 422
    assert stored_quantity(db_session, car["id"]) == 5


def test_checkout_requires_authentication(
    client: TestClient, admin_token: str, db_session: Session
) -> None:
    car = create_vehicle(client, admin_token, quantity=5)

    response = client.post(CHECKOUT, json={"items": [line(car["id"], 1)]})

    assert response.status_code == 401
    assert stored_quantity(db_session, car["id"]) == 5
