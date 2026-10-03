import json
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import jwt
import pytest
from fastapi.testclient import TestClient
from pwdlib.hashers.argon2 import Argon2Hasher
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.pool import StaticPool

from app.core.security import hash_opaque_token, hash_password, password_needs_rehash
from app.db.base import Base
from app.db.model_registry import load_models
from app.db.session import build_session_factory, get_db
from app.modules.accounts.email import email_cipher
from app.modules.accounts.models import AuthEmail, User
from app.modules.sessions.models import AuthSession, RefreshToken

PASSWORD = "a strong test password"
ORIGIN = {"Origin": "http://localhost:5173"}


@pytest.fixture
def sessions(app):
    load_models()
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )

    @event.listens_for(engine, "connect")
    def sqlite_connect(connection, record):
        connection.isolation_level = None
        connection.execute("PRAGMA foreign_keys=ON")

    @event.listens_for(engine, "begin")
    def sqlite_begin(connection):
        connection.exec_driver_sql("BEGIN")

    Base.metadata.create_all(engine)
    factory = build_session_factory(engine)
    with factory.begin() as db:
        db.add(
            User(
                full_name="Student Person",
                email="student@example.com",
                password_hash=hash_password(PASSWORD),
                status="ACTIVE",
                email_verified_at=datetime.now(UTC),
            )
        )

    def override_db():
        with factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as client:
        yield client, factory
    app.dependency_overrides.clear()
    engine.dispose()


def login(client, email="student@example.com", password=PASSWORD, headers=None):
    return client.post(
        "/api/auth/login",
        json={
            "email": email,
            "password": password,
        },
        headers=ORIGIN if headers is None else headers,
    )


def bearer(data):
    return {"Authorization": f"Bearer {data['access_token']}"}


def cookie_headers(raw, data):
    return {
        **ORIGIN,
        "X-CSRF-Token": data["csrf_token"],
        "Cookie": f"edvexa_refresh={raw}",
    }


def test_login_profile_and_cookie_security(sessions):
    client, factory = sessions
    response = login(client, "STUDENT@example.com")
    assert response.status_code == 200
    data = response.json()
    assert data["expires_in"] == 900
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "student@example.com"
    assert "refresh_token" not in data
    assert PASSWORD not in response.text and "password_hash" not in response.text
    cookie = response.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie
    assert "path=/api/auth" in cookie
    raw = client.cookies.get("edvexa_refresh")
    with factory() as db:
        token = db.scalar(select(RefreshToken))
        assert token.token_hash == hash_opaque_token(raw)
        assert db.scalar(select(AuthSession)).credential_version == 1
    assert client.get("/api/auth/me", headers=bearer(data)).status_code == 200


@pytest.mark.parametrize(
    "email,password",
    [
        ("unknown@example.com", PASSWORD),
        ("student@example.com", "wrong-password"),
    ],
)
def test_invalid_login_is_generic(sessions, email, password):
    client, _ = sessions
    response = login(client, email, password)
    assert response.status_code == 401
    assert response.json()["error"]["message"] == "Invalid email or password"
    assert response.headers["WWW-Authenticate"] == "Bearer"


@pytest.mark.parametrize("status", ["PENDING_VERIFICATION", "SUSPENDED", "DEACTIVATED"])
def test_inactive_user_cannot_login(sessions, status):
    client, factory = sessions
    with factory.begin() as db:
        user = db.scalar(select(User))
        user.status = status
        if status == "PENDING_VERIFICATION":
            user.email_verified_at = None
    assert login(client).status_code == 403
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(AuthSession)) == 0


@pytest.mark.parametrize("headers", [{}, {"Origin": "https://evil.test"}, {"Origin": "null"}])
def test_login_origin_required_and_checked(sessions, headers):
    client, _ = sessions
    assert login(client, headers=headers).status_code == 403


def test_same_origin_swagger_referer_works(sessions):
    client, _ = sessions
    assert login(client, headers={"Referer": "http://testserver/docs"}).status_code == 200


def test_login_email_rate_limit(sessions):
    client, _ = sessions
    for _ in range(5):
        assert login(client, password="wrong-password").status_code == 401
    response = login(client)
    assert response.status_code == 429
    assert "Retry-After" in response.headers


def test_current_user_requires_bearer_not_cookie(sessions):
    client, _ = sessions
    login(client)
    assert client.get("/api/auth/me").status_code == 401
    assert (
        client.get("/api/auth/me", headers={"Authorization": "Bearer invalid"}).status_code == 401
    )


