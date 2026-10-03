from datetime import UTC, datetime
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.rate_limits import client_ip, enforce_rate_limit
from app.core.security import generate_opaque_token
from app.db.session import get_db
from app.modules.access import schemas, service
from app.modules.access.models import (
    Organization,
    OrganizationRole,
    OrganizationTerm,
    SessionOrganization,
)
from app.modules.accounts.models import User
from app.modules.accounts.schemas import MessageResponse
from app.modules.sessions.dependencies import AuthContext, bearer, get_auth_context
from app.modules.sessions.models import AuthSession
from app.modules.sessions.router import clear_refresh_cookie

router = APIRouter(tags=["Organizations and access"])
Db = Annotated[Session, Depends(get_db)]
Auth = Annotated[AuthContext, Depends(get_auth_context)]
OrgId = UUID


def platform(context: Auth, db: Db) -> AuthContext:
    if not service.platform_admin(db, context.user.id):
        raise AppError(403, "FORBIDDEN", "Platform administrator access is required")
    return context


Platform = Annotated[AuthContext, Depends(platform)]


def admin(organization_id: UUID, context: Auth, db: Db) -> AuthContext:
    # Lock tenant before authorizing mutations, so role/term/status changes serialize.
    db.scalar(select(Organization).where(Organization.id == organization_id).with_for_update())
    service.authorize(db, context.user.id, organization_id, "users.manage")
    return context


Admin = Annotated[AuthContext, Depends(admin)]


def role_manager(organization_id: UUID, context: Admin, db: Db) -> AuthContext:
    service.authorize(db, context.user.id, organization_id, "roles.manage")
    return context


RoleManager = Annotated[AuthContext, Depends(role_manager)]


def optional_user(
    request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)],
    db: Db,
):
    return get_auth_context(request, credentials, db).user if credentials else None


OptionalUser = Annotated[User | None, Depends(optional_user)]


@router.get("/auth/context")
def context(context: Auth, db: Db):
    return service.session_context(db, context)


@router.post("/auth/select-org")
def select_org(data: schemas.SelectOrganization, context: Auth, db: Db):
    service.authorize(db, context.user.id, data.organization_id)
    row = db.get(SessionOrganization, context.session.id)
    if row is None:
        db.add(
            SessionOrganization(session_id=context.session.id, organization_id=data.organization_id)
        )
    else:
        row.organization_id = data.organization_id
    db.commit()
    return service.session_context(db, context)


@router.post("/auth/join-org")
def join_org(data: schemas.JoinOrganization, context: Auth, db: Db, request: Request):
    enforce_rate_limit(
        request, scope="join-user", subject=str(context.user.id), limit=10, window_seconds=900
    )
    org = service.join(db, context.user, data.join_code, data.student_id)
    row = db.get(SessionOrganization, context.session.id)
    if row is None:
        db.add(SessionOrganization(session_id=context.session.id, organization_id=org.id))
    else:
        row.organization_id = org.id
    db.commit()
    return service.session_context(db, context)


@router.post("/auth/accept-invite", response_model=MessageResponse)
def accept_invite(data: schemas.AcceptInvitation, request: Request, db: Db, user: OptionalUser):
    enforce_rate_limit(
        request, scope="invite-ip", subject=client_ip(request), limit=10, window_seconds=900
    )
    service.accept_invite(db, data, user)
    db.commit()
    return MessageResponse(message="Invitation accepted. Sign in to open your organization.")


@router.post("/auth/change-password", response_model=MessageResponse)
def change_password(
    data: schemas.ChangePassword, context: Auth, db: Db, request: Request, response: Response
):
    enforce_rate_limit(
        request, scope="change-password", subject=str(context.user.id), limit=5, window_seconds=900
    )
    service.change_password(
        db,
        context.user.id,
        data.current_password.get_secret_value(),
        data.new_password.get_secret_value(),
    )
    db.commit()
    clear_refresh_cookie(response, request)
    return MessageResponse(message="Password changed. Sign in again on all devices.")


@router.get("/auth/sessions")
def sessions(context: Auth, db: Db):
    rows = db.scalars(
        select(AuthSession)
        .where(
            AuthSession.user_id == context.user.id,
            AuthSession.revoked_at.is_(None),
            AuthSession.expires_at > datetime.now(UTC),
        )
        .order_by(AuthSession.last_used_at.desc())
    ).all()
    return [
        dict(
            id=r.id,
            created_at=r.created_at,
            last_used_at=r.last_used_at,
            expires_at=r.expires_at,
            is_current=r.id == context.session.id,
        )
        for r in rows
    ]


@router.get("/platform/stats")
def stats(context: Platform, db: Db):
    counts = dict(
        db.execute(select(Organization.status, func.count()).group_by(Organization.status)).all()
    )
    return dict(
        total_organizations=sum(counts.values()),
        active_organizations=counts.get("ACTIVE", 0),
        suspended_organizations=counts.get("SUSPENDED", 0),
        total_users=db.scalar(select(func.count()).select_from(User)),
    )


