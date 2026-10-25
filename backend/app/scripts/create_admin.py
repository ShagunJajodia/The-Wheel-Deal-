"""Create the admin account, or promote an existing user to admin.

Run from backend/:  python -m app.scripts.create_admin
Reads ADMIN_EMAIL and ADMIN_PASSWORD (and optional ADMIN_FULL_NAME) from the environment or .env.
"""

import sys

from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import SessionLocal
from app.models.user import UserRole
from app.repositories.user import add_user, get_user_by_email
from app.schemas.user import UserCreate
from app.services.auth import hash_password


def create_or_promote_admin(db: Session, admin: UserCreate) -> str:
    """Return "created" for a new admin or "promoted" when the email already existed."""
    password_hash = hash_password(admin.password)
    user = get_user_by_email(db, admin.email)
    if user is None:
        user = add_user(
            db, email=admin.email, full_name=admin.full_name, password_hash=password_hash
        )
        outcome = "created"
    else:
        user.password_hash = password_hash
        outcome = "promoted"
    user.role = UserRole.admin
    db.commit()
    return outcome


def main(settings: Settings | None = None) -> int:
    settings = settings or get_settings()
    password = settings.admin_password.get_secret_value() if settings.admin_password else ""
    if not settings.admin_email or not password:
        print("ADMIN_EMAIL and ADMIN_PASSWORD must be set in the environment", file=sys.stderr)
        return 1
    if password.startswith("CHANGE_ME"):
        print("ADMIN_PASSWORD is still the placeholder value; choose a real password", file=sys.stderr)
        return 1
    try:
        admin = UserCreate(
            email=settings.admin_email,
            full_name=settings.admin_full_name,
            password=password,
        )
    except ValidationError as exc:
        # Report field names and messages only; error inputs would echo the password.
        problems = "; ".join(f"{error['loc'][0]}: {error['msg']}" for error in exc.errors())
        print(f"Invalid admin settings: {problems}", file=sys.stderr)
        return 1

    with SessionLocal() as db:
        outcome = create_or_promote_admin(db, admin)
    print(f"Admin {outcome}: {admin.email}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
