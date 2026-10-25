import re

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.user import UserRole

_LOCAL_PART = re.compile(r"[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*")
_DOMAIN_LABEL = r"[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?"
_DOMAIN_PART = re.compile(rf"(?:{_DOMAIN_LABEL}\.)+[a-z]{{2,63}}")


class UserCreate(BaseModel):
    model_config = ConfigDict(extra="ignore")

    email: str = Field(max_length=320)
    full_name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        local, separator, domain = normalized.partition("@")
        if (
            not separator
            or not _LOCAL_PART.fullmatch(local)
            or not _DOMAIN_PART.fullmatch(domain)
        ):
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
