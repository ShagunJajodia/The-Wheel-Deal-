from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.user import LoginRequest, TokenRead, UserCreate, UserRead
from app.services.auth import login_user, register_user

router = APIRouter()


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
def register(
    registration: UserCreate, db: Annotated[Session, Depends(get_db)]
) -> UserRead:
    return register_user(db, registration)


@router.post("/login", response_model=TokenRead)
def login(credentials: LoginRequest, db: Annotated[Session, Depends(get_db)]) -> TokenRead:
    return TokenRead(
        access_token=login_user(db, credentials.email, credentials.password)
    )


@router.get("/me", response_model=UserRead)
def me(user: Annotated[User, Depends(get_current_user)]) -> User:
    return user
