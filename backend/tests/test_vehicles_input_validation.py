from datetime import date

import pytest
from fastapi.testclient import TestClient

from tests.test_vehicles_crud import create_vehicle, vehicle_payload

NON_NULLABLE_FIELDS = ["make", "model", "year", "category", "price"]
NULLABLE_FIELDS = ["image_url", "description"]
MIN_YEAR = 1886


def max_year() -> int:
    return date.today().year + 1


@pytest.fixture
def http(client: TestClient) -> TestClient:
    # Report unhandled server errors as a 500 response instead of re-raising them in the test.
    return TestClient(client.app, raise_server_exceptions=False)


@pytest.mark.parametrize("field", NON_NULLABLE_FIELDS)
def test_update_rejects_explicit_null_for_required_field(
    client: TestClient, http: TestClient, admin_token: str, field: str
) -> None:
    headers = {"Authorization": f"Bearer {admin_token}"}
    car = create_vehicle(client, admin_token)

    response = http.put(f"/api/vehicles/{car['id']}", headers=headers, json={field: None})

    assert response.status_code == 422
    unchanged = client.get(f"/api/vehicles/{car['id']}", headers=headers).json()
    assert unchanged[field] == car[field]


def test_update_rejects_null_required_field_even_with_valid_fields(
    client: TestClient, http: TestClient, admin_token: str
) -> None:
    headers = {"Authorization": f"Bearer {admin_token}"}
    car = create_vehicle(client, admin_token)

    response = http.put(
        f"/api/vehicles/{car['id']}", headers=headers, json={"description": "New", "price": None}
    )

    assert response.status_code == 422
    assert client.get(f"/api/vehicles/{car['id']}", headers=headers).json()["description"] == car[
        "description"
    ]


@pytest.mark.parametrize("field", NULLABLE_FIELDS)
def test_update_allows_clearing_optional_field_with_null(
    client: TestClient, admin_token: str, field: str
) -> None:
    car = create_vehicle(client, admin_token)
    assert car[field] is not None

    response = client.put(
        f"/api/vehicles/{car['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={field: None},
    )

    assert response.status_code == 200
    assert response.json()[field] is None


@pytest.mark.parametrize("year", [MIN_YEAR - 1, 0, -2000, max_year() + 1, 99999])
def test_create_rejects_out_of_range_year(client: TestClient, admin_token: str, year: int) -> None:
    response = client.post(
        "/api/vehicles",
        headers={"Authorization": f"Bearer {admin_token}"},
        json=vehicle_payload(year=year),
    )

    assert response.status_code == 422


@pytest.mark.parametrize("year", [MIN_YEAR, 1999, max_year()])
def test_create_accepts_boundary_years(client: TestClient, admin_token: str, year: int) -> None:
    car = create_vehicle(client, admin_token, year=year)

    assert car["year"] == year


@pytest.mark.parametrize("year", [MIN_YEAR - 1, max_year() + 1])
def test_update_rejects_out_of_range_year(client: TestClient, admin_token: str, year: int) -> None:
    headers = {"Authorization": f"Bearer {admin_token}"}
    car = create_vehicle(client, admin_token, year=2020)

    response = client.put(f"/api/vehicles/{car['id']}", headers=headers, json={"year": year})

    assert response.status_code == 422
    assert client.get(f"/api/vehicles/{car['id']}", headers=headers).json()["year"] == 2020


@pytest.mark.parametrize("year", [MIN_YEAR, max_year()])
def test_update_accepts_boundary_years(client: TestClient, admin_token: str, year: int) -> None:
    car = create_vehicle(client, admin_token, year=2020)

    response = client.put(
        f"/api/vehicles/{car['id']}",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={"year": year},
    )

    assert response.status_code == 200
    assert response.json()["year"] == year
