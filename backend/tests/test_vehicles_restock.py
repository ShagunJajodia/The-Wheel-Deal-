import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from tests.test_vehicles_crud import create_vehicle
from tests.test_vehicles_purchase import stored_quantity


def test_admin_restock_adds_units_and_returns_updated_vehicle(
    client: TestClient, admin_token: str, db_session: Session
) -> None:
    car = create_vehicle(client, admin_token, quantity=2)

    response = client.post(
        f"/api/vehicles/{car['id']}/restock",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"quantity": 5},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"] == car["id"]
    assert body["quantity"] == 7
    assert body["make"] == car["make"]
    assert stored_quantity(db_session, car["id"]) == 7


def test_restock_sold_out_vehicle(client: TestClient, admin_token: str, db_session: Session) -> None:
    car = create_vehicle(client, admin_token, quantity=0)

    response = client.post(
        f"/api/vehicles/{car['id']}/restock",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"quantity": 1},
    )

    assert response.status_code == 200
    assert response.json()["quantity"] == 1
    assert stored_quantity(db_session, car["id"]) == 1


def test_restock_unknown_vehicle_returns_404(client: TestClient, admin_token: str) -> None:
    response = client.post(
        "/api/vehicles/99999/restock",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"quantity": 1},
    )

    assert response.status_code == 404
    assert response.json() == {"detail": "Vehicle not found"}


def test_restock_forbidden_for_normal_user(
    client: TestClient, admin_token: str, auth_headers: dict[str, str], db_session: Session
) -> None:
    car = create_vehicle(client, admin_token, quantity=2)

    response = client.post(
        f"/api/vehicles/{car['id']}/restock", headers=auth_headers, json={"quantity": 5}
    )

    assert response.status_code == 403
    assert stored_quantity(db_session, car["id"]) == 2


def test_restock_requires_authentication(
    client: TestClient, admin_token: str, db_session: Session
) -> None:
    car = create_vehicle(client, admin_token, quantity=2)

    response = client.post(f"/api/vehicles/{car['id']}/restock", json={"quantity": 5})

    assert response.status_code == 401
    assert stored_quantity(db_session, car["id"]) == 2


@pytest.mark.parametrize("payload", [None, {}, {"quantity": 0}, {"quantity": -3}])
def test_restock_rejects_missing_or_non_positive_quantity(
    client: TestClient, admin_token: str, db_session: Session, payload: dict[str, int] | None
) -> None:
    car = create_vehicle(client, admin_token, quantity=2)
    headers = {"Authorization": f"Bearer {admin_token}"}

    if payload is None:
        response = client.post(f"/api/vehicles/{car['id']}/restock", headers=headers)
    else:
        response = client.post(f"/api/vehicles/{car['id']}/restock", headers=headers, json=payload)

    assert response.status_code == 422
    assert stored_quantity(db_session, car["id"]) == 2
