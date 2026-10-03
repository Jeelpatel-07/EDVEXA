from typing import Annotated

from fastapi import APIRouter, Depends, Request
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.errors import AppError, ErrorResponse
from app.core.rate_limits import client_ip, enforce_rate_limit
from app.db.session import get_db
from app.modules.accounts import service
from app.modules.accounts.schemas import (
    EmailRequest,
    MessageResponse,
    RegisterRequest,
    ResetPasswordRequest,
    TokenRequest,
)

router = APIRouter(
    prefix="/auth",
    tags=["Accounts"],
    responses={
        400: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
DbSession = Annotated[Session, Depends(get_db)]

ACCEPTED = "If this request is eligible, an email with next steps will be sent."


def limit_ip(scope: str, limit: int):
    def dependency(request: Request) -> None:
        enforce_rate_limit(
            request,
            scope=scope,
            subject=client_ip(request),
            limit=limit,
            window_seconds=900,
        )

    return dependency


def limit_email(request: Request, email: str, scope: str) -> None:
    enforce_rate_limit(
        request,
        scope=scope,
        subject=email,
        limit=3,
        window_seconds=900,
    )


def unavailable(exc: SQLAlchemyError) -> AppError:
    return AppError(503, "DATABASE_UNAVAILABLE", "Account service is temporarily unavailable")


@router.post(
    "/register",
    response_model=MessageResponse,
    status_code=202,
    dependencies=[Depends(limit_ip("register-ip", 10))],
)
def register(data: RegisterRequest, request: Request, db: DbSession) -> MessageResponse:
    limit_email(request, str(data.email), "register-email")
    try:
        with db.begin():
            service.register(db, data, request.app.state.settings)
    except SQLAlchemyError as exc:
        raise unavailable(exc) from exc
    return MessageResponse(message=ACCEPTED)


@router.post(
    "/verify-email",
    response_model=MessageResponse,
    dependencies=[Depends(limit_ip("verify-ip", 20))],
)
def verify_email(data: TokenRequest, db: DbSession) -> MessageResponse:
    try:
        with db.begin():
            service.verify_email(db, data.token.get_secret_value())
    except SQLAlchemyError as exc:
        raise unavailable(exc) from exc
    return MessageResponse(message="Email verified successfully")


@router.post(
    "/resend-verification",
    response_model=MessageResponse,
    status_code=202,
    dependencies=[Depends(limit_ip("resend-ip", 10))],
)
def resend_verification(data: EmailRequest, request: Request, db: DbSession) -> MessageResponse:
    limit_email(request, str(data.email), "resend-email")
    try:
        with db.begin():
            service.resend_verification(db, str(data.email), request.app.state.settings)
    except SQLAlchemyError as exc:
        raise unavailable(exc) from exc
    return MessageResponse(message=ACCEPTED)


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    status_code=202,
    dependencies=[Depends(limit_ip("forgot-ip", 10))],
)
def forgot_password(data: EmailRequest, request: Request, db: DbSession) -> MessageResponse:
    limit_email(request, str(data.email), "forgot-email")
    try:
        with db.begin():
            service.forgot_password(db, str(data.email), request.app.state.settings)
    except SQLAlchemyError as exc:
        raise unavailable(exc) from exc
    return MessageResponse(message=ACCEPTED)


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    dependencies=[Depends(limit_ip("reset-ip", 20))],
)
def reset_password(data: ResetPasswordRequest, request: Request, db: DbSession) -> MessageResponse:
    try:
        with db.begin():
            service.reset_password(
                db,
                data.token.get_secret_value(),
                data.new_password.get_secret_value(),
                revoke_sessions=getattr(request.app.state, "revoke_user_sessions", None),
            )
    except SQLAlchemyError as exc:
        raise unavailable(exc) from exc
    return MessageResponse(message="Password reset successfully")
