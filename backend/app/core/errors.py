import logging
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from starlette.exceptions import HTTPException

logger = logging.getLogger("edvexa.errors")


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: list[dict[str, Any]] | None = None


class ErrorResponse(BaseModel):
    error: ErrorDetail
    request_id: str | None = None


class AppError(Exception):
    """An expected application failure with a safe public message."""

    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        *,
        headers: dict[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.headers = headers


def error_response(
    request: Request,
    status: int,
    code: str,
    message: str,
    *,
    details: list[dict[str, Any]] | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    request_id = getattr(request.state, "request_id", None)

    payload = ErrorResponse(
        error=ErrorDetail(
            code=code,
            message=message,
            details=details,
        ),
        request_id=request_id,
    )

    response_headers = dict(headers or {})

    if request_id:
        response_headers["X-Request-ID"] = request_id

    return JSONResponse(
        status_code=status,
        content=payload.model_dump(exclude_none=True),
        headers=response_headers,
    )


def register_error_handlers(app: FastAPI) -> None:
    """Register handlers when the FastAPI application is created."""

    @app.exception_handler(AppError)
    async def app_error_handler(
        request: Request,
        exc: AppError,
    ) -> JSONResponse:
        return error_response(
            request,
            exc.status_code,
            exc.code,
            exc.message,
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        # Do not include input, ctx, or raw validation messages.
        # They can contain passwords, tokens, or other submitted data.
        details = [
            {
                "location": list(error["loc"]),
                "type": error["type"],
            }
            for error in exc.errors()
        ]

        return error_response(
            request,
            422,
            "VALIDATION_ERROR",
            "Request validation failed",
            details=details,
        )

    @app.exception_handler(HTTPException)
    async def http_error_handler(
        request: Request,
        exc: HTTPException,
    ) -> JSONResponse:
        codes = {
            401: "UNAUTHENTICATED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            405: "METHOD_NOT_ALLOWED",
            409: "CONFLICT",
        }

        message = exc.detail if isinstance(exc.detail, str) else "Request failed"

        return error_response(
            request,
            exc.status_code,
            codes.get(exc.status_code, "HTTP_ERROR"),
            message,
            headers=exc.headers,
        )

    @app.exception_handler(IntegrityError)
    async def conflict_handler(request: Request, exc: IntegrityError) -> JSONResponse:
        return error_response(
            request, 409, "CONFLICT", "This operation conflicts with an existing record"
        )

    @app.exception_handler(SQLAlchemyError)
    async def database_handler(request: Request, exc: SQLAlchemyError) -> JSONResponse:
        return error_response(
            request, 503, "DATABASE_UNAVAILABLE", "Database service is temporarily unavailable"
        )

    @app.exception_handler(Exception)
    async def unexpected_error_handler(
        request: Request,
        exc: Exception,
    ) -> JSONResponse:
        # Raw exception strings may contain database credentials.
        logger.error(
            "Unhandled exception type=%s request_id=%s",
            type(exc).__name__,
            getattr(request.state, "request_id", None),
        )

        return error_response(
            request,
            500,
            "INTERNAL_ERROR",
            "An unexpected error occurred",
        )
