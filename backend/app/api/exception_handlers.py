from fastapi import Request
from fastapi.responses import JSONResponse

from app.core.errors import DomainError, EmailAlreadyRegistered


async def handle_domain_error(_request: Request, exc: DomainError) -> JSONResponse:
    if isinstance(exc, EmailAlreadyRegistered):
        return JSONResponse(status_code=409, content={"detail": "Email already registered"})
    return JSONResponse(status_code=400, content={"detail": "Invalid request"})
