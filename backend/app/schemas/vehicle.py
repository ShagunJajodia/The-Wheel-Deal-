from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.models.vehicle import VehicleCategory

MIN_VEHICLE_YEAR = 1886  # first production automobile
NON_NULLABLE_UPDATE_FIELDS = frozenset({"make", "model", "year", "category", "price"})


def validate_vehicle_year(value: int | None) -> int | None:
    max_year = date.today().year + 1
    if value is not None and not MIN_VEHICLE_YEAR <= value <= max_year:
        raise ValueError(f"year must be between {MIN_VEHICLE_YEAR} and {max_year}")
    return value


class VehicleCreate(BaseModel):
    make: str = Field(min_length=1, max_length=100)
    model: str = Field(min_length=1, max_length=100)
    year: int
    category: VehicleCategory
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    quantity: int = Field(ge=0)
    image_url: str | None = Field(default=None, max_length=2048)
    description: str | None = None

    @field_validator("year")
    @classmethod
    def check_year(cls, value: int) -> int:
        validate_vehicle_year(value)
        return value


class VehicleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    make: str | None = Field(default=None, min_length=1, max_length=100)
    model: str | None = Field(default=None, min_length=1, max_length=100)
    year: int | None = None
    category: VehicleCategory | None = None
    price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    image_url: str | None = Field(default=None, max_length=2048)
    description: str | None = None

    @field_validator("year")
    @classmethod
    def check_year(cls, value: int | None) -> int | None:
        return validate_vehicle_year(value)

    @model_validator(mode="after")
    def validate_non_empty(self) -> "VehicleUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided for update")
        return self

    @model_validator(mode="after")
    def reject_null_required_fields(self) -> "VehicleUpdate":
        nulled = sorted(
            field
            for field in self.model_fields_set & NON_NULLABLE_UPDATE_FIELDS
            if getattr(self, field) is None
        )
        if nulled:
            raise ValueError(f"{', '.join(nulled)} cannot be null")
        return self


class VehiclePurchase(BaseModel):
    quantity: int = Field(default=1, ge=1)


MAX_VEHICLE_ID = 2_147_483_647  # Postgres INTEGER range


class VehicleRestock(BaseModel):
    quantity: int = Field(ge=1)


class VehicleRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    make: str
    model: str
    year: int
    category: VehicleCategory
    price: Decimal
    quantity: int
    image_url: str | None
    description: str | None
    created_at: datetime
    updated_at: datetime


class VehicleSearchParams(BaseModel):
    make: str | None = None
    model: str | None = None
    category: VehicleCategory | None = None
    min_price: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)
    max_price: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)

    @model_validator(mode="after")
    def validate_price_range(self) -> "VehicleSearchParams":
        if (
            self.min_price is not None
            and self.max_price is not None
            and self.min_price > self.max_price
        ):
            raise ValueError("min_price cannot be greater than max_price")
        return self
