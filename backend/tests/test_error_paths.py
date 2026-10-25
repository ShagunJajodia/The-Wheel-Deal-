import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from psycopg import errors as pg_errors
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.exception_handlers import handle_domain_error
from app.core.errors import DomainError, EmailAlreadyRegistered
from app.schemas.user import UserCreate
from app.services.auth import register_user


def registration() -> UserCreate:
    return UserCreate(email="racer@example.com", full_name="Race Car", password="a-strong-password")


def test_unmapped_domain_error_falls_back_to_400() -> None:
    app = FastAPI()
    app.add_exception_handler(DomainError, handle_domain_error)

    @app.get("/boom")
    def boom() -> None:
        raise DomainError

    response = TestClient(app).get("/boom")

    assert response.status_code == 400
    assert response.json() == {"detail": "Invalid request"}


def test_register_maps_concurrent_duplicate_email_to_domain_error(
    db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Another request won the race between the existence check and our commit.
    def commit_with_unique_violation() -> None:
        raise IntegrityError("INSERT INTO users", {}, pg_errors.UniqueViolation("duplicate key"))

    monkeypatch.setattr(db_session, "commit", commit_with_unique_violation)

    with pytest.raises(EmailAlreadyRegistered):
        register_user(db_session, registration())


def test_register_reraises_other_integrity_errors(
    db_session: Session, monkeypatch: pytest.MonkeyPatch
) -> None:
    def commit_with_not_null_violation() -> None:
        raise IntegrityError("INSERT INTO users", {}, pg_errors.NotNullViolation("null value"))

    monkeypatch.setattr(db_session, "commit", commit_with_not_null_violation)

    with pytest.raises(IntegrityError):
        register_user(db_session, registration())