@router.get("/platform/organizations")
def organizations(context: Platform, db: Db):
    return [
        service.organization_dict(o)
        for o in db.scalars(select(Organization).order_by(Organization.name))
    ]


@router.post("/platform/organizations", status_code=201)
def create_organization(
    data: schemas.OrganizationCreate, context: Platform, db: Db, request: Request
):
    code = data.join_code or generate_opaque_token()[:12].upper().replace("_", "X")
    if db.scalar(
        select(Organization.id).where(
            (Organization.slug == data.slug) | (Organization.join_code == code)
        )
    ):
        raise AppError(409, "ORGANIZATION_EXISTS", "Slug or join code is already in use")
    org = Organization(
        name=data.name.strip(),
        slug=data.slug,
        join_code=code,
        member_number_prefix=data.member_number_prefix,
    )
    db.add(org)
    db.flush()
    result = service.invite(
        db, context.user.id, org.id, str(data.admin_email), "ORG_ADMIN", request.app.state.settings
    )
    service.audit(db, context.user.id, "ORGANIZATION_CREATED", "organization", org.id)
    db.commit()
    return {**service.organization_dict(org), "admin_invite_url": result["invite_url"]}


def find_org(db, organization_id):
    org = db.scalar(
        select(Organization).where(Organization.id == organization_id).with_for_update()
    )
    if org is None:
        raise AppError(404, "NOT_FOUND", "Organization was not found")
    return org


@router.get("/platform/organizations/{organization_id}")
def get_organization(organization_id: UUID, context: Platform, db: Db):
    return service.organization_dict(find_org(db, organization_id))


