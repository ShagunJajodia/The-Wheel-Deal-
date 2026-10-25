from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.errors import EmailAlreadyRegistered, InvalidCredentials
from app.models.user import User
from app.repositories.user import add_user, get_user_by_email
from app.schemas.user import UserCreate

MAX_PASSWORD_BYTES = 72  # bcrypt ignores (v4) or rejects (v5) anything longer


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("ascii")


# Checked against when the email is unknown so both failure paths cost one bcrypt comparison.
_DUMMY_PASSWORD_HASH = hash_password("dummy-password-for-constant-time-login")


def register_user(db: Session, registration: UserCreate) -> User:
    if get_user_by_email(db, registration.email) is not None:
        raise EmailAlreadyRegistered

    user = add_user(
        db,
        email=registration.email,
        full_name=registration.full_name,
        password_hash=hash_password(registration.password),
    )
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if getattr(exc.orig, "sqlstate", None) == "23505":
            raise EmailAlreadyRegistered from exc
        raise
    db.refresh(user)
    return user


def login_user(db: Session, email: str, password: str) -> str:
    password_bytes = password.encode("utf-8")
    if len(password_bytes) > MAX_PASSWORD_BYTES:
        raise InvalidCredentials
    user = get_user_by_email(db, email)
    stored_hash = user.password_hash if user is not None else _DUMMY_PASSWORD_HASH
    password_matches = bcrypt.checkpw(password_bytes, stored_hash.encode("ascii"))
    if user is None or not password_matches:
        raise InvalidCredentials
    expires_at = datetime.now(UTC) + timedelta(minutes=60)
    return jwt.encode(
        {"sub": str(user.id), "role": user.role.value, "exp": expires_at},
        get_settings().jwt_secret,
        algorithm="HS256",
    )
