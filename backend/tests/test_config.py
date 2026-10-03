import base64

import pytest
from pydantic import ValidationError

from app.core.config import Settings


def make_settings(**overrides):
    values = {
        "_env_file": None,
        "database_url": "postgresql+psycopg://test:secret@localhost:5432/test",
        "jwt_secret_key": "a" * 48,
    }
    values.update(overrides)
    return Settings(**values)


@pytest.mark.parametrize(
    "secret", ["short", "replace-with-a-random-secret-of-at-least-32-characters"]
)
def test_reject_placeholder_and_short_secret(secret):
    with pytest.raises(ValidationError):
        make_settings(jwt_secret_key=secret)


@pytest.mark.parametrize("url", ["sqlite:///test.db", "postgresql://u:p@host/db", "not-a-url"])
def test_require_postgres_psycopg(url):
    with pytest.raises(ValidationError):
        make_settings(database_url=url)


@pytest.mark.parametrize("origin", ["*", "https://app.test/", "https://app.test/path"])
def test_reject_unsafe_cors_origin(origin):
    with pytest.raises(ValidationError):
        make_settings(cors_origins=[origin])


def test_production_requires_secure_cookie_and_shared_limiter():
    with pytest.raises(ValidationError):
        make_settings(environment="production")
    config = make_settings(
        environment="production",
        refresh_cookie_secure=True,
        rate_limit_backend="redis",
        cors_origins=["https://app.test"],
        frontend_base_url="https://app.test",
        auth_email_encryption_key=base64.urlsafe_b64encode(b"k" * 32).decode(),
    )
    assert config.refresh_cookie_secure


def test_samesite_none_requires_secure():
    with pytest.raises(ValidationError):
        make_settings(refresh_cookie_samesite="none")


def test_credentials_hidden_in_representation():
    config = make_settings()
    assert "test:secret@" not in repr(config)
    assert "a" * 48 not in repr(config)
