from fastapi import FastAPI

from app.api.exception_handlers import handle_domain_error
from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.core.errors import DomainError

app = FastAPI(title="The Wheel Deal")
app.add_exception_handler(DomainError, handle_domain_error)
app.include_router(auth_router, prefix="/api/auth")
app.include_router(health_router, prefix="/api")
