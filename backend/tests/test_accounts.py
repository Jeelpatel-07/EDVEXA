import json
import smtplib
from datetime import UTC, datetime, timedelta
from urllib.parse import unquote
from uuid import uuid4

import pytest
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, func, select
from sqlalchemy.exc import OperationalError
from sqlalchemy.pool import StaticPool

from app.core.errors import AppError
from app.core.security import hash_opaque_token, verify_password
from app.db.base import Base
from app.db.model_registry import load_models
from app.db.session import build_session_factory, get_db
from app.modules.accounts import service
from app.modules.accounts.email import deliver_pending_emails, email_cipher
from app.modules.accounts.models import AuthEmail, EmailVerificationToken, PasswordResetToken, User
from app.modules.accounts.schemas import RegisterRequest, UserRead

PASSWORD = "a strong test password"
NEW_PASSWORD = "a different strong password"


@pytest.fixture
def accounts(app):
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

    def override_db():
        with factory() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    with TestClient(app) as client:
        yield client, factory
    app.dependency_overrides.clear()
    engine.dispose()


def register(client, email="student@example.com"):
    return client.post(
        "/api/auth/register",
        json={
            "full_name": "Student Person",
            "email": email,
            "password": PASSWORD,
        },
    )


def latest_token(factory, settings, kind="VERIFY_EMAIL"):
    with factory() as db:
        row = db.scalar(
            select(AuthEmail)
            .where(
                AuthEmail.kind == kind,
                AuthEmail.cancelled_at.is_(None),
                AuthEmail.sent_at.is_(None),
            )
            .order_by(AuthEmail.created_at.desc())
        )
        payload = json.loads(email_cipher(settings).decrypt(row.encrypted_payload.encode()))
        return unquote(payload["body"].split("#token=")[1].splitlines()[0])


def active_account(accounts, settings):
    client, factory = accounts
    assert register(client).status_code == 202
    token = latest_token(factory, settings)
    assert client.post("/api/auth/verify-email", json={"token": token}).status_code == 200
    return client, factory


def test_registration_normalizes_email_and_hashes_password(accounts, settings):
    client, factory = accounts
    response = register(client, "Student@EXAMPLE.COM")
    assert response.status_code == 202
    assert PASSWORD not in response.text
    token = latest_token(factory, settings)
    with factory() as db:
        user = db.scalar(select(User))
        assert user.email == "student@example.com"
        assert user.status == "PENDING_VERIFICATION"
        assert user.password_hash.startswith("$argon2id$")
        assert verify_password(PASSWORD, user.password_hash)
        assert "password_hash" not in UserRead.model_validate(user).model_dump()
        verification = db.scalar(select(EmailVerificationToken))
        assert verification.token_hash == hash_opaque_token(token)
        assert token not in db.scalar(select(AuthEmail)).encrypted_payload


@pytest.mark.parametrize("extra", [{"role": "ORG_ADMIN"}, {"organization_id": str(uuid4())}])
def test_registration_rejects_privilege_fields(accounts, extra):
    client, _ = accounts
    response = client.post(
        "/api/auth/register",
        json={
            "full_name": "Student Person",
            "email": "student@example.com",
            "password": PASSWORD,
            **extra,
        },
    )
    assert response.status_code == 422


@pytest.mark.parametrize(
    "change",
    [
        {"password": "short"},
        {"email": "bad-email"},
        {"full_name": "   "},
        {"password": "x" * 129},
    ],
)
def test_registration_validation_redacts_inputs(accounts, change):
    client, _ = accounts
    response = client.post(
        "/api/auth/register",
        json={
            "full_name": "Student Person",
            "email": "student@example.com",
            "password": PASSWORD,
            **change,
        },
    )
    assert response.status_code == 422
    assert PASSWORD not in response.text


def test_duplicate_registration_does_not_overwrite_or_requeue(accounts):
    client, factory = accounts
    first = register(client)
    second = register(client, "STUDENT@example.com")
    assert first.status_code == second.status_code == 202
    assert first.json() == second.json()
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(User)) == 1
        assert db.scalar(select(func.count()).select_from(AuthEmail)) == 1


