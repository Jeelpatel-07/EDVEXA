from uuid import UUID

from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field
from sqlalchemy.exc import OperationalError

from app.core.errors import AppError
from app.db.session import get_db


def test_liveness_and_request_id(client):
    response = client.get("/api/health/live")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    UUID(response.headers["X-Request-ID"])
    assert response.headers["Cache-Control"] == "no-store"


def test_readiness_success_uses_dependency_override(app, client):
    class FakeSession:
        def execute(self, query):
            assert str(query) == "SELECT 1"
    app.dependency_overrides[get_db] = lambda: FakeSession()
    response = client.get("/api/health/ready")
    assert response.status_code == 200
    assert response.json()["database"] == "reachable"


def test_readiness_failure_has_no_database_secrets(app, client):
    class BrokenSession:
        def execute(self, query):
            raise OperationalError("SELECT 1", {}, Exception("secret-password"))
    app.dependency_overrides[get_db] = lambda: BrokenSession()
    response = client.get("/api/health/ready")
    assert response.status_code == 503
    assert response.json()["error"]["code"] == "DATABASE_UNAVAILABLE"
    assert "secret-password" not in response.text


def test_cors_allowed_and_disallowed(client):
    headers = {
        "Origin": "http://localhost:5173", "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "authorization,content-type,x-csrf-token",
    }
    response = client.options("/api/health/live", headers=headers)
    assert response.status_code == 200
    assert response.headers["Access-Control-Allow-Origin"] == "http://localhost:5173"
    assert response.headers["Access-Control-Allow-Credentials"] == "true"
    headers["Origin"] = "https://untrusted.test"
    response = client.options("/api/health/live", headers=headers)
    assert response.status_code == 400
    assert "Access-Control-Allow-Origin" not in response.headers


def test_not_found_has_shared_error_format(client):
    response = client.get("/api/unknown")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"
    assert response.json()["request_id"] == response.headers["X-Request-ID"]


def test_validation_does_not_echo_submitted_secret(app, client):
    class Input(BaseModel):
        password: str = Field(min_length=100)
    @app.post("/test-validation")
    def validate(body: Input):
        return {"ok": True}
    response = client.post("/test-validation", json={"password": "private-password"})
    assert response.status_code == 422
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"
    assert "private-password" not in response.text
    assert "input" not in response.text


def test_application_error_headers(app, client):
    @app.get("/test-limit")
    def limited():
        raise AppError(429, "RATE_LIMITED", "Try later", headers={"Retry-After": "10"})
    response = client.get("/test-limit")
    assert response.status_code == 429
    assert response.headers["Retry-After"] == "10"


def test_http_exception_keeps_authenticate_header(app, client):
    @app.get("/test-auth")
    def auth():
        raise HTTPException(401, "Login required", headers={"WWW-Authenticate": "Bearer"})
    response = client.get("/test-auth")
    assert response.headers["WWW-Authenticate"] == "Bearer"
    assert response.json()["error"]["code"] == "UNAUTHENTICATED"


def test_unhandled_failure_does_not_expose_secret(app):
    @app.get("/test-failure")
    def failed():
        raise RuntimeError("database-secret")
    with TestClient(app, raise_server_exceptions=False) as client:
        response = client.get("/test-failure")
    assert response.status_code == 500
    assert response.json()["error"]["code"] == "INTERNAL_ERROR"
    assert "database-secret" not in response.text
    assert response.json()["request_id"] == response.headers["X-Request-ID"]


def test_openapi_documents_foundation(client):
    schema = client.get("/openapi.json").json()
    assert "/api/health/live" in schema["paths"]
    assert "/api/health/ready" in schema["paths"]
