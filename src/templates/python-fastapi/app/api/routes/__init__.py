from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.items import router as items_router

api_router = APIRouter()

api_router.include_router(health_router, prefix="/health", tags=["Health"])
api_router.include_router(items_router, prefix="/items", tags=["Items"])
