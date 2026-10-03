from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Request
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.errors import AppError, ErrorResponse
from app.core.rate_limits import (
    client_ip,
    enforce_rate_limit,
)
from app.db.session import get_db

router = APIRouter(
    prefix="/health",
    tags=["Health"],
)


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"


class ReadinessResponse(BaseModel):
    status: Literal["ready"] = "ready"
    database: Literal["reachable"] = "reachable"


@router.get(
    "/live",
    response_model=HealthResponse,
)
def live() -> HealthResponse:
    """Check that the API is running without accessing the database."""
    return HealthResponse()


def readiness_limit(request: Request) -> None:
    """Limit repeated database connectivity checks."""
    enforce_rate_limit(
        request,
        scope="health-ready",
        subject=client_ip(request),
        limit=60,
        window_seconds=60,
    )


@router.get(
    "/ready",
    response_model=ReadinessResponse,
    dependencies=[
        Depends(readiness_limit),
    ],
    responses={
        429: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
def ready(
    db: Annotated[Session, Depends(get_db)],
) -> ReadinessResponse:
    """Check database connectivity, not migration completeness."""
    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        raise AppError(
            status_code=503,
            code="DATABASE_UNAVAILABLE",
            message="Database is unavailable",
        ) from exc

    return ReadinessResponse()