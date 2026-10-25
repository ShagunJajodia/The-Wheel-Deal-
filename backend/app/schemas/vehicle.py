from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.models.vehicle import VehicleCategory


class VehicleCreate(BaseModel):
    make: str = Field(min_length=1, max_length=100)
    model: str = Field(min_length=1, max_length=100)
    year: int
    category: VehicleCategory
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    quantity: int = Field(ge=0)
    image_url: str | None = Field(default=None, max_length=2048)
    description: str | None = None


class VehicleUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    make: str | None = Field(default=None, min_length=1, max_length=100)
    model: str | None = Field(default=None, min_length=1, max_length=100)
    year: int | None = None
    category: VehicleCategory | None = None
    price: Decimal | None = Field(default=None, gt=0, max_digits=10, decimal_places=2)
    image_url: str | None = Field(default=None, max_length=2048)
    description: str | None = None

    @model_validator(mode="after")
    def validate_non_empty(self) -> "VehicleUpdate":
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided for update")
        return self


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
    min_price: Decimal | None = Field(default=None, ge=0)
    max_price: Decimal | None = Field(default=None, ge=0)

    @model_validator(mode="after")
    def validate_price_range(self) -> "VehicleSearchParams":
        if (
            self.min_price is not None
            and self.max_price is not None
            and self.min_price > self.max_price
        ):
            raise ValueError("min_price cannot be greater than max_price")
        return self