def test_duplicate_race_is_contained_by_savepoint(accounts, settings, monkeypatch):
    client, factory = accounts
    register(client)
    with factory.begin() as db:
        real_scalar = db.scalar
        calls = [0]

        def scalar(*args, **kwargs):
            calls[0] += 1
            if calls[0] == 1:
                return None  # Simulate registration precheck losing a race.
            return real_scalar(*args, **kwargs)

        monkeypatch.setattr(db, "scalar", scalar)
        service.register(
            db,
            RegisterRequest(
                full_name="Another Person", email="student@example.com", password=PASSWORD
            ),
            settings,
        )
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(User)) == 1


def test_verification_activates_once(accounts, settings):
    client, factory = accounts
    register(client)
    token = latest_token(factory, settings)
    assert client.post("/api/auth/verify-email", json={"token": token}).status_code == 200
    response = client.post("/api/auth/verify-email", json={"token": token})
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_TOKEN"
    with factory() as db:
        user = db.scalar(select(User))
        assert user.status == "ACTIVE"
        assert user.email_verified_at is not None


@pytest.mark.parametrize("endpoint", ["verify-email", "reset-password"])
def test_unknown_token_rejected(accounts, endpoint):
    client, _ = accounts
    data = {"token": "unknown-token-" + "x" * 43}
    if endpoint == "reset-password":
        data["new_password"] = NEW_PASSWORD
    assert client.post(f"/api/auth/{endpoint}", json=data).status_code == 400


def test_expired_verification_rejected(accounts, settings):
    client, factory = accounts
    register(client)
    token = latest_token(factory, settings)
    with factory.begin() as db:
        db.scalar(select(EmailVerificationToken)).expires_at = datetime.now(UTC) - timedelta(
            seconds=1
        )
    assert client.post("/api/auth/verify-email", json={"token": token}).status_code == 400


def test_resend_invalidates_old_link_and_cancels_old_email(accounts, settings):
    client, factory = accounts
    register(client)
    old = latest_token(factory, settings)
    response = client.post("/api/auth/resend-verification", json={"email": "student@example.com"})
    assert response.status_code == 202
    new = latest_token(factory, settings)
    assert new != old
    assert client.post("/api/auth/verify-email", json={"token": old}).status_code == 400
    assert client.post("/api/auth/verify-email", json={"token": new}).status_code == 200
    with factory() as db:
        assert all(row.encrypted_payload is None for row in db.scalars(select(AuthEmail)))


def test_forgot_unknown_and_unverified_are_generic(accounts):
    client, factory = accounts
    register(client)
    known = client.post("/api/auth/forgot-password", json={"email": "student@example.com"})
    unknown = client.post("/api/auth/forgot-password", json={"email": "unknown@example.com"})
    assert known.status_code == unknown.status_code == 202
    assert known.json() == unknown.json()
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(PasswordResetToken)) == 0


def test_reset_updates_hash_version_and_consumes_all_tokens(accounts, settings):
    client, factory = active_account(accounts, settings)
    client.post("/api/auth/forgot-password", json={"email": "student@example.com"})
    old = latest_token(factory, settings, "RESET_PASSWORD")
    client.post("/api/auth/forgot-password", json={"email": "student@example.com"})
    token = latest_token(factory, settings, "RESET_PASSWORD")
    assert (
        client.post(
            "/api/auth/reset-password",
            json={
                "token": old,
                "new_password": NEW_PASSWORD,
            },
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/auth/reset-password",
            json={
                "token": token,
                "new_password": NEW_PASSWORD,
            },
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/api/auth/reset-password",
            json={
                "token": token,
                "new_password": NEW_PASSWORD,
            },
        ).status_code
        == 400
    )
    with factory() as db:
        user = db.scalar(select(User))
        assert user.credential_version == 2
        assert verify_password(NEW_PASSWORD, user.password_hash)
        assert not verify_password(PASSWORD, user.password_hash)
        assert all(t.consumed_at is not None for t in db.scalars(select(PasswordResetToken)))


def test_reset_session_hook_failure_rolls_back(accounts, settings, app):
    client, factory = active_account(accounts, settings)
    client.post("/api/auth/forgot-password", json={"email": "student@example.com"})
    token = latest_token(factory, settings, "RESET_PASSWORD")

    def failing_revoker(db, user_id):
        raise AppError(503, "SESSION_UNAVAILABLE", "Try later")

    app.state.revoke_user_sessions = failing_revoker
    response = client.post(
        "/api/auth/reset-password",
        json={
            "token": token,
            "new_password": NEW_PASSWORD,
        },
    )
    assert response.status_code == 503
    with factory() as db:
        user = db.scalar(select(User))
        assert user.credential_version == 1
        assert verify_password(PASSWORD, user.password_hash)
        assert db.scalar(select(PasswordResetToken)).consumed_at is None


