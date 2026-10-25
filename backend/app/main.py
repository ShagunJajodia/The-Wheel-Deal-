from fastapi import FastAPI

from app.api.routes.health import router as health_router

app = FastAPI(title="The Wheel Deal")
app.include_router(health_router, prefix="/api")
