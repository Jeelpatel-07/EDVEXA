from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Header, Request, Response
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.errors import ErrorResponse, error_response
from app.core.rate_limits import client_ip, enforce_rate_limit
from app.core.security import create_access_token
from app.db.session import get_db
from app.modules.accounts.models import User
from app.modules.accounts.schemas import MessageResponse, UserRead
from app.modules.accounts.service import utc
from app.modules.sessions import service
from app.modules.sessions.dependencies import get_current_user, require_trusted_origin
from app.modules.sessions.schemas import CsrfResponse, LoginRequest, TokenResponse

router = APIRouter(
    prefix="/auth",
    tags=["Sessions"],
    responses={
        401: {"model": ErrorResponse},
        403: {"model": ErrorResponse},
        422: {"model": ErrorResponse},
        429: {"model": ErrorResponse},
        503: {"model": ErrorResponse},
    },
)
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]
CsrfHeader = Annotated[str | None, Header(alias="X-CSRF-Token")]


def limit_ip(scope: str, limit: int, window_seconds: int):
    def dependency(request: Request) -> None:
        enforce_rate_limit(
            request,
            scope=scope,
            subject=client_ip(request),
            limit=limit,
            window_seconds=window_seconds,
        )

    return dependency


def raw_refresh(request: Request) -> str | None:
    raw = request.cookies.get(request.app.state.settings.refresh_cookie_name)
    return raw if raw and len(raw) <= 128 else None


def clear_refresh_cookie(response: Response, request: Request) -> None:
    config = request.app.state.settings
    response.delete_cookie(
        config.refresh_cookie_name,
        path=config.refresh_cookie_path,
        secure=config.refresh_cookie_secure,
        httponly=True,
        samesite=config.refresh_cookie_samesite,
    )


def token_response(
    tokens: service.SessionTokens,
    request: Request,
    response: Response,
) -> TokenResponse:
    config = request.app.state.settings
    max_age = max(1, int((utc(tokens.session.expires_at) - datetime.now(UTC)).total_seconds()))
    response.set_cookie(
        key=config.refresh_cookie_name,
        value=tokens.raw_refresh_token,
        max_age=max_age,
        expires=utc(tokens.session.expires_at),
        path=config.refresh_cookie_path,
        httponly=True,
        secure=config.refresh_cookie_secure,
        samesite=config.refresh_cookie_samesite,
    )
    return TokenResponse(
        access_token=create_access_token(tokens.user.id, tokens.session.id, settings=config),
        expires_in=config.access_token_minutes * 60,
        csrf_token=service.csrf_token(tokens.session.id, config),
        user=UserRead.model_validate(tokens.user),
    )


def database_error(request: Request) -> JSONResponse:
    return error_response(
        request, 503, "DATABASE_UNAVAILABLE", "Session service is temporarily unavailable"
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(require_trusted_origin), Depends(limit_ip("login-ip", 10, 900))],
)
def login(
    data: LoginRequest,
    request: Request,
    response: Response,
    db: DbSession,
) -> TokenResponse | JSONResponse:
    enforce_rate_limit(
        request,
        scope="login-email",
        subject=str(data.email),
        limit=5,
        window_seconds=900,
    )
    try:
        with db.begin():
            tokens = service.login(
                db, str(data.email), data.password.get_secret_value(), request.app.state.settings
            )
    except SQLAlchemyError:
        return database_error(request)
    return token_response(tokens, request, response)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    dependencies=[Depends(require_trusted_origin), Depends(limit_ip("refresh-ip", 60, 60))],
)
def refresh(
    request: Request,
    response: Response,
    db: DbSession,
    csrf_header: CsrfHeader = None,
) -> TokenResponse | JSONResponse:
    try:
        with db.begin():
            result = service.rotate_refresh(
                db, raw_refresh(request), csrf_header, request.app.state.settings
            )
        # Invalidation/reuse revocation is committed before responding with an error.
    except SQLAlchemyError:
        return database_error(request)
    if result.error is not None:
        error = result.error
        reply = error_response(
            request, error.status_code, error.code, error.message, headers=error.headers
        )
        clear_refresh_cookie(reply, request)
        return reply
    return token_response(result.tokens, request, response)


@router.get(
    "/csrf",
    response_model=CsrfResponse,
    dependencies=[Depends(require_trusted_origin), Depends(limit_ip("csrf-ip", 60, 60))],
)
def csrf(request: Request, db: DbSession) -> CsrfResponse | JSONResponse:
    try:
        token = service.csrf_for_refresh(db, raw_refresh(request), request.app.state.settings)
    except SQLAlchemyError:
        return database_error(request)
    return CsrfResponse(csrf_token=token)


@router.post(
    "/logout",
    response_model=MessageResponse,
    dependencies=[Depends(require_trusted_origin), Depends(limit_ip("logout-ip", 30, 60))],
)
def logout(
    request: Request,
    response: Response,
    db: DbSession,
    csrf_header: CsrfHeader = None,
) -> MessageResponse | JSONResponse:
    try:
        with db.begin():
            service.logout(db, raw_refresh(request), csrf_header, request.app.state.settings)
    except SQLAlchemyError:
        return database_error(request)
    clear_refresh_cookie(response, request)
    return MessageResponse(message="Signed out")


@router.post("/logout-all", response_model=MessageResponse)
def logout_all(
    request: Request,
    response: Response,
    db: DbSession,
    user: CurrentUser,
) -> MessageResponse | JSONResponse:
    # Bearer authentication owns this action; cookies alone cannot authorize it.
    enforce_rate_limit(
        request, scope="logout-all-user", subject=str(user.id), limit=10, window_seconds=60
    )
    try:
        service.logout_all(db, user.id)
        db.commit()  # get_current_user already began this session's transaction.
    except SQLAlchemyError:
        db.rollback()
        return database_error(request)
    clear_refresh_cookie(response, request)
    return MessageResponse(message="Signed out from all sessions")


@router.get("/me", response_model=UserRead)
def me(user: CurrentUser) -> UserRead:
    return UserRead.model_validate(user)
