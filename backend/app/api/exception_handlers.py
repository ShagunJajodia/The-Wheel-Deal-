from fastapi import Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import DataError

from app.core.errors import (
    AdminRequired,
    AuthenticationRequired,
    CheckoutOutOfStock,
    CheckoutVehicleNotFound,
    DomainError,
    EmailAlreadyRegistered,
    InvalidCredentials,
    OutOfStock,
    VehicleNotFound,
)

BEARER_CHALLENGE = {"WWW-Authenticate": "Bearer"}


async def handle_domain_error(_request: Request, exc: DomainError) -> JSONResponse:
    if isinstance(exc, EmailAlreadyRegistered):
        return JSONResponse(status_code=409, content={"detail": "Email already registered"})
    if isinstance(exc, InvalidCredentials):
        return JSONResponse(
            status_code=401, content={"detail": "Invalid credentials"}, headers=BEARER_CHALLENGE
        )
    if isinstance(exc, AuthenticationRequired):
        return JSONResponse(
            status_code=401, content={"detail": "Authentication required"}, headers=BEARER_CHALLENGE
        )
    if isinstance(exc, AdminRequired):
        return JSONResponse(status_code=403, content={"detail": "Admin access required"})
    if isinstance(exc, CheckoutVehicleNotFound):
        return JSONResponse(status_code=404, content={"detail": str(exc)})
    if isinstance(exc, CheckoutOutOfStock):
        return JSONResponse(status_code=409, content={"detail": str(exc)})
    if isinstance(exc, VehicleNotFound):
        return JSONResponse(status_code=404, content={"detail": "Vehicle not found"})
    if isinstance(exc, OutOfStock):
        return JSONResponse(status_code=409, content={"detail": "Not enough stock"})
    return JSONResponse(status_code=400, content={"detail": "Invalid request"})


async def handle_data_error(_request: Request, _exc: DataError) -> JSONResponse:
    # Values Postgres cannot store (NUL bytes, numeric overflow, ...) are the client's fault.
    return JSONResponse(status_code=422, content={"detail": "Invalid input"})
