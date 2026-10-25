import re

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.user import UserRole


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    email: str = Field(max_length=320)
    full_name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not re.fullmatch(r"[^@\s]+@[^@\s]+\.[^@\s]+", normalized):
            raise ValueError("Invalid email address")
        return normalized

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("Full name is required")
        return normalized

    @field_validator("password")
    @classmethod
    def limit_bcrypt_password(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password is too long")
        return value


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: str
    full_name: str
    role: UserRole
