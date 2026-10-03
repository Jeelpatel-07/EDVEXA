import importlib.util
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import UUID

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, select
from sqlalchemy.pool import StaticPool

from app.core.security import hash_password
from app.db.model_registry import Base, load_models
from app.db.session import build_session_factory, get_db
from app.modules.access.models import (
    Organization,
    OrganizationRole,
    OrganizationTerm,
    OrganizationUser,
    Permission,
    PlatformAdmin,
    Role,
    RolePermission,
)
from app.modules.access.permissions import ROLE_PERMISSIONS
from app.modules.accounts.models import User

PASSWORD = "a strong test passphrase"
HASH = hash_password(PASSWORD)
ORIGIN = {"Origin": "http://localhost:5173"}


@pytest.fixture
def access(app):
    load_models()
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )

    @event.listens_for(engine, "connect")
    def connect(connection, record):
        connection.isolation_level = None
        connection.execute("PRAGMA foreign_keys=ON")

    @event.listens_for(engine, "begin")
    def begin(connection):
        connection.exec_driver_sql("BEGIN")

    Base.metadata.create_all(engine)
    factory = build_session_factory(engine)
    ids = {}
    with factory.begin() as db:
        db.add_all([Role(code=c) for c in ROLE_PERMISSIONS])
        db.add_all(
            [
                Permission(code=c)
                for c in {p for values in ROLE_PERMISSIONS.values() for p in values}
            ]
        )
        db.flush()
        db.add_all(
            [
                RolePermission(role_code=r, permission_code=p)
                for r, values in ROLE_PERMISSIONS.items()
                for p in values
            ]
        )
        for name in ("platform", "owner", "other", "guest"):
            user = User(
                full_name=name.title() + " Person",
                email=f"{name}@example.com",
                password_hash=HASH,
                status="ACTIVE",
                email_verified_at=datetime.now(UTC),
            )
            db.add(user)
            db.flush()
            ids[name] = user.id
        db.add(PlatformAdmin(user_id=ids["platform"]))
        for slug, owner in (("alpha", "owner"), ("beta", "other")):
            org = Organization(name=slug.title(), slug=slug, join_code=slug.upper())
            db.add(org)
            db.flush()
            ids[slug] = org.id
            db.add(OrganizationUser(organization_id=org.id, user_id=ids[owner]))
            db.flush()
            db.add(
                OrganizationRole(organization_id=org.id, user_id=ids[owner], role_code="ORG_ADMIN")
            )
        db.add(
            OrganizationUser(organization_id=ids["alpha"], user_id=ids["guest"], student_id="S-01")
        )

    def database():
        with factory() as db:
            yield db

    app.dependency_overrides[get_db] = database
    with TestClient(app) as client:
        yield client, factory, ids
    app.dependency_overrides.clear()
    engine.dispose()


def auth(client, name="owner"):
    response = client.post(
        "/api/auth/login",
        json={"email": f"{name}@example.com", "password": PASSWORD},
        headers=ORIGIN,
    )
    assert response.status_code == 200, response.text
    return {"Authorization": "Bearer " + response.json()["access_token"]}


def url(ids, suffix=""):
    return f"/api/orgs/{ids['alpha']}" + suffix


def term(client, ids, headers, name="Current year"):
    today = datetime.now(UTC).date()
    payload = {
        "name": name,
        "starts_on": str(today - timedelta(days=1)),
        "ends_on": str(today + timedelta(days=300)),
    }
    response = client.post(url(ids, "/terms"), json=payload, headers=headers)
    assert response.status_code == 201
    identifier = response.json()["id"]
    assert (
        client.post(url(ids, f"/terms/{identifier}/set-current"), headers=headers).status_code
        == 200
    )
    return identifier


def test_context_matches_react_and_platform_is_not_org_admin(access):
    client, _, ids = access
    data = client.get("/api/auth/context", headers=auth(client, "owner")).json()
    assert data["user"]["name"] == "Owner Person"
    assert data["organization"]["id"] == str(ids["alpha"])
    assert data["roles"] == ["ORG_ADMIN"]
    assert "users.manage" in data["permissions"]
    assert data["is_member"] is False and data["membership"] is None
    platform = auth(client, "platform")
    assert client.get("/api/platform/stats", headers=platform).json()["total_organizations"] == 2
    assert client.get(url(ids, "/users"), headers=platform).status_code == 403
    assert client.get("/api/platform/users", headers=platform).status_code == 200


