from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.vehicle import VehicleCreate, VehicleRead
from app.services.vehicle import create_vehicle, get_vehicle, get_vehicles

router = APIRouter()


@router.post("", response_model=VehicleRead, status_code=status.HTTP_201_CREATED)
def create(
    data: VehicleCreate,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> VehicleRead:
    return create_vehicle(db, data)


@router.get("", response_model=list[VehicleRead])
def list_all(
    db: Annotated[Session, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
) -> list[VehicleRead]:
    return get_vehicles(db)


@router.get("/{vehicle_id}", response_model=VehicleRead)
def detail(
    vehicle_id: int,
    db: Annotated[Session, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
) -> VehicleRead:
    return get_vehicle(db, vehicle_id)
