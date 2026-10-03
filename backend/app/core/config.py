import base64
import binascii
from functools import lru_cache
from pathlib import Path
from typing import Literal
from urllib.parse import urlsplit

from pydantic import (
    EmailStr,
    Field,
    SecretStr,
    field_validator,
    model_validator,
)
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Application configuration loaded from environment variables and .env."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    environment: Literal[
        "development",
        "test",
        "production",
    ] = "development"

    app_name: str = "EDVEXA API"

    database_url: SecretStr
    jwt_secret_key: SecretStr

    jwt_issuer: str = "edvexa-api"
    jwt_audience: str = "edvexa-web"

    access_token_minutes: int = Field(
        default=15,
        ge=1,
        le=60,
    )

    refresh_token_days: int = Field(
        default=30,
        ge=1,
        le=90,
    )

    password_reset_minutes: int = Field(
        default=60,
        ge=1,
        le=60,
    )

    email_verification_hours: int = Field(
        default=24,
        ge=1,
        le=72,
    )

    db_pool_size: int = Field(
        default=5,
        ge=1,
        le=50,
    )

    db_max_overflow: int = Field(
        default=5,
        ge=0,
        le=50,
    )

    db_connect_timeout_seconds: int = Field(
        default=5,
        ge=1,
        le=30,
    )

    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:5173"],
    )

    refresh_cookie_name: str = "edvexa_refresh"
    refresh_cookie_path: str = "/api/auth"
    refresh_cookie_secure: bool = False

    refresh_cookie_samesite: Literal[
        "lax",
        "strict",
        "none",
    ] = "lax"

    rate_limit_backend: Literal[
        "memory",
        "redis",
    ] = "memory"

    redis_url: SecretStr = SecretStr(
        "redis://localhost:6379/0",
    )

    rate_limit_prefix: str = "edvexa"

    frontend_base_url: str = "http://localhost:5173"
    auth_email_encryption_key: SecretStr | None = None
    auth_email_max_attempts: int = Field(default=5, ge=1, le=10)
    smtp_host: str | None = None
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_security: Literal["starttls", "ssl", "plain"] = "starttls"
    smtp_username: str | None = None
    smtp_password: SecretStr = SecretStr("")
    smtp_from_email: EmailStr = "no-reply@edvexa.example"
    smtp_timeout_seconds: int = Field(default=10, ge=1, le=30)

    @field_validator("frontend_base_url")
    @classmethod
    def validate_frontend_url(cls, value: str) -> str:
        parsed = urlsplit(value)
        if (
            parsed.scheme not in {"http", "https"}
            or not parsed.netloc
            or parsed.query
            or parsed.fragment
            or parsed.username
            or parsed.password
        ):
            raise ValueError(
                "FRONTEND_BASE_URL must be an HTTP(S) URL without credentials or query"
            )
        return value.rstrip("/")

    @field_validator("auth_email_encryption_key")
    @classmethod
    def validate_email_key(cls, value: SecretStr | None) -> SecretStr | None:
        if value is None:
            return None
        try:
            raw = base64.b64decode(
                value.get_secret_value().encode("ascii"), altchars=b"-_", validate=True
            )
        except (binascii.Error, UnicodeEncodeError) as exc:
            raise ValueError("AUTH_EMAIL_ENCRYPTION_KEY must be a valid Fernet key") from exc
        if len(raw) != 32:
            raise ValueError("AUTH_EMAIL_ENCRYPTION_KEY must decode to 32 bytes")
        return value

    @field_validator("jwt_secret_key")
    @classmethod
    def validate_jwt_secret(
        cls,
        value: SecretStr,
    ) -> SecretStr:
        secret = value.get_secret_value()

        if len(secret.encode("utf-8")) < 32 or secret.lower().startswith("replace"):
            raise ValueError("JWT_SECRET_KEY must be a generated secret of at least 32 bytes")

        return value

    @field_validator("database_url")
    @classmethod
    def validate_database_url(
        cls,
        value: SecretStr,
    ) -> SecretStr:
        try:
            url = make_url(value.get_secret_value())
        except ArgumentError as exc:
            raise ValueError("DATABASE_URL must be a valid SQLAlchemy URL") from exc

        if url.drivername != "postgresql+psycopg" or not url.database:
            raise ValueError("DATABASE_URL must use postgresql+psycopg and name a database")

        return value

    @field_validator("cors_origins")
    @classmethod
    def validate_origins(
        cls,
        values: list[str],
    ) -> list[str]:
        for value in values:
            origin = urlsplit(value)

            if (
                origin.scheme not in {"http", "https"}
                or not origin.netloc
                or origin.path
                or origin.query
                or origin.fragment
                or origin.username
                or origin.password
                or "*" in value
            ):
                raise ValueError("CORS origins must be exact HTTP(S) origins without a path")

        return values

    @model_validator(mode="after")
    def validate_production(self) -> "Settings":
        if self.refresh_cookie_samesite == "none" and not self.refresh_cookie_secure:
            raise ValueError("SameSite=none requires a secure cookie")

        if bool(self.smtp_username) != bool(self.smtp_password.get_secret_value()):
            raise ValueError("Configure both SMTP_USERNAME and SMTP_PASSWORD, or neither")

        if self.environment == "production":
            if not self.auth_email_encryption_key:
                raise ValueError("Production requires a separate AUTH_EMAIL_ENCRYPTION_KEY")
            if not self.frontend_base_url.startswith("https://"):
                raise ValueError("Production FRONTEND_BASE_URL must use HTTPS")
            if self.smtp_security == "plain":
                raise ValueError("Production SMTP must use TLS")
            if not self.refresh_cookie_secure:
                raise ValueError("Production requires REFRESH_COOKIE_SECURE=true")

            if self.rate_limit_backend != "redis":
                raise ValueError("Production requires a shared Redis rate limiter")

            if any(not origin.startswith("https://") for origin in self.cors_origins):
                raise ValueError("Production CORS origins must use HTTPS")

        return self


@lru_cache
def get_settings() -> Settings:
    """Load configuration once per process."""
    return Settings()