def test_tenant_isolation_and_live_guest_permissions(access):
    client, _, ids = access
    owner = auth(client)
    assert client.get(f"/api/orgs/{ids['beta']}/users", headers=owner).status_code == 403
    guest = auth(client, "guest")
    data = client.get("/api/auth/context", headers=guest).json()
    assert data["roles"] == []
    assert data["persona_label"] == "GUEST"
    assert "orders.purchase" in data["permissions"]
    assert "users.manage" not in data["permissions"]
    assert client.get(url(ids, "/users"), headers=guest).status_code == 403
    assert client.get("/api/platform/users", headers=owner).status_code == 403


def test_role_changes_apply_to_existing_bearer_and_membership_is_independent(access):
    client, _, ids = access
    owner, guest = auth(client), auth(client, "guest")
    endpoint = url(ids, f"/users/{ids['guest']}/roles")
    assert client.put(endpoint, json={"roles": ["TREASURER"]}, headers=owner).status_code == 409
    term(client, ids, owner)
    assert (
        client.put(endpoint, json={"roles": ["TREASURER", "VOLUNTEER"]}, headers=owner).status_code
        == 200
    )
    data = client.get("/api/auth/context", headers=guest).json()
    assert data["roles"] == ["TREASURER", "VOLUNTEER"]
    assert "expenses.approve" in data["permissions"]
    assert data["is_member"] is False
    assert client.put(endpoint, json={"roles": []}, headers=owner).status_code == 200
    assert client.get("/api/auth/context", headers=guest).json()["roles"] == []


@pytest.mark.parametrize("role", ["MEMBER", "GUEST", "PLATFORM_ADMIN", "ORG_ADMIN"])
def test_cannot_assign_derived_or_privileged_roles(access, role):
    client, _, ids = access
    assert (
        client.put(
            url(ids, f"/users/{ids['guest']}/roles"), json={"roles": [role]}, headers=auth(client)
        ).status_code
        == 422
    )


def test_term_switch_and_expiry_remove_staff_permissions(access):
    client, factory, ids = access
    owner, guest = auth(client), auth(client, "guest")
    first = term(client, ids, owner)
    client.post(
        url(ids, f"/users/{ids['guest']}/roles"), json={"role_code": "GATE_STAFF"}, headers=owner
    )
    assert "tickets.scan" in client.get("/api/auth/context", headers=guest).json()["permissions"]
    second = term(client, ids, owner, "New committee")
    assert first != second
    assert client.get("/api/auth/context", headers=guest).json()["roles"] == []
    client.post(
        url(ids, f"/users/{ids['guest']}/roles"), json={"role_code": "VOLUNTEER"}, headers=owner
    )
    with factory.begin() as db:
        current = db.get(OrganizationTerm, UUID(second))
        current.ends_on = datetime.now(UTC).date() - timedelta(days=1)
        current.starts_on = current.ends_on - timedelta(days=365)
    assert client.get("/api/auth/context", headers=guest).json()["roles"] == []


def test_select_join_and_session_context_persistence(access):
    client, _, ids = access
    guest = auth(client, "guest")
    assert (
        client.post(
            "/api/auth/select-org", json={"organization_id": str(ids["beta"])}, headers=guest
        ).status_code
        == 403
    )
    joined = client.post(
        "/api/auth/join-org", json={"join_code": "BETA", "student_id": "B-99"}, headers=guest
    )
    assert joined.status_code == 200
    assert joined.json()["organization"]["id"] == str(ids["beta"])
    assert len(joined.json()["organizations"]) == 2
    assert client.get("/api/auth/context", headers=guest).json()["user"]["studentId"] == "B-99"
    assert (
        client.post(
            "/api/auth/select-org", json={"organization_id": str(ids["alpha"])}, headers=guest
        ).status_code
        == 200
    )
    assert client.get("/api/auth/context", headers=guest).json()["user"]["studentId"] == "S-01"


