from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import DataError

from app.api.exception_handlers import handle_data_error, handle_domain_error
from app.api.routes.auth import router as auth_router
from app.api.routes.cart import router as cart_router
from app.api.routes.health import router as health_router
from app.api.routes.vehicles import router as vehicles_router
from app.core.config import get_settings
from app.core.errors import DomainError

app = FastAPI(title="The Wheel Deal")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in get_settings().cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_exception_handler(DomainError, handle_domain_error)
app.add_exception_handler(DataError, handle_data_error)
app.include_router(auth_router, prefix="/api/auth")
app.include_router(cart_router, prefix="/api/cart")
app.include_router(health_router, prefix="/api")
app.include_router(vehicles_router, prefix="/api/vehicles")
