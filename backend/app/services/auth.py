import bcrypt
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.errors import EmailAlreadyRegistered
from app.models.user import User
from app.repositories.user import add_user, get_user_by_email
from app.schemas.user import UserCreate


def register_user(db: Session, registration: UserCreate) -> User:
    if get_user_by_email(db, registration.email) is not None:
        raise EmailAlreadyRegistered

    password_hash = bcrypt.hashpw(
        registration.password.encode("utf-8"), bcrypt.gensalt()
    ).decode("ascii")
    user = add_user(
        db,
        email=registration.email,
        full_name=registration.full_name,
        password_hash=password_hash,
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
