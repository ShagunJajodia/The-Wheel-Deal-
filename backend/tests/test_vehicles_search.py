from fastapi.testclient import TestClient

from tests.test_vehicles_crud import create_vehicle


def test_search_requires_auth(client: TestClient) -> None:
    response = client.get("/api/vehicles/search")
    assert response.status_code == 401


def test_search_route_precedes_vehicle_id_parameter(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.get("/api/vehicles/search", headers=auth_headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_search_case_insensitive_partial_make_and_model(
    client: TestClient, admin_token: str, auth_headers: dict[str, str]
) -> None:
    create_vehicle(client, admin_token, make="Tata", model="Nexon EV", category="ev", price="1500000.00")
    create_vehicle(client, admin_token, make="Tata", model="Harrier", category="suv", price="2200000.00")
    create_vehicle(client, admin_token, make="Hyundai", model="Creta", category="suv", price="1800000.00")

    res_make = client.get("/api/vehicles/search?make=tat", headers=auth_headers)
    assert res_make.status_code == 200
    makes = [v["make"] for v in res_make.json()]
    assert len(makes) == 2
    assert all(m == "Tata" for m in makes)

    res_model = client.get("/api/vehicles/search?model=EXON", headers=auth_headers)
    assert res_model.status_code == 200
    results = res_model.json()
    assert len(results) == 1
    assert results[0]["model"] == "Nexon EV"


def test_search_exact_category(
    client: TestClient, admin_token: str, auth_headers: dict[str, str]
) -> None:
    create_vehicle(client, admin_token, make="Honda", model="City", category="sedan", price="1200000.00")
    create_vehicle(client, admin_token, make="Tata", model="Safari", category="suv", price="2500000.00")

    response = client.get("/api/vehicles/search?category=sedan", headers=auth_headers)
    assert response.status_code == 200
    results = response.json()
    assert len(results) == 1
    assert results[0]["model"] == "City"


def test_search_price_bounds(
    client: TestClient, admin_token: str, auth_headers: dict[str, str]
) -> None:
    create_vehicle(client, admin_token, make="CarA", model="A", price="100000.00")
    create_vehicle(client, admin_token, make="CarB", model="B", price="200000.00")
    create_vehicle(client, admin_token, make="CarC", model="C", price="300000.00")

    res_min = client.get("/api/vehicles/search?min_price=200000.00", headers=auth_headers)
    assert res_min.status_code == 200
    models_min = {v["model"] for v in res_min.json()}
    assert models_min == {"B", "C"}

    res_max = client.get("/api/vehicles/search?max_price=200000.00", headers=auth_headers)
    assert res_max.status_code == 200
    models_max = {v["model"] for v in res_max.json()}
    assert models_max == {"A", "B"}

    res_both = client.get("/api/vehicles/search?min_price=150000.00&max_price=250000.00", headers=auth_headers)
    assert res_both.status_code == 200
    models_both = {v["model"] for v in res_both.json()}
    assert models_both == {"B"}


def test_search_rejects_min_price_greater_than_max_price(
    client: TestClient, auth_headers: dict[str, str]
) -> None:
    response = client.get(
        "/api/vehicles/search?min_price=500000.00&max_price=400000.00",
        headers=auth_headers,
    )
    assert response.status_code == 422
