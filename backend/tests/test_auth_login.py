import base64
import hashlib
import hmac
import json
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.exception_handlers import handle_domain_error
from app.core.config import get_settings
from app.core.errors import DomainError
from app.models.user import User


def _payload(token: str) -> dict:
    encoded = token.split(".")[1]
    return json.loads(base64.urlsafe_b64decode(encoded + "=" * (-len(encoded) % 4)))


def _signed_token(payload: dict) -> str:
    def encode(value: dict) -> str:
        raw = json.dumps(value, separators=(",", ":")).encode()
        return base64.urlsafe_b64encode(raw).rstrip(b"=").decode()

    data = f'{encode({"alg": "HS256", "typ": "JWT"})}.{encode(payload)}'
    signature = hmac.new(
        get_settings().jwt_secret.encode(), data.encode(), hashlib.sha256
    ).digest()
    return f'{data}.{base64.urlsafe_b64encode(signature).rstrip(b"=").decode()}'


def test_login_returns_signed_bearer_token_with_user_claims(
    client: TestClient, user_token: str, db_session: Session
) -> None:
    response = client.post(
        "/api/auth/login",
        json={"email": "USER@EXAMPLE.COM", "password": "user-password"},
    )
    assert response.status_code == 200
    assert set(response.json()) == {"access_token", "token_type"}
    assert response.json()["token_type"] == "bearer"
    claims = _payload(user_token)
    user = db_session.query(User).filter_by(email="user@example.com").one()
    assert claims["sub"] == str(user.id)
    assert claims["role"] == "user"
    assert 0 < claims["exp"] - datetime.now(UTC).timestamp() <= 3600


def test_login_invalid_credentials_share_one_response(client: TestClient) -> None:
    client.post(
        "/api/auth/register",
        json={"email": "user@example.com", "full_name": "User", "password": "user-password"},
    )
    wrong = client.post(
        "/api/auth/login",
        json={"email": "user@example.com", "password": "wrong-password"},
    )
    unknown = client.post(
        "/api/auth/login",
        json={"email": "missing@example.com", "password": "wrong-password"},
    )
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()


def test_me_returns_public_current_user(client: TestClient, auth_headers: dict[str, str]) -> None:
    response = client.get("/api/auth/me", headers=auth_headers)
    assert response.status_code == 200
    assert set(response.json()) == {"id", "email", "full_name", "role"}
    assert response.json()["email"] == "user@example.com"


def test_me_rejects_missing_garbage_expired_and_deleted_user(
    client: TestClient, db_session: Session, user_token: str
) -> None:
    claims = _payload(user_token)
    expired = _signed_token({**claims, "exp": int((datetime.now(UTC) - timedelta(minutes=1)).timestamp())})
    for headers in ({}, {"Authorization": "Bearer garbage"}, {"Authorization": f"Bearer {expired}"}):
        assert client.get("/api/auth/me", headers=headers).status_code == 401
    db_session.query(User).filter_by(email="user@example.com").delete()
    db_session.commit()
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {user_token}"}).status_code == 401


def test_admin_dependency_rejects_user_and_accepts_admin(
    client: TestClient, user_token: str, admin_token: str
) -> None:
    from app.api.dependencies import require_admin

    probe = FastAPI()
    probe.add_exception_handler(DomainError, handle_domain_error)
    probe.dependency_overrides.update(client.app.dependency_overrides)

    @probe.get("/admin")
    def admin_only(admin: Annotated[User, Depends(require_admin)]) -> dict[str, int]:
        return {"id": admin.id}

    with TestClient(probe) as probe_client:
        assert probe_client.get("/admin", headers={"Authorization": f"Bearer {user_token}"}).status_code == 403
        assert probe_client.get("/admin", headers={"Authorization": f"Bearer {admin_token}"}).status_code == 200


def test_cors_allows_default_frontend_origin(client: TestClient) -> None:
    response = client.options(
        "/api/auth/login",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
