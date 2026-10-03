from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.core.errors import AppError
from app.core.security import generate_opaque_token, hash_opaque_token, hash_password
from app.modules.accounts.email import queue_auth_email
from app.modules.accounts.models import AuthEmail, EmailVerificationToken, PasswordResetToken, User
from app.modules.accounts.schemas import RegisterRequest

SessionRevoker = Callable[[Session, UUID], None]
TokenModel = type[EmailVerificationToken] | type[PasswordResetToken]


def utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def cancel_pending_emails(db: Session, user_id: UUID, kind: str, now: datetime) -> None:
    db.execute(
        update(AuthEmail)
        .where(
            AuthEmail.user_id == user_id,
            AuthEmail.kind == kind,
            AuthEmail.sent_at.is_(None),
            AuthEmail.cancelled_at.is_(None),
        )
        .values(cancelled_at=now, encrypted_payload=None),
        execution_options={"synchronize_session": False},
    )


def invalidate_tokens(db: Session, model: TokenModel, user_id: UUID, now: datetime) -> None:
    db.execute(
        update(model)
        .where(model.user_id == user_id, model.consumed_at.is_(None))
        .values(consumed_at=now),
        execution_options={"synchronize_session": False},
    )


def issue_token(db: Session, user: User, settings: Settings, *, kind: str) -> None:
    now = datetime.now(UTC)
    model = EmailVerificationToken if kind == "VERIFY_EMAIL" else PasswordResetToken
    lifetime = (
        timedelta(hours=settings.email_verification_hours)
        if kind == "VERIFY_EMAIL"
        else timedelta(minutes=settings.password_reset_minutes)
    )
    invalidate_tokens(db, model, user.id, now)
    cancel_pending_emails(db, user.id, kind, now)
    raw_token = generate_opaque_token()
    expiry = now + lifetime
    db.add(model(user_id=user.id, token_hash=hash_opaque_token(raw_token), expires_at=expiry))
    queue_auth_email(
        db,
        settings,
        user_id=user.id,
        email=user.email,
        kind=kind,
        token=raw_token,
        expires_at=expiry,
    )


def register(db: Session, data: RegisterRequest, settings: Settings) -> None:
    """Caller owns the transaction. Duplicate email returns the same public response."""
    from app.modules.access.service import validate_registration

    # Validate organization inputs before checking identity, keeping duplicate-email
    # responses independent of join-code validity.
    validate_registration(db, data)
    password_hash = hash_password(data.password.get_secret_value())
    if db.scalar(select(User.id).where(User.email == str(data.email))) is not None:
        return
    user = User(full_name=data.full_name, email=str(data.email), password_hash=password_hash)
    try:
        # A SAVEPOINT contains concurrent duplicate-email failures without aborting
        # the caller's transaction or overwriting the existing account.
        with db.begin_nested():
            db.add(user)
            db.flush()
    except IntegrityError:
        if db.scalar(select(User.id).where(User.email == str(data.email))) is not None:
            return
        raise
    from app.modules.access.service import registration_join

    registration_join(db, user, data)
    issue_token(db, user, settings, kind="VERIFY_EMAIL")


def resend_verification(db: Session, email: str, settings: Settings) -> None:
    user = db.scalar(select(User).where(User.email == email).with_for_update())
    if user is not None and user.status == "PENDING_VERIFICATION":
        issue_token(db, user, settings, kind="VERIFY_EMAIL")


def forgot_password(db: Session, email: str, settings: Settings) -> None:
    user = db.scalar(select(User).where(User.email == email).with_for_update())
    if user is not None and user.status == "ACTIVE" and user.email_verified_at is not None:
        issue_token(db, user, settings, kind="RESET_PASSWORD")


def lock_valid_token(db: Session, model: TokenModel, raw_token: str):
    """Lock user before token consistently to serialize resend/verify/reset."""
    digest = hash_opaque_token(raw_token)
    user_id = db.scalar(select(model.user_id).where(model.token_hash == digest))
    if user_id is None:
        raise AppError(400, "INVALID_TOKEN", "This link is invalid or expired")
    user = db.scalar(select(User).where(User.id == user_id).with_for_update())
    token = db.scalar(select(model).where(model.token_hash == digest).with_for_update())
    if (
        user is None
        or token is None
        or token.consumed_at is not None
        or utc(token.expires_at) <= datetime.now(UTC)
    ):
        raise AppError(400, "INVALID_TOKEN", "This link is invalid or expired")
    return user, token


def verify_email(db: Session, raw_token: str) -> None:
    user, token = lock_valid_token(db, EmailVerificationToken, raw_token)
    if user.status != "PENDING_VERIFICATION":
        raise AppError(400, "INVALID_TOKEN", "This link is invalid or expired")
    now = datetime.now(UTC)
    token.consumed_at = now
    user.status = "ACTIVE"
    user.email_verified_at = now
    invalidate_tokens(db, EmailVerificationToken, user.id, now)
    cancel_pending_emails(db, user.id, "VERIFY_EMAIL", now)


def reset_password(
    db: Session,
    raw_token: str,
    new_password: str,
    *,
    revoke_sessions: SessionRevoker | None = None,
) -> None:
    user, token = lock_valid_token(db, PasswordResetToken, raw_token)
    if user.status != "ACTIVE" or user.email_verified_at is None:
        raise AppError(400, "INVALID_TOKEN", "This link is invalid or expired")
    now = datetime.now(UTC)
    user.password_hash = hash_password(new_password)
    user.credential_version += 1
    token.consumed_at = now
    invalidate_tokens(db, PasswordResetToken, user.id, now)
    cancel_pending_emails(db, user.id, "RESET_PASSWORD", now)
    # Part 3 registers revoke_user_sessions on app.state; it must not commit.
    # Even without a callback, credential_version changes atomically with the hash.
    if revoke_sessions is not None:
        revoke_sessions(db, user.id)
