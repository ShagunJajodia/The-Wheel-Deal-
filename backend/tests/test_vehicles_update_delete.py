from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.vehicle import Vehicle
from tests.test_vehicles_crud import create_vehicle


def test_update_requires_admin_or_auth(client: TestClient, admin_token: str, auth_headers: dict[str, str]) -> None:
    car = create_vehicle(client, admin_token)
    car_id = car["id"]

    unauth_res = client.put(f"/api/vehicles/{car_id}", json={"make": "Updated"})
    assert unauth_res.status_code == 401

    user_res = client.put(f"/api/vehicles/{car_id}", headers=auth_headers, json={"make": "Updated"})
    assert user_res.status_code == 403


def test_update_vehicle_partial_success(client: TestClient, admin_token: str) -> None:
    car = create_vehicle(client, admin_token, make="Tata", model="Nexon", price="1200000.00", quantity=5)
    car_id = car["id"]

    response = client.put(
        f"/api/vehicles/{car_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"price": "1350000.00", "description": "Facelift model"},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["price"] == "1350000.00"
    assert body["description"] == "Facelift model"
    assert body["make"] == "Tata"
    assert body["model"] == "Nexon"
    assert body["quantity"] == 5


def test_update_rejects_empty_body(client: TestClient, admin_token: str) -> None:
    car = create_vehicle(client, admin_token)
    car_id = car["id"]

    response = client.put(
        f"/api/vehicles/{car_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={},
    )
    assert response.status_code == 422


def test_update_quantity_not_updatable(client: TestClient, admin_token: str) -> None:
    car = create_vehicle(client, admin_token, quantity=5)
    car_id = car["id"]

    response = client.put(
        f"/api/vehicles/{car_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"quantity": 10},
    )
    assert response.status_code == 422

    get_res = client.get(
        f"/api/vehicles/{car_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert get_res.status_code == 200
    assert get_res.json()["quantity"] == 5


def test_update_nonexistent_vehicle_returns_404(client: TestClient, admin_token: str) -> None:
    response = client.put(
        "/api/vehicles/99999",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"make": "Phantom"},
    )
    assert response.status_code == 404


def test_delete_requires_admin_and_preserves_car_in_db(
    client: TestClient, admin_token: str, auth_headers: dict[str, str], db_session: Session
) -> None:
    car = create_vehicle(client, admin_token)
    car_id = car["id"]

    unauth_res = client.delete(f"/api/vehicles/{car_id}")
    assert unauth_res.status_code == 401

    user_res = client.delete(f"/api/vehicles/{car_id}", headers=auth_headers)
    assert user_res.status_code == 403

    # Assert vehicle still exists in database
    db_car = db_session.get(Vehicle, car_id)
    assert db_car is not None
    assert db_car.id == car_id


def test_delete_by_admin_returns_204_and_removes_car(client: TestClient, admin_token: str) -> None:
    car = create_vehicle(client, admin_token)
    car_id = car["id"]

    delete_res = client.delete(
        f"/api/vehicles/{car_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert delete_res.status_code == 204

    get_res = client.get(
        f"/api/vehicles/{car_id}",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert get_res.status_code == 404


def test_delete_nonexistent_vehicle_returns_404(client: TestClient, admin_token: str) -> None:
    response = client.delete(
        "/api/vehicles/99999",
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert response.status_code == 404