def test_registration_join_code_rollback_and_no_self_granted_roles(access):
    client, factory, ids = access
    payload = {
        "full_name": "New Student",
        "email": "new@example.com",
        "password": PASSWORD,
        "join_code": "INVALID",
    }
    assert client.post("/api/auth/register", json=payload).status_code == 400
    with factory() as db:
        assert db.scalar(select(User).where(User.email == "new@example.com")) is None
    payload["join_code"] = "ALPHA"
    payload["student_id"] = "NEW-1"
    assert client.post("/api/auth/register", json=payload).status_code == 202
    with factory() as db:
        user = db.scalar(select(User).where(User.email == "new@example.com"))
        assert user.status == "PENDING_VERIFICATION"
        relation = db.scalar(select(OrganizationUser).where(OrganizationUser.user_id == user.id))
        assert relation.organization_id == ids["alpha"]
        assert (
            db.scalar(select(OrganizationRole).where(OrganizationRole.user_id == user.id)) is None
        )
    assert (
        client.post(
            "/api/auth/login",
            json={"email": payload["email"], "password": PASSWORD},
            headers=ORIGIN,
        ).status_code
        == 403
    )


def test_invitation_new_account_existing_account_and_replay(access):
    client, factory, ids = access
    platform = auth(client, "platform")
    response = client.post(
        "/api/platform/admins",
        json={"organization_id": str(ids["beta"]), "email": "guest@example.com"},
        headers=platform,
    )
    token = response.json()["invite_url"].split("#token=")[1]
    assert (
        client.post(
            "/api/auth/accept-invite",
            json={
                "token": token,
                "password": "attacker chosen passphrase",
                "full_name": "Attacker",
            },
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/auth/accept-invite", json={"token": token}, headers=auth(client, "guest")
        ).status_code
        == 200
    )
    with factory() as db:
        assert db.get(User, ids["guest"]).password_hash == HASH
    assert (
        client.post(
            "/api/auth/accept-invite", json={"token": token}, headers=auth(client, "guest")
        ).status_code
        == 400
    )
    response = client.post(
        "/api/platform/admins",
        json={"organization_id": str(ids["beta"]), "email": "newadmin@example.com"},
        headers=platform,
    )
    token = response.json()["invite_url"].split("#token=")[1]
    assert (
        client.post(
            "/api/auth/accept-invite",
            json={"token": token, "password": PASSWORD, "full_name": "New Administrator"},
        ).status_code
        == 200
    )
    response = client.post(
        "/api/auth/login",
        json={"email": "newadmin@example.com", "password": PASSWORD},
        headers=ORIGIN,
    )
    new = {"Authorization": "Bearer " + response.json()["access_token"]}
    assert client.get("/api/auth/context", headers=new).json()["roles"] == ["ORG_ADMIN"]
    assert client.get(f"/api/orgs/{ids['beta']}/users", headers=new).status_code == 200


def test_suspension_blocks_operations_live_but_preserves_other_tenant(access):
    client, _, ids = access
    owner, guest, platform = auth(client), auth(client, "guest"), auth(client, "platform")
    client.post("/api/auth/join-org", json={"join_code": "BETA"}, headers=guest)
    assert (
        client.post(
            f"/api/platform/organizations/{ids['alpha']}/suspend",
            json={"reason": "Review"},
            headers=platform,
        ).status_code
        == 200
    )
    assert client.get(url(ids, "/users"), headers=owner).status_code == 403
    assert client.get("/api/auth/context", headers=owner).json()["permissions"] == []
    assert client.get("/api/auth/context", headers=guest).json()["organization"]["id"] == str(
        ids["beta"]
    )
    assert (
        client.post(
            f"/api/platform/organizations/{ids['alpha']}/activate", json={}, headers=platform
        ).status_code
        == 200
    )
    assert client.get(url(ids, "/users"), headers=owner).status_code == 200


def test_tenant_user_suspension_is_not_global(access):
    client, _, ids = access
    owner, guest = auth(client), auth(client, "guest")
    client.post("/api/auth/join-org", json={"join_code": "BETA"}, headers=guest)
    assert (
        client.patch(
            url(ids, f"/users/{ids['guest']}/status"), json={"status": "SUSPENDED"}, headers=owner
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/api/auth/select-org", json={"organization_id": str(ids["alpha"])}, headers=guest
        ).status_code
        == 403
    )
    assert client.get("/api/auth/context", headers=guest).json()["organization"]["id"] == str(
        ids["beta"]
    )
    assert (
        client.patch(
            url(ids, f"/users/{ids['owner']}/status"), json={"status": "SUSPENDED"}, headers=owner
        ).status_code
        == 403
    )


