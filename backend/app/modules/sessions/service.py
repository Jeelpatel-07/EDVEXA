import base64
import hashlib
import hmac
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import AppError
from app.core.security import (
    generate_opaque_token,
    hash_opaque_token,
    hash_password,
    password_needs_rehash,
    verify_password,
)
from app.modules.accounts.models import User
from app.modules.accounts.service import utc
from app.modules.sessions.models import AuthSession, RefreshToken

# Unknown accounts still execute Argon2 verification.
DUMMY_PASSWORD_HASH = hash_password("edvexa-dummy-password-not-a-login")


@dataclass
class SessionTokens:
    user: User
    session: AuthSession
    raw_refresh_token: str


@dataclass
class RefreshResult:
    tokens: SessionTokens | None = None
    error: AppError | None = None


def unauthenticated(message: str = "Please sign in again") -> AppError:
    return AppError(401, "UNAUTHENTICATED", message, headers={"WWW-Authenticate": "Bearer"})


def csrf_token(session_id: UUID, settings: Settings) -> str:
    signature = hmac.new(
        settings.jwt_secret_key.get_secret_value().encode(),
        f"edvexa:csrf:v1:{session_id}".encode(),
        hashlib.sha256,
    ).digest()
    return base64.urlsafe_b64encode(signature).decode().rstrip("=")


def check_csrf(session: AuthSession, supplied: str | None, settings: Settings) -> None:
    if (
        not supplied
        or len(supplied) > 128
        or not secrets.compare_digest(supplied.encode(), csrf_token(session.id, settings).encode())
    ):
        raise AppError(403, "CSRF_FAILED", "A valid CSRF token is required")


def revoke_session(db: Session, session_id: UUID, *, reason: str = "LOGOUT") -> None:
    """Caller owns transaction; never commit here."""
    db.execute(
        update(AuthSession)
        .where(AuthSession.id == session_id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC), revoke_reason=reason),
        execution_options={"synchronize_session": False},
    )


def revoke_user_sessions(db: Session, user_id: UUID) -> None:
    """Part 2 reset calls this inside the password-change transaction."""
    db.execute(
        update(AuthSession)
        .where(AuthSession.user_id == user_id, AuthSession.revoked_at.is_(None))
        .values(revoked_at=datetime.now(UTC), revoke_reason="ALL_SESSIONS_REVOKED"),
        execution_options={"synchronize_session": False},
    )


def login(db: Session, email: str, password: str, settings: Settings) -> SessionTokens:
    user = db.scalar(select(User).where(User.email == email).with_for_update())
    valid_password = verify_password(
        password, user.password_hash if user is not None else DUMMY_PASSWORD_HASH
    )
    if user is None or not valid_password:
        raise unauthenticated("Invalid email or password")
    if user.status == "PENDING_VERIFICATION" or user.email_verified_at is None:
        raise AppError(403, "EMAIL_NOT_VERIFIED", "Verify your email before signing in")
    if user.status != "ACTIVE":
        raise AppError(403, "ACCOUNT_INACTIVE", "This account cannot sign in")
    if password_needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)
    now = datetime.now(UTC)
    session = AuthSession(
        user_id=user.id,
        credential_version=user.credential_version,
        expires_at=now + timedelta(days=settings.refresh_token_days),
        last_used_at=now,
    )
    db.add(session)
    db.flush()
    raw = generate_opaque_token()
    db.add(
        RefreshToken(
            session_id=session.id, token_hash=hash_opaque_token(raw), expires_at=session.expires_at
        )
    )
    db.flush()
    return SessionTokens(user, session, raw)


def lock_refresh(db: Session, raw_token: str):
    """Use the same user -> session -> token lock order as reset and logout-all."""
    reference = db.execute(
        select(RefreshToken.session_id, AuthSession.user_id)
        .join(AuthSession, RefreshToken.session_id == AuthSession.id)
        .where(RefreshToken.token_hash == hash_opaque_token(raw_token))
    ).first()
    if reference is None:
        return None
    user = db.scalar(select(User).where(User.id == reference.user_id).with_for_update())
    session = db.scalar(
        select(AuthSession).where(AuthSession.id == reference.session_id).with_for_update()
    )
    token = db.scalar(
        select(RefreshToken)
        .where(RefreshToken.token_hash == hash_opaque_token(raw_token))
        .with_for_update()
    )
    if user is None or session is None or token is None:
        return None
    return user, session, token


def session_is_valid(user: User, session: AuthSession) -> bool:
    return (
        user.status == "ACTIVE"
        and user.email_verified_at is not None
        and session.revoked_at is None
        and utc(session.expires_at) > datetime.now(UTC)
        and session.credential_version == user.credential_version
    )


def rotate_refresh(
    db: Session,
    raw_token: str | None,
    supplied_csrf: str | None,
    settings: Settings,
) -> RefreshResult:
    if not raw_token:
        return RefreshResult(error=unauthenticated())
    locked = lock_refresh(db, raw_token)
    if locked is None:
        return RefreshResult(error=unauthenticated())
    user, session, token = locked
    check_csrf(session, supplied_csrf, settings)
    if token.consumed_at is not None:
        revoke_session(db, session.id, reason="REFRESH_REUSE")
        # Return instead of raising: caller must COMMIT this revocation before 401.
        return RefreshResult(error=unauthenticated())
    if not session_is_valid(user, session) or utc(token.expires_at) <= datetime.now(UTC):
        revoke_session(db, session.id, reason="SESSION_INVALID")
        return RefreshResult(error=unauthenticated())
    now = datetime.now(UTC)
    token.consumed_at = now
    session.last_used_at = now
    raw = generate_opaque_token()
    db.add(
        RefreshToken(
            session_id=session.id,
            token_hash=hash_opaque_token(raw),
            expires_at=session.expires_at,
            parent_id=token.id,
        )
    )
    db.flush()
    return RefreshResult(tokens=SessionTokens(user, session, raw))


def csrf_for_refresh(db: Session, raw_token: str | None, settings: Settings) -> str:
    if not raw_token:
        raise unauthenticated()
    row = db.execute(
        select(User, AuthSession, RefreshToken)
        .join(AuthSession, AuthSession.user_id == User.id)
        .join(RefreshToken, RefreshToken.session_id == AuthSession.id)
        .where(RefreshToken.token_hash == hash_opaque_token(raw_token))
    ).first()
    if row is None:
        raise unauthenticated()
    user, session, token = row
    if (
        not session_is_valid(user, session)
        or token.consumed_at is not None
        or utc(token.expires_at) <= datetime.now(UTC)
    ):
        raise unauthenticated()
    return csrf_token(session.id, settings)


def logout(
    db: Session,
    raw_token: str | None,
    supplied_csrf: str | None,
    settings: Settings,
) -> None:
    if not raw_token:
        return
    locked = lock_refresh(db, raw_token)
    if locked is None:
        return
    _, session, _ = locked
    check_csrf(session, supplied_csrf, settings)
    revoke_session(db, session.id)


def logout_all(db: Session, user_id: UUID) -> None:
    # Serialize with reset, login and refresh so no pre-logout session survives.
    db.scalar(select(User).where(User.id == user_id).with_for_update())
    revoke_user_sessions(db, user_id)
