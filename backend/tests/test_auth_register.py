import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session


def registration_payload(**overrides: str) -> dict[str, str]:
    payload = {
        "email": "Driver@Example.com",
        "full_name": "Test Driver",
        "password": "a-strong-password",
    }
    payload.update(overrides)
    return payload


def test_register_returns_only_public_user_fields(
    client: TestClient, db_session: Session
) -> None:
    password = "a-strong-password"

    response = client.post("/api/auth/register", json=registration_payload())

    assert response.status_code == 201
    body = response.json()
    assert set(body) == {"id", "email", "full_name", "role"}
    assert isinstance(body["id"], int)
    assert body["email"] == "driver@example.com"
    assert body["full_name"] == "Test Driver"
    assert body["role"] == "user"
    assert password not in response.text

    stored = db_session.execute(
        text("SELECT email, full_name, role FROM users WHERE id = :id"),
        {"id": body["id"]},
    ).one()
    assert stored.email == "driver@example.com"
    assert stored.full_name == "Test Driver"
    assert stored.role == "user"


def test_register_ignores_requested_admin_role(
    client: TestClient, db_session: Session
) -> None:
    response = client.post(
        "/api/auth/register", json=registration_payload(role="admin")
    )

    assert response.status_code == 201
    assert response.json()["role"] == "user"
    stored_role = db_session.execute(
        text("SELECT role FROM users WHERE id = :id"),
        {"id": response.json()["id"]},
    ).scalar_one()
    assert stored_role == "user"


def test_register_rejects_duplicate_email_case_insensitively(
    client: TestClient, db_session: Session
) -> None:
    first = client.post("/api/auth/register", json=registration_payload())
    assert first.status_code == 201

    duplicate = client.post(
        "/api/auth/register",
        json=registration_payload(email="DRIVER@example.COM"),
    )

    assert duplicate.status_code == 409
    stored_emails = db_session.execute(text("SELECT email FROM users")).scalars().all()
    assert stored_emails == ["driver@example.com"]


@pytest.mark.parametrize(
    "payload",
    [
        registration_payload(email="not-an-email"),
        registration_payload(email="a@b..c"),
        registration_payload(email="a..b@example.com"),
        registration_payload(email="a@-example.com"),
        registration_payload(email="a@example.com."),
        registration_payload(password="short"),
        {"full_name": "Test Driver", "password": "a-strong-password"},
        {"email": "driver@example.com", "password": "a-strong-password"},
        {"email": "driver@example.com", "full_name": "Test Driver"},
    ],
    ids=[
        "bad-email",
        "consecutive-domain-dots",
        "consecutive-local-dots",
        "leading-domain-hyphen",
        "trailing-domain-dot",
        "short-password",
        "missing-email",
        "missing-name",
        "missing-password",
    ],
)
def test_register_rejects_invalid_input(
    client: TestClient, db_session: Session, payload: dict[str, str]
) -> None:
    response = client.post("/api/auth/register", json=payload)

    assert response.status_code == 422
    assert db_session.execute(text("SELECT COUNT(*) FROM users")).scalar_one() == 0


def test_register_stores_verifiable_bcrypt_hash(
    client: TestClient, db_session: Session
) -> None:
    password = "a-strong-password"
    response = client.post("/api/auth/register", json=registration_payload())
    assert response.status_code == 201

    stored_hash = db_session.execute(
        text("SELECT password_hash FROM users WHERE id = :id"),
        {"id": response.json()["id"]},
    ).scalar_one()
    assert stored_hash != password
    assert stored_hash.startswith("$2")

    import bcrypt

    assert bcrypt.checkpw(password.encode(), stored_hash.encode())
