from dataclasses import dataclass
from typing import Annotated
from urllib.parse import urlsplit

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.security import InvalidAccessToken, decode_access_token
from app.db.session import get_db
from app.modules.accounts.models import User
from app.modules.sessions.models import AuthSession
from app.modules.sessions.service import session_is_valid, unauthenticated

bearer = HTTPBearer(auto_error=False)


@dataclass
class AuthContext:
    user: User
    session: AuthSession


def require_trusted_origin(request: Request) -> None:
    """Protect cookie routes, login CSRF and the CSRF bootstrap endpoint."""
    config = request.app.state.settings
    origin = request.headers.get("origin")
    if origin is None:
        referer = request.headers.get("referer")
        if not referer:
            raise AppError(403, "ORIGIN_REQUIRED", "An Origin or Referer header is required")
        parsed = urlsplit(referer)
        origin = f"{parsed.scheme}://{parsed.netloc}"
    else:
        parsed = urlsplit(origin)
        if parsed.path or parsed.query or parsed.fragment or parsed.username or parsed.password:
            raise AppError(403, "ORIGIN_DENIED", "Request origin is not allowed")
    # Same-origin Swagger is supported. Configure proxy scheme/Host accurately.
    api_origin = f"{request.url.scheme}://{request.url.netloc}"
    if origin not in {*config.cors_origins, api_origin}:
        raise AppError(403, "ORIGIN_DENIED", "Request origin is not allowed")


def get_auth_context(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Annotated[Session, Depends(get_db)],
) -> AuthContext:
    if credentials is None or len(credentials.credentials) > 4096:
        raise unauthenticated()
    try:
        claims = decode_access_token(credentials.credentials, settings=request.app.state.settings)
    except InvalidAccessToken as exc:
        raise unauthenticated() from exc
    try:
        row = db.execute(
            select(User, AuthSession)
            .join(AuthSession, AuthSession.user_id == User.id)
            .where(User.id == claims.sub, AuthSession.id == claims.sid)
        ).first()
    except SQLAlchemyError as exc:
        raise AppError(
            503, "DATABASE_UNAVAILABLE", "Authentication is temporarily unavailable"
        ) from exc
    if row is None or not session_is_valid(row[0], row[1]):
        raise unauthenticated()
    return AuthContext(row[0], row[1])


def get_current_user(context: Annotated[AuthContext, Depends(get_auth_context)]) -> User:
    """Export for Part 4. Every request checks the live user and session."""
    return context.user
