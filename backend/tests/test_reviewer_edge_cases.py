"""Edge cases found in code review: auth oracles, integer/NUL/wildcard input handling, 401 headers."""

import bcrypt
import jwt
import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from tests.test_vehicles_crud import create_vehicle, vehicle_payload

INVALID_CREDENTIALS = {"detail": "Invalid credentials"}
INT4_MAX = 2_147_483_647


def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# a) Passwords over bcrypt's 72-byte limit must not turn into a 500 (account-existence oracle).


@pytest.mark.parametrize("password", ["x" * 100, "é" * 40])  # 100 bytes, 80 bytes
def test_login_with_overlong_password_is_401_for_existing_account(
    http: TestClient, user_token: str, password: str
) -> None:
    response = http.post(
        "/api/auth/login", json={"email": "user@example.com", "password": password}
    )

    assert response.status_code == 401
    assert response.json() == INVALID_CREDENTIALS


@pytest.mark.parametrize("password", ["x" * 100, "é" * 40])
def test_login_with_overlong_password_is_401_for_unknown_account(
    http: TestClient, password: str
) -> None:
    response = http.post(
        "/api/auth/login", json={"email": "nobody@example.com", "password": password}
    )

    assert response.status_code == 401
    assert response.json() == INVALID_CREDENTIALS


def test_login_still_works_with_a_72_byte_password(client: TestClient) -> None:
    password = "p" * 72
    register = client.post(
        "/api/auth/register",
        json={"email": "long@example.com", "full_name": "Long Pass", "password": password},
    )
    assert register.status_code == 201

    response = client.post("/api/auth/login", json={"email": "long@example.com", "password": password})

    assert response.status_code == 200


# b) Unknown emails must cost the same bcrypt work as wrong passwords (timing oracle).


def test_login_for_unknown_email_still_runs_a_bcrypt_check(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    checked: list[bytes] = []
    real_checkpw = bcrypt.checkpw

    def spy(password: bytes, hashed_password: bytes) -> bool:
        checked.append(hashed_password)
        return real_checkpw(password, hashed_password)

    monkeypatch.setattr(bcrypt, "checkpw", spy)

    response = client.post(
        "/api/auth/login", json={"email": "nobody@example.com", "password": "some-password"}
    )

    assert response.status_code == 401
    assert len(checked) == 1


# c) Vehicle ids outside the Postgres integer range are rejected with 422 (never a 500).
# Decision: 422 from path validation (ge=1, le=2_147_483_647); in-range unknown ids stay 404.

VEHICLE_ROUTES: list[tuple[str, str, dict[str, object] | None]] = [
    ("GET", "/api/vehicles/{id}", None),
    ("PUT", "/api/vehicles/{id}", {"make": "Phantom"}),
    ("DELETE", "/api/vehicles/{id}", None),
    ("POST", "/api/vehicles/{id}/purchase", None),
    ("POST", "/api/vehicles/{id}/restock", {"quantity": 1}),
]


@pytest.mark.parametrize("vehicle_id", [3_000_000_000, INT4_MAX + 1, 0])
@pytest.mark.parametrize(("method", "path", "body"), VEHICLE_ROUTES)
def test_out_of_range_vehicle_id_is_422(
    http: TestClient,
    admin_token: str,
    method: str,
    path: str,
    body: dict[str, object] | None,
    vehicle_id: int,
) -> None:
    response = http.request(
        method, path.format(id=vehicle_id), headers=bearer(admin_token), json=body
    )

    assert response.status_code == 422


def test_largest_valid_vehicle_id_is_a_normal_404(http: TestClient, admin_token: str) -> None:
    response = http.get(f"/api/vehicles/{INT4_MAX}", headers=bearer(admin_token))

    assert response.status_code == 404


# d) LIKE wildcards in search text are literals, not patterns.


@pytest.mark.parametrize("field", ["make", "model"])
@pytest.mark.parametrize("wildcard", ["%", "_"])
def test_search_wildcards_do_not_match_everything(
    client: TestClient, admin_token: str, auth_headers: dict[str, str], field: str, wildcard: str
) -> None:
    create_vehicle(client, admin_token, make="Tata", model="Nexon")

    response = client.get("/api/vehicles/search", headers=auth_headers, params={field: wildcard})

    assert response.status_code == 200
    assert response.json() == []


def test_search_still_matches_a_literal_percent(
    client: TestClient, admin_token: str, auth_headers: dict[str, str]
) -> None:
    create_vehicle(client, admin_token, make="Tata", model="Nexon")
    odd = create_vehicle(client, admin_token, make="100% Cars", model="Odd")

    response = client.get("/api/vehicles/search", headers=auth_headers, params={"make": "%"})

    assert [car["id"] for car in response.json()] == [odd["id"]]


# e) NUL bytes and numeric overflow are client errors, not 500s.


def test_login_with_nul_byte_in_email_is_not_a_server_error(http: TestClient) -> None:
    response = http.post(
        "/api/auth/login", json={"email": "a\u0000b@x.com", "password": "some-password"}
    )

    assert response.status_code in (401, 422)


def test_nul_byte_in_vehicle_make_is_422_invalid_input(http: TestClient, admin_token: str) -> None:
    response = http.post(
        "/api/vehicles", headers=bearer(admin_token), json=vehicle_payload(make="Ta\u0000ta")
    )

    assert response.status_code == 422
    assert response.json() == {"detail": "Invalid input"}


@pytest.mark.parametrize("param", ["min_price", "max_price"])
@pytest.mark.parametrize("value", ["1e200000", "123456789012", "10.123"])
def test_search_rejects_prices_that_do_not_fit_numeric_10_2(
    http: TestClient, auth_headers: dict[str, str], param: str, value: str
) -> None:
    response = http.get("/api/vehicles/search", headers=auth_headers, params={param: value})

    assert response.status_code == 422


# f) Every 401 advertises the Bearer scheme.


def test_missing_token_401_has_www_authenticate_header(client: TestClient) -> None:
    response = client.get("/api/auth/me")

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_invalid_token_401_has_www_authenticate_header(client: TestClient) -> None:
    response = client.get("/api/auth/me", headers=bearer("not-a-jwt"))

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


def test_invalid_credentials_401_has_www_authenticate_header(client: TestClient) -> None:
    response = client.post(
        "/api/auth/login", json={"email": "nobody@example.com", "password": "some-password"}
    )

    assert response.status_code == 401
    assert response.headers["www-authenticate"] == "Bearer"


# g) Tokens must carry exp and sub.


def forged_token(user_id: int, **claims: object) -> str:
    payload: dict[str, object] = {"sub": str(user_id), "role": "user", **claims}
    return jwt.encode(payload, get_settings().jwt_secret, algorithm="HS256")


def test_token_without_expiry_is_rejected(
    client: TestClient, user_token: str, auth_headers: dict[str, str]
) -> None:
    user_id = client.get("/api/auth/me", headers=auth_headers).json()["id"]

    # Control: the same claims plus a far-future exp are accepted, so only the missing exp matters.
    with_exp = client.get(
        "/api/auth/me", headers=bearer(forged_token(user_id, exp=4_102_444_800))
    )
    without_exp = client.get("/api/auth/me", headers=bearer(forged_token(user_id)))

    assert with_exp.status_code == 200
    assert without_exp.status_code == 401


def test_token_without_subject_is_rejected(client: TestClient, user_token: str) -> None:
    token = jwt.encode(
        {"role": "user", "exp": 4_102_444_800}, get_settings().jwt_secret, algorithm="HS256"
    )

    response = client.get("/api/auth/me", headers=bearer(token))

    assert response.status_code == 401
