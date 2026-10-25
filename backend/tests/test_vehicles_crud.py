import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session


def vehicle_payload(**overrides: object) -> dict[str, object]:
    payload: dict[str, object] = {
        "make": "Tata",
        "model": "Nexon",
        "year": 2025,
        "category": "suv",
        "price": "1250000.00",
        "quantity": 0,
        "image_url": "https://example.com/nexon.jpg",
        "description": "Compact SUV",
    }
    payload.update(overrides)
    return payload


def create_vehicle(client: TestClient, admin_token: str, **overrides: object) -> dict:
    response = client.post(
        "/api/vehicles",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=vehicle_payload(**overrides),
    )
    assert response.status_code == 201
    return response.json()


def test_admin_creates_vehicle_with_exact_price_and_public_fields(
    client: TestClient, admin_token: str
) -> None:
    response = client.post(
        "/api/vehicles",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=vehicle_payload(),
    )
    assert response.status_code == 201
    body = response.json()
    assert body["price"] == "1250000.00"
    assert body["quantity"] == 0
    assert body["category"] == "suv"
    assert set(body) == {
        "id", "make", "model", "year", "category", "price", "quantity",
        "image_url", "description", "created_at", "updated_at",
    }


def test_create_requires_admin_and_does_not_insert_for_user(
    client: TestClient, auth_headers: dict[str, str], db_session: Session
) -> None:
    assert client.post("/api/vehicles", json=vehicle_payload()).status_code == 401
    response = client.post(
        "/api/vehicles", headers=auth_headers, json=vehicle_payload()
    )
    assert response.status_code == 403
    assert db_session.execute(text("SELECT COUNT(*) FROM vehicles")).scalar_one() == 0


def test_list_includes_zero_stock_newest_first_and_requires_login(
    client: TestClient, admin_token: str, auth_headers: dict[str, str]
) -> None:
    first = create_vehicle(client, admin_token, model="First", quantity=0)
    second = create_vehicle(client, admin_token, model="Second", quantity=4)
    assert client.get("/api/vehicles").status_code == 401
    response = client.get("/api/vehicles", headers=auth_headers)
    assert response.status_code == 200
    assert [item["id"] for item in response.json()] == [second["id"], first["id"]]
    assert response.json()[1]["quantity"] == 0


def test_detail_returns_vehicle_or_404_and_requires_login(
    client: TestClient, admin_token: str, auth_headers: dict[str, str]
) -> None:
    vehicle = create_vehicle(client, admin_token)
    path = f'/api/vehicles/{vehicle["id"]}'
    assert client.get(path).status_code == 401
    response = client.get(path, headers=auth_headers)
    assert response.status_code == 200
    assert response.json() == vehicle
    assert client.get("/api/vehicles/999999", headers=auth_headers).status_code == 404


def test_create_validates_category_price_and_quantity(
    client: TestClient, admin_token: str
) -> None:
    headers = {"Authorization": f"Bearer {admin_token}"}
    for overrides in (
        {"category": "motorbike"},
        {"price": "0"},
        {"price": "-1.00"},
        {"quantity": -1},
    ):
        response = client.post("/api/vehicles", headers=headers, json=vehicle_payload(**overrides))
        assert response.status_code == 422


def test_quantity_is_checked_by_postgres(db_session: Session) -> None:
    with pytest.raises(IntegrityError), db_session.begin_nested():
        db_session.execute(
            text(
                "INSERT INTO vehicles (make, model, year, category, price, quantity) "
                "VALUES ('Tata', 'Nexon', 2025, 'suv', 1250000.00, -1)"
            )
        )