def test_reset_calls_revoker_in_same_session(accounts, settings, app):
    client, factory = active_account(accounts, settings)
    client.post("/api/auth/forgot-password", json={"email": "student@example.com"})
    token = latest_token(factory, settings, "RESET_PASSWORD")
    calls = []

    def revoker(db, user_id):
        assert db.in_transaction()
        calls.append(user_id)

    app.state.revoke_user_sessions = revoker
    assert (
        client.post(
            "/api/auth/reset-password",
            json={
                "token": token,
                "new_password": NEW_PASSWORD,
            },
        ).status_code
        == 200
    )
    assert len(calls) == 1


@pytest.mark.parametrize("kind", ["verify", "reset"])
def test_suspended_accounts_cannot_use_links(accounts, settings, kind):
    client, factory = accounts
    register(client)
    if kind == "reset":
        verification = latest_token(factory, settings)
        client.post("/api/auth/verify-email", json={"token": verification})
        client.post("/api/auth/forgot-password", json={"email": "student@example.com"})
    token = latest_token(
        factory, settings, "VERIFY_EMAIL" if kind == "verify" else "RESET_PASSWORD"
    )
    with factory.begin() as db:
        db.scalar(select(User)).status = "SUSPENDED"
    body = {"token": token}
    if kind == "reset":
        body["new_password"] = NEW_PASSWORD
    endpoint = "verify-email" if kind == "verify" else "reset-password"
    assert client.post(f"/api/auth/{endpoint}", json=body).status_code == 400


def test_email_subject_rate_limit(accounts):
    client, _ = accounts
    for _ in range(3):
        assert (
            client.post(
                "/api/auth/forgot-password",
                json={
                    "email": "unknown@example.com",
                },
            ).status_code
            == 202
        )
    response = client.post("/api/auth/forgot-password", json={"email": "unknown@example.com"})
    assert response.status_code == 429
    assert "Retry-After" in response.headers


def test_account_database_failure_is_safe(app, client):
    class BrokenSession:
        def begin(self):
            raise OperationalError("SQL", {}, Exception("database-password"))

    app.dependency_overrides[get_db] = lambda: BrokenSession()
    response = register(client)
    assert response.status_code == 503
    assert "database-password" not in response.text


def test_email_delivery_clears_payload(accounts, settings):
    client, factory = accounts
    register(client)
    captured = []
    totals = deliver_pending_emails(
        factory, settings, sender=lambda _, payload: captured.append(payload)
    )
    assert totals["sent"] == 1
    assert "#token=" in captured[0]["body"]
    with factory() as db:
        row = db.scalar(select(AuthEmail))
        assert row.sent_at is not None and row.encrypted_payload is None
    assert deliver_pending_emails(factory, settings, sender=lambda *_: None)["sent"] == 0


def test_email_delivery_failure_retries_without_exposing_secrets(accounts, settings):
    client, factory = accounts
    register(client)

    def failed(*args):
        raise smtplib.SMTPException("smtp-password-secret")

    assert deliver_pending_emails(factory, settings, sender=failed)["failed"] == 1
    with factory() as db:
        row = db.scalar(select(AuthEmail))
        assert row.attempts == 1
        assert row.last_error == "SMTPException"
        assert row.encrypted_payload is not None
    assert deliver_pending_emails(factory, settings, sender=failed)["failed"] == 0
    with factory.begin() as db:
        db.scalar(select(AuthEmail)).next_attempt_at = datetime.now(UTC) - timedelta(seconds=1)
    assert deliver_pending_emails(factory, settings, sender=lambda *_: None)["sent"] == 1


def test_expired_email_is_not_delivered(accounts, settings):
    client, factory = accounts
    register(client)
    with factory.begin() as db:
        db.scalar(select(AuthEmail)).expires_at = datetime.now(UTC) - timedelta(seconds=1)
    assert (
        deliver_pending_emails(factory, settings, sender=lambda *_: pytest.fail())["cancelled"] == 1
    )


def test_last_failed_attempt_cancels_email(accounts, settings):
    client, factory = accounts
    register(client)
    limited = settings.model_copy(update={"auth_email_max_attempts": 1})

    def fail(*_):
        raise OSError("network secret")

    assert deliver_pending_emails(factory, limited, sender=fail)["failed"] == 1
    with factory() as db:
        row = db.scalar(select(AuthEmail))
        assert row.cancelled_at is not None
        assert row.encrypted_payload is None


