from datetime import datetime
from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()

@router.get("")
def get_health():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0",
    }
