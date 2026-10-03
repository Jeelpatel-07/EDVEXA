from typing import Optional, Callable
from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db import get_db
from app.services.auth_service import decode_access_token

security = HTTPBearer(auto_error=False)

class OrgContext:
    def __init__(self, org_id: str, org_name: str, org_slug: str, roles: list[str], permissions: set[str], is_member: bool, membership: Optional[dict], term_id: Optional[str]):
        self.org_id = org_id
        self.org_name = org_name
        self.org_slug = org_slug
        self.roles = roles
        self.permissions = permissions
        self.is_member = is_member
        self.membership = membership
        self.term_id = term_id

    def has_permission(self, perm: str) -> bool:
        return perm in self.permissions

    def has_role(self, role: str) -> bool:
        return role in self.roles

def get_current_user(
    request: Request,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> dict:
    if not credentials or len(credentials.credentials)>4096:
        raise HTTPException(401,"Authentication required")
    payload=decode_access_token(credentials.credentials)
    user=db.execute(text("SELECT * FROM users WHERE id=:uid"),{"uid":payload["sub"]}).mappings().first()
    if not user:
        raise HTTPException(401,"Please sign in again")
    if user["status"]!="ACTIVE" or user["email_verified_at"] is None:
        raise HTTPException(403,"Account is not active and verified")
    live=db.execute(text("""SELECT 1 FROM refresh_tokens WHERE user_id=:uid AND family_id=:family
       AND revoked_at IS NULL AND expires_at>now() AND credential_version=:version
       AND organization_id IS NOT DISTINCT FROM CAST(:org AS uuid)"""),
       dict(uid=user["id"],family=payload["sid"],version=user["credential_version"],org=payload["org_id"])).scalar()
    if not live:
        raise HTTPException(401,"Session has ended; sign in again")
    return {**dict(user),"token_payload":payload}


def require_platform_admin(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> dict:
    roles = db.execute(
        text("""
            SELECT r.code 
            FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = :uid 
              AND ur.organization_id IS NULL 
              AND ur.revoked_at IS NULL
              AND r.code = 'PLATFORM_ADMIN'
        """),
        {"uid": current_user["id"]}
    ).scalars().all()

    if "PLATFORM_ADMIN" not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Platform Administrator authority required."
        )

    return current_user

def get_current_org_context(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> OrgContext:
    # 1. Resolve org_id from path parameters or token
    org_id = request.path_params.get("org_id")
    token_org_id = current_user.get("token_payload", {}).get("org_id")

    if not org_id and token_org_id:
        org_id = token_org_id

    if not org_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No organization specified in request."
        )

    if str(org_id)!=str(token_org_id):
        raise HTTPException(403,"Select this organization before accessing it")
    if db.execute(text("SELECT 1 FROM user_roles ur JOIN roles r ON r.id=ur.role_id WHERE ur.user_id=:uid AND r.code='PLATFORM_ADMIN' AND ur.revoked_at IS NULL"),dict(uid=current_user["id"])).scalar():
        raise HTTPException(403,"Platform accounts cannot access organization resources")

    # 2. Check organization exists & is ACTIVE
    org = db.execute(
        text("SELECT * FROM organizations WHERE id = :oid"),
        {"oid": org_id}
    ).mappings().first()

    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    if org["status"] != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Organization is currently {org['status'].lower()}."
        )

    # 3. Check organization_users is ACTIVE
    org_user = db.execute(
        text("SELECT * FROM organization_users WHERE organization_id = :oid AND user_id = :uid"),
        {"oid": org_id, "uid": current_user["id"]}
    ).mappings().first()

    if not org_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this organization."
        )

    if org_user["status"] != "ACTIVE":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Your membership in this organization is {org_user['status'].lower()}."
        )

    # 4. Find current academic term for org
    term_row = db.execute(
        text("SELECT id FROM academic_terms WHERE organization_id = :oid AND is_current = true AND CURRENT_DATE BETWEEN start_date AND end_date"),
        {"oid": org_id}
    ).mappings().first()
    term_id = str(term_row["id"]) if term_row else None

    # 5. Load current-term roles for this user
    roles_rows = db.execute(
        text("""
            SELECT DISTINCT r.code
            FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = :uid
              AND ur.organization_id = :oid
              AND ur.revoked_at IS NULL
              AND (ur.valid_to IS NULL OR ur.valid_to >= now())
              AND ur.valid_from <= now() AND ur.term_id = CAST(:tid AS UUID)
        """),
        {"uid": current_user["id"], "oid": org_id, "tid": term_id}
    ).scalars().all()
    roles = list(roles_rows)

    # 6. Load Union of Permissions from DB function fn_user_permissions
    perms_rows = db.execute(
        text("SELECT permission_code FROM fn_user_permissions(:uid, :oid)"),
        {"uid": current_user["id"], "oid": org_id}
    ).scalars().all()
    permissions = set(perms_rows)

    # 7. Check derived is_member status
    is_member = db.execute(
        text("SELECT fn_is_member(:uid, :oid)"),
        {"uid": current_user["id"], "oid": org_id}
    ).scalar() or False

    membership_row = db.execute(
        text("""
            SELECT m.*, mp.name as plan_name 
            FROM memberships m
            JOIN membership_plans mp ON mp.id = m.plan_id
            WHERE m.user_id = :uid AND m.organization_id = :oid AND m.status = 'ACTIVE'
            ORDER BY m.end_date DESC LIMIT 1
        """),
        {"uid": current_user["id"], "oid": org_id}
    ).mappings().first()

    return OrgContext(
        org_id=str(org["id"]),
        org_name=org["name"],
        org_slug=org["slug"],
        roles=roles,
        permissions=permissions,
        is_member=bool(is_member),
        membership=dict(membership_row) if membership_row else None,
        term_id=term_id
    )

def require_permission(perm: str) -> Callable:
    def dependency(org_ctx: OrgContext = Depends(get_current_org_context)) -> OrgContext:
        if not org_ctx.has_permission(perm):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Missing required permission: '{perm}'."
            )
        return org_ctx
    return dependency

def require_any_permissions(perms: list[str]) -> Callable:
    def dependency(org_ctx: OrgContext = Depends(get_current_org_context)) -> OrgContext:
        if not any(org_ctx.has_permission(p) for p in perms):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires at least one of the following permissions: {perms}."
            )
        return org_ctx
    return dependency
