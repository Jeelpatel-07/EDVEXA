import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import create_app


@pytest.fixture
def settings() -> Settings:
    return Settings(
        _env_file=None, environment="test",
        database_url="postgresql+psycopg://test:test@localhost:5432/edvexa_test",
        jwt_secret_key="test-only-key-" + "x" * 40,
        rate_limit_backend="memory", cors_origins=["http://localhost:5173"],
    )


@pytest.fixture
def app(settings):
    return create_app(settings)


@pytest.fixture
def client(app):
    with TestClient(app) as test_client:
        yield test_client