def test_refresh_rotates_hash_and_keeps_absolute_session_expiry(sessions):
    client, factory = sessions
    data = login(client).json()
    old = client.cookies.get("edvexa_refresh")
    response = client.post(
        "/api/auth/refresh",
        headers={
            **ORIGIN,
            "X-CSRF-Token": data["csrf_token"],
        },
    )
    assert response.status_code == 200
    new = client.cookies.get("edvexa_refresh")
    assert new != old
    with factory() as db:
        first = db.scalar(
            select(RefreshToken).where(RefreshToken.token_hash == hash_opaque_token(old))
        )
        second = db.scalar(
            select(RefreshToken).where(RefreshToken.token_hash == hash_opaque_token(new))
        )
        assert first.consumed_at is not None
        assert second.parent_id == first.id
        assert second.expires_at == first.expires_at
    assert client.get("/api/auth/me", headers=bearer(response.json())).status_code == 200


def test_refresh_reuse_commits_session_revocation(sessions):
    client, factory = sessions
    first = login(client).json()
    old = client.cookies.get("edvexa_refresh")
    newer = client.post("/api/auth/refresh", headers=cookie_headers(old, first)).json()
    new = client.cookies.get("edvexa_refresh")
    response = client.post("/api/auth/refresh", headers=cookie_headers(old, first))
    assert response.status_code == 401
    assert "max-age=0" in response.headers["set-cookie"].lower()
    with factory() as db:
        session = db.scalar(select(AuthSession))
        assert session.revoked_at is not None
        assert session.revoke_reason == "REFRESH_REUSE"
    assert client.get("/api/auth/me", headers=bearer(newer)).status_code == 401
    assert client.post("/api/auth/refresh", headers=cookie_headers(new, newer)).status_code == 401


def test_replay_does_not_revoke_other_session(sessions):
    client, factory = sessions
    first = login(client).json()
    old = client.cookies.get("edvexa_refresh")
    client.post("/api/auth/refresh", headers=cookie_headers(old, first))
    other = login(client).json()
    client.post("/api/auth/refresh", headers=cookie_headers(old, first))
    assert client.get("/api/auth/me", headers=bearer(other)).status_code == 200


@pytest.mark.parametrize(
    "headers",
    [
        ORIGIN,
        {**ORIGIN, "X-CSRF-Token": "invalid"},
        {"Origin": "https://evil.test", "X-CSRF-Token": "invalid"},
    ],
)
def test_refresh_rejects_bad_csrf_without_consuming_token(sessions, headers):
    client, factory = sessions
    login(client)
    assert client.post("/api/auth/refresh", headers=headers).status_code == 403
    with factory() as db:
        assert db.scalar(select(RefreshToken)).consumed_at is None
        assert db.scalar(select(AuthSession)).revoked_at is None


def test_refresh_without_cookie_is_401(sessions):
    client, _ = sessions
    assert client.post("/api/auth/refresh", headers=ORIGIN).status_code == 401


def test_unknown_refresh_is_rejected_and_cookie_cleared(sessions):
    client, _ = sessions
    response = client.post(
        "/api/auth/refresh",
        headers={
            **ORIGIN,
            "Cookie": "edvexa_refresh=" + "x" * 43,
        },
    )
    assert response.status_code == 401
    assert "max-age=0" in response.headers["set-cookie"].lower()


def test_csrf_bootstrap_after_page_reload(sessions):
    client, _ = sessions
    data = login(client).json()
    response = client.get("/api/auth/csrf", headers=ORIGIN)
    assert response.status_code == 200
    assert response.json()["csrf_token"] == data["csrf_token"]
    assert client.get("/api/auth/csrf", headers={"Origin": "https://evil.test"}).status_code == 403
    assert client.get("/api/auth/csrf").status_code == 403


def test_logout_revokes_access_and_refresh(sessions):
    client, factory = sessions
    data = login(client).json()
    raw = client.cookies.get("edvexa_refresh")
    response = client.post("/api/auth/logout", headers=cookie_headers(raw, data))
    assert response.status_code == 200
    assert "max-age=0" in response.headers["set-cookie"].lower()
    assert client.get("/api/auth/me", headers=bearer(data)).status_code == 401
    assert client.post("/api/auth/refresh", headers=cookie_headers(raw, data)).status_code == 401
    assert client.post("/api/auth/logout", headers=ORIGIN).status_code == 200


def test_logout_requires_csrf_when_cookie_present(sessions):
    client, factory = sessions
    data = login(client).json()
    assert client.post("/api/auth/logout", headers=ORIGIN).status_code == 403
    assert client.get("/api/auth/me", headers=bearer(data)).status_code == 200


def test_logout_all_revokes_all_own_sessions_only(sessions):
    client, factory = sessions
    first = login(client).json()
    second = login(client).json()
    with factory.begin() as db:
        db.add(
            User(
                full_name="Other Person",
                email="other@example.com",
                password_hash=hash_password(PASSWORD),
                status="ACTIVE",
                email_verified_at=datetime.now(UTC),
            )
        )
    other = login(client, "other@example.com").json()
    assert client.post("/api/auth/logout-all", headers=bearer(first)).status_code == 200
    assert client.get("/api/auth/me", headers=bearer(first)).status_code == 401
    assert client.get("/api/auth/me", headers=bearer(second)).status_code == 401
    assert client.get("/api/auth/me", headers=bearer(other)).status_code == 200


