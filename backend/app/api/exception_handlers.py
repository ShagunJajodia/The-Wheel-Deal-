from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.errors import (
    AdminRequired,
    AuthenticationRequired,
    DomainError,
    EmailAlreadyRegistered,
    InvalidCredentials,
    OutOfStock,
    VehicleNotFound,
)


async def handle_domain_error(_request: Request, exc: DomainError) -> JSONResponse:
    if isinstance(exc, EmailAlreadyRegistered):
        return JSONResponse(status_code=409, content={"detail": "Email already registered"})
    if isinstance(exc, InvalidCredentials):
        return JSONResponse(status_code=401, content={"detail": "Invalid credentials"})
    if isinstance(exc, AuthenticationRequired):
        return JSONResponse(status_code=401, content={"detail": "Authentication required"})
    if isinstance(exc, AdminRequired):
        return JSONResponse(status_code=403, content={"detail": "Admin access required"})
    if isinstance(exc, VehicleNotFound):
        return JSONResponse(status_code=404, content={"detail": "Vehicle not found"})
    if isinstance(exc, OutOfStock):
        return JSONResponse(status_code=409, content={"detail": "Not enough stock"})
    return JSONResponse(status_code=400, content={"detail": "Invalid request"})
