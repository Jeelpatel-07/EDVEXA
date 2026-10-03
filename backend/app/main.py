from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.core.config import Settings, get_settings
from app.core.errors import register_error_handlers
from app.core.rate_limits import build_rate_limiter
from app.db.model_registry import load_models
from app.db.session import (
    build_engine,
    build_session_factory,
)
from app.modules.access.router import router as access_router
from app.modules.accounts.router import router as accounts_router
from app.modules.sessions.router import router as sessions_router
from app.modules.sessions.service import revoke_user_sessions


def create_app(
    settings: Settings | None = None,
) -> FastAPI:
    """Build and configure the FastAPI application."""
    config = settings or get_settings()

    @asynccontextmanager
    async def lifespan(
        application: FastAPI,
    ) -> AsyncIterator[None]:
        """Initialize shared resources and release them on shutdown."""
        load_models()

        # Creating the engine does not connect to PostgreSQL yet.
        engine = build_engine(config)

        application.state.engine = engine
        application.state.session_factory = build_session_factory(engine)

        try:
            application.state.rate_limiter = build_rate_limiter(config)

            try:
                yield
            finally:
                application.state.rate_limiter.close()
        finally:
            engine.dispose()

    application = FastAPI(
        title=config.app_name,
        version="0.1.0",
        lifespan=lifespan,
        docs_url=(None if config.environment == "production" else "/docs"),
        redoc_url=(None if config.environment == "production" else "/redoc"),
        openapi_url=(None if config.environment == "production" else "/openapi.json"),
    )

    application.state.settings = config
    application.state.revoke_user_sessions = revoke_user_sessions

    register_error_handlers(application)

    @application.middleware("http")
    async def request_id_middleware(
        request: Request,
        call_next,
    ):
        """Assign a request ID and add shared response headers."""
        request.state.request_id = str(uuid4())

        response = await call_next(request)

        response.headers["X-Request-ID"] = request.state.request_id
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Cache-Control"] = "no-store"

        return response

    application.include_router(
        health_router,
        prefix="/api",
    )

    application.include_router(accounts_router, prefix="/api")
    application.include_router(sessions_router, prefix="/api")

    application.include_router(access_router, prefix="/api")

    application.add_middleware(
        CORSMiddleware,
        allow_origins=config.cors_origins,
        allow_credentials=True,
        allow_methods=[
            "GET",
            "POST",
            "PATCH",
            "PUT",
            "DELETE",
            "OPTIONS",
        ],
        allow_headers=[
            "Authorization",
            "Content-Type",
            "X-CSRF-Token",
        ],
        expose_headers=[
            "X-Request-ID",
            "Retry-After",
        ],
    )

    return application