def test_explicit_encryption_key_is_used(settings):
    explicit = settings.model_copy(
        update={
            "auth_email_encryption_key": settings.jwt_secret_key.__class__(
                Fernet.generate_key().decode()
            )
        }
    )
    encrypted = email_cipher(explicit).encrypt(b"secret")
    assert email_cipher(explicit).decrypt(encrypted) == b"secret"


def test_expired_reset_does_not_change_password(accounts, settings):
    client, factory = active_account(accounts, settings)
    client.post("/api/auth/forgot-password", json={"email": "student@example.com"})
    token = latest_token(factory, settings, "RESET_PASSWORD")
    with factory.begin() as db:
        db.scalar(select(PasswordResetToken)).expires_at = datetime.now(UTC) - timedelta(seconds=1)
    response = client.post(
        "/api/auth/reset-password",
        json={
            "token": token,
            "new_password": NEW_PASSWORD,
        },
    )
    assert response.status_code == 400
    with factory() as db:
        assert verify_password(PASSWORD, db.scalar(select(User)).password_hash)


def test_queue_failure_rolls_back_registration(accounts, monkeypatch):
    client, factory = accounts

    def broken_queue(*args, **kwargs):
        raise AppError(503, "EMAIL_UNAVAILABLE", "Try later")

    monkeypatch.setattr(service, "queue_auth_email", broken_queue)
    assert register(client).status_code == 503
    with factory() as db:
        assert db.scalar(select(func.count()).select_from(User)) == 0
        assert db.scalar(select(func.count()).select_from(EmailVerificationToken)) == 0


def test_email_ip_limit_is_independent_of_email(accounts):
    client, _ = accounts
    for i in range(10):
        assert (
            client.post(
                "/api/auth/forgot-password",
                json={
                    "email": f"unknown{i}@example.com",
                },
            ).status_code
            == 202
        )
    assert (
        client.post(
            "/api/auth/forgot-password",
            json={
                "email": "another@example.com",
            },
        ).status_code
        == 429
    )


def test_smtp_delivery_uses_tls_and_configured_credentials(settings, monkeypatch):
    from app.modules.accounts.email import send_smtp

    captured = {}

    class FakeSMTP:
        def __init__(self, host, port, **kwargs):
            captured["host"] = host
            captured["port"] = port

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def starttls(self, **kwargs):
            captured["tls"] = True

        def login(self, username, password):
            captured["username"] = username
            captured["password"] = password

        def send_message(self, message):
            captured["message"] = message
            return {}

    monkeypatch.setattr("app.modules.accounts.email.smtplib.SMTP", FakeSMTP)
    configured = settings.model_copy(
        update={
            "smtp_host": "smtp.example.com",
            "smtp_username": "mailer",
            "smtp_password": settings.jwt_secret_key.__class__("smtp-test-password"),
        }
    )
    send_smtp(
        configured,
        {
            "recipient": "student@example.com",
            "subject": "Verify email",
            "body": "Test content",
        },
    )
    assert captured["tls"]
    assert captured["username"] == "mailer"
    assert captured["message"]["To"] == "student@example.com"


def test_account_migration_matches_models_and_downgrades():
    import importlib.util
    from pathlib import Path

    from alembic.autogenerate import compare_metadata
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    from sqlalchemy import inspect

    path = Path(__file__).resolve().parents[1] / "migrations/versions/0001_accounts.py"
    spec = importlib.util.spec_from_file_location("account_migration", path)
    migration = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(migration)
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        context = MigrationContext.configure(connection)
        with Operations.context(context):
            migration.upgrade()
        assert set(inspect(connection).get_table_names()) == {
            "users",
            "email_verification_tokens",
            "password_reset_tokens",
            "auth_emails",
        }
        from sqlalchemy import MetaData

        account_metadata = MetaData()
        for table_name in (
            "users",
            "email_verification_tokens",
            "password_reset_tokens",
            "auth_emails",
        ):
            Base.metadata.tables[table_name].to_metadata(account_metadata)
        assert compare_metadata(context, account_metadata) == []
        with Operations.context(context):
            migration.downgrade()
        assert inspect(connection).get_table_names() == []
    engine.dispose()