def test_platform_create_and_audit_scoping(access):
    client, factory, ids = access
    platform, owner = auth(client, "platform"), auth(client)
    response = client.post(
        "/api/platform/organizations",
        json={
            "name": "Gamma Club",
            "slug": "gamma",
            "join_code": "GAMMA",
            "admin_email": "gamma@example.com",
            "member_number_prefix": "GAM",
        },
        headers=platform,
    )
    assert response.status_code == 201
    assert "/accept-invite#token=" in response.json()["admin_invite_url"]
    assert (
        client.post(
            "/api/platform/organizations",
            json={"name": "Another", "slug": "gamma", "admin_email": "other@example.com"},
            headers=platform,
        ).status_code
        == 409
    )
    term(client, ids, owner)
    platform_logs = client.get("/api/platform/audit-logs", headers=platform).json()
    assert any(r["action"] == "ORGANIZATION_CREATED" for r in platform_logs)
    assert all(r["action"] != "TERM_CREATED" for r in platform_logs)
    tenant_logs = client.get(url(ids, "/audit-logs"), headers=owner).json()
    assert any(r["action"] == "TERM_CREATED" for r in tenant_logs)
    assert all(r["action"] != "ORGANIZATION_CREATED" for r in tenant_logs)
    assert client.get(f"/api/orgs/{ids['beta']}/audit-logs", headers=owner).status_code == 403


def test_change_password_revokes_access_and_sessions(access):
    client, _, _ = access
    headers = auth(client, "guest")
    assert client.get("/api/auth/sessions", headers=headers).json()[0]["is_current"]
    assert (
        client.post(
            "/api/auth/change-password",
            json={"current_password": "wrong", "new_password": "a replacement passphrase"},
            headers=headers,
        ).status_code
        == 400
    )
    response = client.post(
        "/api/auth/change-password",
        json={"current_password": PASSWORD, "new_password": "a replacement passphrase"},
        headers=headers,
    )
    assert response.status_code == 200
    assert client.get("/api/auth/context", headers=headers).status_code == 401
    assert (
        client.post(
            "/api/auth/login",
            json={"email": "guest@example.com", "password": PASSWORD},
            headers=ORIGIN,
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/auth/login",
            json={"email": "guest@example.com", "password": "a replacement passphrase"},
            headers=ORIGIN,
        ).status_code
        == 200
    )


def test_no_missing_term_fallback_and_no_foreign_term_assignment(access):
    client, factory, ids = access
    owner = auth(client)
    term(client, ids, owner)
    with factory.begin() as db:
        foreign = OrganizationTerm(
            organization_id=ids["beta"],
            name="Foreign",
            starts_on=datetime.now(UTC).date(),
            ends_on=datetime.now(UTC).date() + timedelta(days=10),
        )
        db.add(foreign)
        db.flush()
        from sqlalchemy.exc import IntegrityError

        with pytest.raises(IntegrityError), db.begin_nested():
            db.add(
                OrganizationRole(
                    organization_id=ids["alpha"],
                    user_id=ids["guest"],
                    role_code="TREASURER",
                    term_id=foreign.id,
                )
            )
            db.flush()


def test_all_migrations_match_models_and_seed_catalog():
    from alembic.autogenerate import compare_metadata
    from alembic.migration import MigrationContext
    from alembic.operations import Operations
    from sqlalchemy import inspect

    load_models()
    with create_engine("sqlite://").begin() as connection:
        context = MigrationContext.configure(connection)
        modules = []
        for name in ("0001_accounts", "0002_sessions", "0003_access"):
            path = Path(__file__).resolve().parents[1] / f"migrations/versions/{name}.py"
            spec = importlib.util.spec_from_file_location(name, path)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            modules.append(module)
            with Operations.context(context):
                module.upgrade()
        assert compare_metadata(context, Base.metadata) == []
        assert connection.execute(select(Role.code)).scalars().all()
        for module in reversed(modules):
            with Operations.context(context):
                module.downgrade()
        assert inspect(connection).get_table_names() == []


def test_registration_organization_validation_does_not_reveal_existing_email(access):
    client, factory, _ = access
    for email in ("guest@example.com", "unknown@example.com"):
        response = client.post(
            "/api/auth/register",
            json={
                "full_name": "Student Person",
                "email": email,
                "password": PASSWORD,
                "join_code": "INVALID",
            },
        )
        assert response.status_code == 400
        assert response.json()["error"]["code"] == "INVALID_JOIN_CODE"
    response = client.post(
        "/api/auth/register",
        json={
            "full_name": "Another Student",
            "email": "another@example.com",
            "password": PASSWORD,
            "join_code": "ALPHA",
            "student_id": "S-01",
        },
    )
    assert response.status_code == 409
    with factory() as db:
        assert db.scalar(select(User).where(User.email == "another@example.com")) is None