@pytest.mark.parametrize("change", ["suspend", "version", "expire"])
def test_live_state_checked_on_me_and_refresh(sessions, change):
    client, factory = sessions
    data = login(client).json()
    raw = client.cookies.get("edvexa_refresh")
    with factory.begin() as db:
        user = db.scalar(select(User))
        session = db.scalar(select(AuthSession))
        if change == "suspend":
            user.status = "SUSPENDED"
        elif change == "version":
            user.credential_version += 1
        else:
            session.expires_at = datetime.now(UTC) - timedelta(seconds=1)
    assert client.get("/api/auth/me", headers=bearer(data)).status_code == 401
    assert client.post("/api/auth/refresh", headers=cookie_headers(raw, data)).status_code == 401


def test_expired_access_token_is_rejected(sessions, settings):
    client, _ = sessions
    data = login(client).json()
    payload = jwt.decode(data["access_token"], options={"verify_signature": False})
    payload["exp"] = 1
    expired = jwt.encode(payload, settings.jwt_secret_key.get_secret_value(), algorithm="HS256")
    assert (
        client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired}"}).status_code
        == 401
    )


def test_token_user_cannot_claim_another_session(sessions, settings):
    client, _ = sessions
    data = login(client).json()
    payload = jwt.decode(data["access_token"], options={"verify_signature": False})
    payload["sub"] = str(uuid4())
    forged = jwt.encode(payload, settings.jwt_secret_key.get_secret_value(), algorithm="HS256")
    assert (
        client.get("/api/auth/me", headers={"Authorization": f"Bearer {forged}"}).status_code == 401
    )


def test_password_reset_revokes_all_sessions_and_old_credentials(sessions, settings):
    client, factory = sessions
    first = login(client).json()
    raw = client.cookies.get("edvexa_refresh")
    second = login(client).json()
    client.post("/api/auth/forgot-password", json={"email": "student@example.com"})
    with factory() as db:
        row = db.scalar(select(AuthEmail).where(AuthEmail.kind == "RESET_PASSWORD"))
        payload = json.loads(email_cipher(settings).decrypt(row.encrypted_payload.encode()))
        token = payload["body"].split("#token=")[1].splitlines()[0]
    assert (
        client.post(
            "/api/auth/reset-password",
            json={
                "token": token,
                "new_password": "a different strong password",
            },
        ).status_code
        == 200
    )
    with factory() as db:
        assert all(s.revoked_at is not None for s in db.scalars(select(AuthSession)))
    assert client.get("/api/auth/me", headers=bearer(first)).status_code == 401
    assert client.get("/api/auth/me", headers=bearer(second)).status_code == 401
    assert client.post("/api/auth/refresh", headers=cookie_headers(raw, first)).status_code == 401
    assert login(client).status_code == 401
    assert login(client, password="a different strong password").status_code == 200


def test_login_upgrades_outdated_password_hash(sessions):
    client, factory = sessions
    with factory.begin() as db:
        db.scalar(select(User)).password_hash = Argon2Hasher(
            time_cost=1, memory_cost=8192, parallelism=1
        ).hash(PASSWORD)
    assert login(client).status_code == 200
    with factory() as db:
        user = db.scalar(select(User))
        assert not password_needs_rehash(user.password_hash)
        assert user.credential_version == 1


def test_secure_cookie_setting(sessions, app):
    client, _ = sessions
    app.state.settings = app.state.settings.model_copy(update={"refresh_cookie_secure": True})
    assert "secure" in login(client).headers["set-cookie"].lower()


def test_session_migration_matches_models_and_downgrades():
    import importlib.util
    from pathlib import Path

    from alembic.autogenerate import compare_metadata
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    from sqlalchemy import inspect

    load_models()
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        context = MigrationContext.configure(connection)
        migrations = []
        for name in ["0001_accounts", "0002_sessions"]:
            path = Path(__file__).resolve().parents[1] / f"migrations/versions/{name}.py"
            spec = importlib.util.spec_from_file_location(name, path)
            migration = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(migration)
            migrations.append(migration)
            with Operations.context(context):
                migration.upgrade()
        from sqlalchemy import MetaData

        metadata = MetaData()
        for name in (
            "users",
            "email_verification_tokens",
            "password_reset_tokens",
            "auth_emails",
            "auth_sessions",
            "refresh_tokens",
        ):
            Base.metadata.tables[name].to_metadata(metadata)
        assert compare_metadata(context, metadata) == []
        with Operations.context(context):
            migrations[1].downgrade()
        assert "users" in inspect(connection).get_table_names()
        assert "auth_sessions" not in inspect(connection).get_table_names()
    engine.dispose()
