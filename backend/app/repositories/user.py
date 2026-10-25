from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.user import User, UserRole


def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(func.lower(User.email) == email.lower()))


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def add_user(
    db: Session, *, email: str, full_name: str, password_hash: str
) -> User:
    user = User(
        email=email,
        full_name=full_name,
        password_hash=password_hash,
        role=UserRole.user,
    )
    db.add(user)
    return user
