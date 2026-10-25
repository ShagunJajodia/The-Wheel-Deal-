from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

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
