from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user, require_admin
from app.db.session import get_db
from app.models.user import User
from app.schemas.vehicle import (
    VehicleCreate,
    VehicleRead,
    VehicleSearchParams,
    VehicleUpdate,
)
from app.services.vehicle import (
    create_vehicle,
    delete_vehicle,
    find_vehicles,
    get_vehicle,
    get_vehicles,
    modify_vehicle,
)

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


@router.get("/search", response_model=list[VehicleRead])
def search(
    params: Annotated[VehicleSearchParams, Query()],
    db: Annotated[Session, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
) -> list[VehicleRead]:
    return find_vehicles(db, params)


@router.get("/{vehicle_id}", response_model=VehicleRead)
def detail(
    vehicle_id: int,
    db: Annotated[Session, Depends(get_db)],
    _user: Annotated[User, Depends(get_current_user)],
) -> VehicleRead:
    return get_vehicle(db, vehicle_id)


@router.put("/{vehicle_id}", response_model=VehicleRead)
def update(
    vehicle_id: int,
    data: VehicleUpdate,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> VehicleRead:
    return modify_vehicle(db, vehicle_id, data)


@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    vehicle_id: int,
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
) -> None:
    delete_vehicle(db, vehicle_id)
