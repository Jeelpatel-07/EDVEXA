import hashlib
import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import jwt
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError
from pydantic import BaseModel, ConfigDict, ValidationError

from app.core.config import Settings, get_settings

password_hasher = PasswordHash.recommended()


class InvalidAccessToken(ValueError):
    """Token is malformed, expired, or intended for another recipient."""


class AccessTokenClaims(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sub: UUID
    sid: UUID
    jti: UUID
    iat: int
    exp: int
    iss: str
    aud: str
    token_type: str


def hash_password(password: str) -> str:
    """Hash a password using Argon2id."""
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Return whether a password matches its stored hash."""
    try:
        return password_hasher.verify(password, password_hash)
    except (UnknownHashError, ValueError):
        return False


def password_needs_rehash(password_hash: str) -> bool:
    """Call after successful verification to check for outdated parameters."""
    return password_hasher.current_hasher.check_needs_rehash(
        password_hash
    )


def generate_opaque_token() -> str:
    """Generate a refresh, verification, or reset token. Never log it."""
    return secrets.token_urlsafe(32)


def hash_opaque_token(token: str) -> str:
    """Hash random tokens for storage. Never use this for passwords."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_access_token(
    user_id: UUID,
    session_id: UUID,
    *,
    settings: Settings | None = None,
) -> str:
    config = settings or get_settings()
    now = datetime.now(UTC)

    payload = {
        "sub": str(user_id),
        "sid": str(session_id),
        "jti": str(uuid4()),
        "iat": now,
        "exp": now + timedelta(
            minutes=config.access_token_minutes
        ),
        "iss": config.jwt_issuer,
        "aud": config.jwt_audience,
        "token_type": "access",
    }

    return jwt.encode(
        payload,
        config.jwt_secret_key.get_secret_value(),
        algorithm="HS256",
    )


def decode_access_token(
    token: str,
    *,
    settings: Settings | None = None,
) -> AccessTokenClaims:
    config = settings or get_settings()

    try:
        payload = jwt.decode(
            token,
            config.jwt_secret_key.get_secret_value(),
            algorithms=["HS256"],
            issuer=config.jwt_issuer,
            audience=config.jwt_audience,
            options={
                "require": [
                    "sub",
                    "sid",
                    "jti",
                    "iat",
                    "exp",
                    "iss",
                    "aud",
                    "token_type",
                ]
            },
        )

        claims = AccessTokenClaims.model_validate(payload)

        if claims.token_type != "access":
            raise InvalidAccessToken("Invalid token type")

        if claims.exp <= claims.iat:
            raise InvalidAccessToken("Invalid token lifetime")

        return claims

    except (
        jwt.InvalidTokenError,
        ValidationError,
        TypeError,
        ValueError,
    ) as exc:
        raise InvalidAccessToken(
            "Invalid or expired access token"
        ) from exc