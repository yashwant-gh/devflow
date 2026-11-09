from datetime import datetime
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.core.logging import logger
from app.api.routes import api_router

def create_application() -> FastAPI:
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # Top-level health check endpoint
    @app.get("/health", tags=["Health"])
    def root_health():
        return {
            "status": "healthy",
            "service": settings.PROJECT_NAME,
            "timestamp": datetime.utcnow().isoformat(),
        }

    # Exception handler
    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.error(f"Global exception on {request.method} {request.url}: {exc}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": "Internal server error"},
        )

    # Include routes under prefix
    app.include_router(api_router, prefix=settings.API_V1_PREFIX)

    return app

app = create_application()