@router.patch("/platform/organizations/{organization_id}")
def patch_organization(
    organization_id: UUID, data: schemas.OrganizationPatch, context: Platform, db: Db
):
    org = find_org(db, organization_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(org, key, value)
    service.audit(db, context.user.id, "ORGANIZATION_UPDATED", "organization", org.id)
    db.commit()
    return service.organization_dict(org)


def set_org_status(db, org_id, actor_id, status, reason):
    org = find_org(db, org_id)
    org.status = status
    service.audit(
        db, actor_id, "ORGANIZATION_" + status, "organization", org.id, details={"reason": reason}
    )
    db.commit()
    return service.organization_dict(org)


@router.post("/platform/organizations/{organization_id}/suspend")
def suspend(organization_id: UUID, data: schemas.StatusReason, context: Platform, db: Db):
    return set_org_status(db, organization_id, context.user.id, "SUSPENDED", data.reason)


@router.post("/platform/organizations/{organization_id}/activate")
def activate(organization_id: UUID, data: schemas.StatusReason, context: Platform, db: Db):
    return set_org_status(db, organization_id, context.user.id, "ACTIVE", data.reason)


@router.post("/platform/admins", status_code=201)
def invite_admin(data: schemas.InviteAdmin, request: Request, context: Platform, db: Db):
    result = service.invite(
        db,
        context.user.id,
        data.organization_id,
        str(data.email),
        "ORG_ADMIN",
        request.app.state.settings,
    )
    service.audit(db, context.user.id, "ORG_ADMIN_INVITED", "organization", data.organization_id)
    db.commit()
    return result


@router.get("/platform/users")
def platform_users(context: Platform, db: Db):
    return [
        dict(
            id=u.id,
            name=u.full_name,
            email=u.email,
            status=u.status,
            roles=["PLATFORM_ADMIN"] if service.platform_admin(db, u.id) else [],
            created_at=u.created_at,
        )
        for u in db.scalars(select(User).order_by(User.full_name))
    ]


@router.get("/platform/audit-logs")
def platform_audit(
    context: Platform,
    db: Db,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return service.audit_list(db, limit=limit, offset=offset)


@router.get("/orgs/{organization_id}/users")
def users(organization_id: UUID, context: Admin, db: Db):
    return service.directory(db, organization_id)


@router.put("/orgs/{organization_id}/users/{user_id}/roles")
def replace_roles(
    organization_id: UUID, user_id: UUID, data: schemas.RolesUpdate, context: RoleManager, db: Db
):
    service.replace_staff_roles(db, context.user.id, organization_id, user_id, data.roles)
    db.commit()
    return {"roles": service.live_roles(db, organization_id, user_id)}


@router.post("/orgs/{organization_id}/users/{user_id}/roles", status_code=201)
def assign_role(
    organization_id: UUID, user_id: UUID, data: schemas.AssignRole, context: RoleManager, db: Db
):
    row = service.assign(db, context.user.id, organization_id, user_id, data.role_code)
    db.commit()
    return {"id": row.id, "role_code": row.role_code}


@router.delete(
    "/orgs/{organization_id}/users/{user_id}/roles/{role_id}", response_model=MessageResponse
)
def revoke_role(organization_id: UUID, user_id: UUID, role_id: UUID, context: RoleManager, db: Db):
    row = db.scalar(
        select(OrganizationRole)
        .where(
            OrganizationRole.id == role_id,
            OrganizationRole.organization_id == organization_id,
            OrganizationRole.user_id == user_id,
        )
        .with_for_update()
    )
    if row is None:
        raise AppError(404, "NOT_FOUND", "Role assignment was not found")
    if row.role_code not in service.STAFF:
        raise AppError(
            403, "PROTECTED_ROLE", "Organization administrators are managed at platform level"
        )
    row.revoked_at = datetime.now(UTC)
    service.audit(
        db,
        context.user.id,
        "ROLE_REVOKED",
        "user",
        user_id,
        organization_id,
        {"role": row.role_code},
    )
    db.commit()
    return MessageResponse(message="Role revoked")


@router.patch("/orgs/{organization_id}/users/{user_id}/status")
def user_status(
    organization_id: UUID, user_id: UUID, data: schemas.UserStatus, context: Admin, db: Db
):
    row = service.participation(db, organization_id, user_id, lock=True)
    if row is None:
        raise AppError(404, "NOT_FOUND", "Organization user was not found")
    if "ORG_ADMIN" in service.live_roles(db, organization_id, user_id):
        raise AppError(
            403, "PROTECTED_ROLE", "Organization administrators cannot be suspended here"
        )
    row.status = data.status
    service.audit(db, context.user.id, "USER_" + data.status, "user", user_id, organization_id)
    db.commit()
    return {"status": row.status}


@router.post("/orgs/{organization_id}/users/invite", status_code=201)
def invite_staff(
    organization_id: UUID, data: schemas.InviteStaff, request: Request, context: RoleManager, db: Db
):
    result = service.invite(
        db,
        context.user.id,
        organization_id,
        str(data.email),
        data.role_code,
        request.app.state.settings,
    )
    db.commit()
    return result


@router.get("/orgs/{organization_id}/settings")
def settings(organization_id: UUID, context: Admin, db: Db):
    return service.organization_dict(db.get(Organization, organization_id))


@router.patch("/orgs/{organization_id}/settings")
def update_settings(organization_id: UUID, data: schemas.OrganizationPatch, context: Admin, db: Db):
    org = db.get(Organization, organization_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(org, key, value)
    service.audit(db, context.user.id, "SETTINGS_UPDATED", "organization", org.id, org.id)
    db.commit()
    return service.organization_dict(org)


@router.post("/orgs/{organization_id}/settings/regenerate-join-code")
def regenerate(organization_id: UUID, context: Admin, db: Db):
    org = db.get(Organization, organization_id)
    org.join_code = generate_opaque_token()[:12].upper().replace("_", "X")
    service.audit(db, context.user.id, "JOIN_CODE_REGENERATED", "organization", org.id, org.id)
    db.commit()
    return {"join_code": org.join_code}


@router.get("/orgs/{organization_id}/terms")
def terms(organization_id: UUID, context: Admin, db: Db):
    return [
        dict(
            id=t.id, name=t.name, starts_on=t.starts_on, ends_on=t.ends_on, is_current=t.is_current
        )
        for t in db.scalars(
            select(OrganizationTerm)
            .where(OrganizationTerm.organization_id == organization_id)
            .order_by(OrganizationTerm.starts_on.desc())
        )
    ]


@router.post("/orgs/{organization_id}/terms", status_code=201)
def create_term(organization_id: UUID, data: schemas.TermCreate, context: RoleManager, db: Db):
    term = OrganizationTerm(organization_id=organization_id, **data.model_dump())
    db.add(term)
    db.flush()
    service.audit(db, context.user.id, "TERM_CREATED", "term", term.id, organization_id)
    db.commit()
    return {"id": term.id, **data.model_dump(), "is_current": False}


@router.post("/orgs/{organization_id}/terms/{term_id}/set-current")
def set_current(organization_id: UUID, term_id: UUID, context: RoleManager, db: Db):
    term = db.get(OrganizationTerm, term_id)
    today = datetime.now(UTC).date()
    if term is None or term.organization_id != organization_id:
        raise AppError(404, "NOT_FOUND", "Term was not found")
    if not term.starts_on <= today <= term.ends_on:
        raise AppError(400, "INVALID_TERM", "Only a term covering today can be activated")
    db.execute(
        update(OrganizationTerm)
        .where(OrganizationTerm.organization_id == organization_id)
        .values(is_current=False)
    )
    term.is_current = True
    service.audit(db, context.user.id, "CURRENT_TERM_CHANGED", "term", term.id, organization_id)
    db.commit()
    return {"id": term.id, "is_current": True}


@router.get("/orgs/{organization_id}/audit-logs")
def org_audit(
    organization_id: UUID,
    context: Admin,
    db: Db,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return service.audit_list(db, organization_id, limit, offset)
