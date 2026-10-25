import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle
from tests.test_vehicles_crud import create_vehicle


def stored_quantity(db_session: Session, vehicle_id: int) -> int:
    # Select the column (not the entity) so a stale identity-map object cannot hide the DB value.
    return db_session.execute(select(Vehicle.quantity).where(Vehicle.id == vehicle_id)).scalar_one()


def test_purchase_decrements_stock_and_returns_updated_vehicle(
    client: TestClient, admin_token: str, auth_headers: dict[str, str], db_session: Session
) -> None:
    car = create_vehicle(client, admin_token, quantity=5)

    response = client.post(f"/api/vehicles/{car['id']}/purchase", headers=auth_headers)

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == car["id"]
    assert body["quantity"] == 4
    assert body["make"] == car["make"]
    assert body["price"] == car["price"]
    assert stored_quantity(db_session, car["id"]) == 4


def test_purchase_with_explicit_quantity(
    client: TestClient, admin_token: str, auth_headers: dict[str, str], db_session: Session
) -> None:
    car = create_vehicle(client, admin_token, quantity=5)

    response = client.post(
        f"/api/vehicles/{car['id']}/purchase", headers=auth_headers, json={"quantity": 3}
    )

    assert response.status_code == 200
    assert response.json()["quantity"] == 2
    assert stored_quantity(db_session, car["id"]) == 2


def test_purchase_last_unit_leaves_zero(
    client: TestClient, admin_token: str, auth_headers: dict[str, str], db_session: Session
) -> None:
    car = create_vehicle(client, admin_token, quantity=1)

    response = client.post(f"/api/vehicles/{car['id']}/purchase", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["quantity"] == 0
    assert stored_quantity(db_session, car["id"]) == 0


def test_purchase_when_out_of_stock_returns_409_and_keeps_zero(
    client: TestClient, admin_token: str, auth_headers: dict[str, str], db_session: Session
) -> None:
    car = create_vehicle(client, admin_token, quantity=0)

    response = client.post(f"/api/vehicles/{car['id']}/purchase", headers=auth_headers)

    assert response.status_code == 409
    assert response.json() == {"detail": "Not enough stock"}
    assert stored_quantity(db_session, car["id"]) == 0


def test_purchase_more_than_stock_returns_409_and_leaves_quantity_unchanged(
    client: TestClient, admin_token: str, auth_headers: dict[str, str], db_session: Session
) -> None:
    car = create_vehicle(client, admin_token, quantity=2)

    response = client.post(
        f"/api/vehicles/{car['id']}/purchase", headers=auth_headers, json={"quantity": 3}
    )

    assert response.status_code == 409
    assert stored_quantity(db_session, car["id"]) == 2


@pytest.mark.parametrize("quantity", [0, -1])
def test_purchase_rejects_non_positive_quantity(
    client: TestClient,
    admin_token: str,
    auth_headers: dict[str, str],
    db_session: Session,
    quantity: int,
) -> None:
    car = create_vehicle(client, admin_token, quantity=5)

    response = client.post(
        f"/api/vehicles/{car['id']}/purchase", headers=auth_headers, json={"quantity": quantity}
    )

    assert response.status_code == 422
    assert stored_quantity(db_session, car["id"]) == 5


def test_purchase_unknown_vehicle_returns_404(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.post("/api/vehicles/99999/purchase", headers=auth_headers)

    assert response.status_code == 404
    assert response.json() == {"detail": "Vehicle not found"}


def test_purchase_requires_authentication(
    client: TestClient, admin_token: str, db_session: Session
) -> None:
    car = create_vehicle(client, admin_token, quantity=5)

    response = client.post(f"/api/vehicles/{car['id']}/purchase")

    assert response.status_code == 401
    assert stored_quantity(db_session, car["id"]) == 5
