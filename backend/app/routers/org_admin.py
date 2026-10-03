import json
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db import get_db
from app.config import settings
from app.deps import get_current_org_context, require_permission, OrgContext
from app.schemas.org import (
    UserInviteRequest, RoleAssignRequest, UserStatusUpdateRequest,
    AcademicTermCreate, ManualMembershipRequest
)
from app.services.auth_service import hash_token, send_email_notification

router = APIRouter(prefix="/orgs/{org_id}", tags=["Organization Admin"])

@router.get("/users")
def list_org_users(
    search: Optional[str] = None,
    role_filter: Optional[str] = None,
    org_ctx: OrgContext = Depends(require_permission("users.view")),
    db: Session = Depends(get_db)
):
    query = """
        SELECT 
            u.id, u.email, u.full_name, u.phone, u.status as account_status,
            ou.status as org_status, ou.student_id, ou.joined_via, ou.created_at as joined_at,
            fn_is_member(u.id, :oid) as is_member,
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT r.code), NULL) as roles,
            ARRAY_REMOVE(ARRAY_AGG(DISTINCT ur.id), NULL) as user_role_ids
        FROM organization_users ou
        JOIN users u ON u.id = ou.user_id
        LEFT JOIN user_roles ur ON ur.user_id = u.id AND ur.organization_id = :oid AND ur.revoked_at IS NULL
          AND (ur.term_id IS NULL OR CAST(:tid AS UUID) IS NULL OR ur.term_id = CAST(:tid AS UUID))
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE ou.organization_id = :oid
    """
    params = {"oid": org_ctx.org_id, "tid": org_ctx.term_id}

    if search:
        query += " AND (u.full_name ILIKE :search OR u.email ILIKE :search OR ou.student_id ILIKE :search)"
        params["search"] = f"%{search.strip()}%"

    query += " GROUP BY u.id, u.email, u.full_name, u.phone, u.status, ou.status, ou.student_id, ou.joined_via, ou.created_at"
    query += " ORDER BY ou.created_at DESC"

    rows = db.execute(text(query), params).mappings().all()

    results = []
    for r in rows:
        roles_list = list(r["roles"] or [])
        if role_filter and role_filter not in roles_list:
            continue
        results.append({
            "id": str(r["id"]),
            "email": r["email"],
            "full_name": r["full_name"],
            "phone": r["phone"],
            "account_status": r["account_status"],
            "org_status": r["org_status"],
            "student_id": r["student_id"],
            "joined_via": r["joined_via"],
            "joined_at": r["joined_at"],
            "is_member": bool(r["is_member"]),
            "roles": roles_list
        })
    return results

@router.post("/users/invite", status_code=status.HTTP_201_CREATED)
def invite_user(
    req: UserInviteRequest,
    org_ctx: OrgContext = Depends(require_permission("users.invite")),
    db: Session = Depends(get_db)
):
    # Enforce R3: Only assignable roles (TREASURER, EVENT_MANAGER, GATE_STAFF, VOLUNTEER)
    role = db.execute(
        text("SELECT * FROM roles WHERE code = :code"),
        {"code": req.role_code.strip().upper()}
    ).mappings().first()

    if not role or not role["is_assignable_via_api"] or role["created_by_role"] != "ORG_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Role '{req.role_code}' cannot be assigned via staff invitation. Only TREASURER, EVENT_MANAGER, GATE_STAFF, and VOLUNTEER are permitted."
        )

    now = datetime.now(timezone.utc)
    raw_tok = secrets.token_urlsafe(32)
    tok_h = hash_token(raw_tok)
    exp = now + timedelta(days=7)

    db.execute(
        text("""
            INSERT INTO invitations (organization_id, email, role_id, token_hash, invited_by, invited_by_role, expires_at, created_at)
            VALUES (:oid, :email, :rid, :thash, :ibro, 'ORG_ADMIN', :exp, :now)
        """),
        {
            "oid": org_ctx.org_id,
            "email": req.email.strip().lower(),
            "rid": role["id"],
            "thash": tok_h,
            "ibro": db.execute(text("SELECT id FROM users WHERE email = :e"), {"e": org_ctx.org_name}).scalar(),
            "exp": exp,
            "now": now
        }
    )

    db.execute(
        text("""
            INSERT INTO audit_logs (organization_id, actor_email, action, target_type, details, created_at)
            VALUES (:oid, :actor, 'STAFF_INVITE', 'USER', :det, :now)
        """),
        {
            "oid": org_ctx.org_id,
            "actor": "org_admin",
            "det": json.dumps({"email": req.email, "role": req.role_code}),
            "now": now
        }
    )
    db.commit()

    invite_url = f"{settings.APP_BASE_URL}/accept-invite#token={raw_tok}"
    send_email_notification(
        recipient=req.email,
        subject=f"Staff Invitation for {org_ctx.org_name}",
        message=f"You have been invited as {role['name']} for {org_ctx.org_name}.",
        link=invite_url
    )

    return {
        "message": f"Invitation created for {req.email}.",
        "invite_url": invite_url
    }

@router.post("/users/{user_id}/roles")
def assign_role(
    user_id: str,
    req: RoleAssignRequest,
    org_ctx: OrgContext = Depends(require_permission("users.assign_role")),
    db: Session = Depends(get_db)
):
    # Enforce R3: ORG_ADMIN cannot assign ORG_ADMIN or PLATFORM_ADMIN!
    role = db.execute(
        text("SELECT * FROM roles WHERE code = :code"),
        {"code": req.role_code.strip().upper()}
    ).mappings().first()

    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found.")

    if not role["is_assignable_via_api"] or role["created_by_role"] != "ORG_ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Forbidden: You cannot assign role '{req.role_code}'. Only TREASURER, EVENT_MANAGER, GATE_STAFF, and VOLUNTEER can be assigned by an Org Admin."
        )

    # Check target user belongs to org
    ou = db.execute(
        text("SELECT * FROM organization_users WHERE organization_id = :oid AND user_id = :uid"),
        {"oid": org_ctx.org_id, "uid": user_id}
    ).mappings().first()

    if not ou:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User is not a member of this organization.")

    # Check if role already assigned for this term
    existing = db.execute(
        text("""
            SELECT id FROM user_roles 
            WHERE user_id = :uid AND organization_id = :oid AND role_id = :rid 
              AND term_id = CAST(:tid AS UUID) AND revoked_at IS NULL
        """),
        {"uid": user_id, "oid": org_ctx.org_id, "rid": role["id"], "tid": org_ctx.term_id}
    ).scalar()

    if existing:
        return {"message": "User already has this role for the active term."}

    now = datetime.now(timezone.utc)
    db.execute(
        text("""
            INSERT INTO user_roles (user_id, role_id, organization_id, term_id, valid_from, created_at)
            VALUES (:uid, :rid, :oid, :tid, :now, :now)
        """),
        {
            "uid": user_id,
            "rid": role["id"],
            "oid": org_ctx.org_id,
            "tid": org_ctx.term_id,
            "now": now
        }
    )

    db.execute(
        text("""
            INSERT INTO audit_logs (organization_id, actor_email, action, target_type, target_id, details, created_at)
            VALUES (:oid, :actor, 'ROLE_ASSIGN', 'USER_ROLE', :tid, :det, :now)
        """),
        {
            "oid": org_ctx.org_id,
            "actor": "org_admin",
            "tid": user_id,
            "det": json.dumps({"role_code": req.role_code, "term_id": org_ctx.term_id}),
            "now": now
        }
    )
    db.commit()

    return {"message": f"Role '{req.role_code}' successfully assigned to user."}

@router.delete("/users/{user_id}/roles/{role_code}")
def revoke_role(
    user_id: str,
    role_code: str,
    org_ctx: OrgContext = Depends(require_permission("users.assign_role")),
    db: Session = Depends(get_db)
):
    if role_code.upper() not in {"TREASURER","EVENT_MANAGER","GATE_STAFF","VOLUNTEER"}:
        raise HTTPException(403,"Only delegated staff roles can be revoked here")
    role = db.execute(text("SELECT id FROM roles WHERE code = :code"), {"code": role_code.strip().upper()}).mappings().first()
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Role not found.")

    now = datetime.now(timezone.utc)

    # Check last admin protection if revoking ORG_ADMIN
    if role_code.strip().upper() == "ORG_ADMIN":
        active_admins = db.execute(
            text("""
                SELECT COUNT(*) FROM user_roles ur
                JOIN organization_users ou ON ou.user_id = ur.user_id AND ou.organization_id = ur.organization_id
                WHERE ur.organization_id = :oid AND ur.role_id = :rid AND ur.revoked_at IS NULL AND ou.status = 'ACTIVE'
            """),
            {"oid": org_ctx.org_id, "rid": role["id"]}
        ).scalar() or 0

        if active_admins <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Last-Admin Protection: An organization must always keep at least one active ORG_ADMIN."
            )

    res = db.execute(
        text("""
            UPDATE user_roles 
            SET revoked_at = :now, updated_at = :now 
            WHERE user_id = :uid AND organization_id = :oid AND role_id = :rid AND revoked_at IS NULL
        """),
        {"now": now, "uid": user_id, "oid": org_ctx.org_id, "rid": role["id"]}
    )

    if res.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active role assignment not found.")

    db.execute(
        text("""
            INSERT INTO audit_logs (organization_id, actor_email, action, target_type, target_id, details, created_at)
            VALUES (:oid, :actor, 'ROLE_REVOKE', 'USER_ROLE', :tid, :det, :now)
        """),
        {
            "oid": org_ctx.org_id,
            "actor": "org_admin",
            "tid": user_id,
            "det": json.dumps({"role_code": role_code}),
            "now": now
        }
    )
    db.commit()

    return {"message": f"Role '{role_code}' revoked successfully."}

@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    req: UserStatusUpdateRequest,
    org_ctx: OrgContext = Depends(require_permission("users.assign_role")),
    db: Session = Depends(get_db)
):
    # Check if target is last active ORG_ADMIN
    if req.status != "ACTIVE":
        oa_role = db.execute(text("SELECT id FROM roles WHERE code = 'ORG_ADMIN'")).mappings().first()
        is_admin = db.execute(
            text("""
                SELECT 1 FROM user_roles 
                WHERE user_id = :uid AND organization_id = :oid AND role_id = :rid AND revoked_at IS NULL
            """),
            {"uid": user_id, "oid": org_ctx.org_id, "rid": oa_role["id"]}
        ).scalar()

        if is_admin:
            active_admins = db.execute(
                text("""
                    SELECT COUNT(*) FROM user_roles ur
                    JOIN organization_users ou ON ou.user_id = ur.user_id AND ou.organization_id = ur.organization_id
                    WHERE ur.organization_id = :oid AND ur.role_id = :rid AND ur.revoked_at IS NULL AND ou.status = 'ACTIVE'
                      AND ur.user_id != :uid
                """),
                {"oid": org_ctx.org_id, "rid": oa_role["id"], "uid": user_id}
            ).scalar() or 0

            if active_admins == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Cannot suspend the last active Organization Administrator."
                )

    now = datetime.now(timezone.utc)
    db.execute(
        text("""
            UPDATE organization_users 
            SET status = :st, updated_at = :now 
            WHERE organization_id = :oid AND user_id = :uid
        """),
        {"st": req.status, "now": now, "oid": org_ctx.org_id, "uid": user_id}
    )

    db.execute(
        text("""
            INSERT INTO audit_logs (organization_id, actor_email, action, target_type, target_id, details, created_at)
            VALUES (:oid, :actor, 'USER_STATUS_UPDATE', 'USER', :tid, :det, :now)
        """),
        {
            "oid": org_ctx.org_id,
            "actor": "org_admin",
            "tid": user_id,
            "det": json.dumps({"new_status": req.status}),
            "now": now
        }
    )
    db.commit()

    return {"message": f"User organization status updated to {req.status}."}

@router.get("/settings")
def get_org_settings(org_ctx: OrgContext = Depends(require_permission("organization.settings.update")), db: Session = Depends(get_db)):
    org = db.execute(text("SELECT * FROM organizations WHERE id = :oid"), {"oid": org_ctx.org_id}).mappings().first()
    return dict(org)

@router.patch("/settings")
def update_org_settings(
    updates: dict,
    org_ctx: OrgContext = Depends(require_permission("organization.settings.update")),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    clauses = []
    params = {"oid": org_ctx.org_id, "now": now}

    if "name" in updates:
        clauses.append("name = :name")
        params["name"] = updates["name"].strip()
    if "join_code" in updates:
        # Check uniqueness
        dup = db.execute(
            text("SELECT id FROM organizations WHERE join_code = :jcode AND id != :oid"),
            {"jcode": updates["join_code"].strip(), "oid": org_ctx.org_id}
        ).scalar()
        if dup:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Join code is already in use.")
        clauses.append("join_code = :jcode")
        params["jcode"] = updates["join_code"].strip()
    if "settings" in updates:
        clauses.append("settings = :settings")
        params["settings"] = json.dumps(updates["settings"])

    if clauses:
        clauses.append("updated_at = :now")
        db.execute(text(f"UPDATE organizations SET {', '.join(clauses)} WHERE id = :oid"), params)
        db.commit()

    updated = db.execute(text("SELECT * FROM organizations WHERE id = :oid"), {"oid": org_ctx.org_id}).mappings().first()
    return dict(updated)

@router.get("/terms")
def list_terms(org_ctx: OrgContext = Depends(get_current_org_context), db: Session = Depends(get_db)):
    terms = db.execute(
        text("SELECT * FROM academic_terms WHERE organization_id = :oid ORDER BY start_date DESC"),
        {"oid": org_ctx.org_id}
    ).mappings().all()
    return [dict(t) for t in terms]

@router.post("/terms", status_code=status.HTTP_201_CREATED)
def create_term(req: AcademicTermCreate, org_ctx: OrgContext = Depends(require_permission("organization.settings.update")), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    term_id = str(uuid.uuid4())

    if req.is_current:
        # Reset current term
        db.execute(text("UPDATE academic_terms SET is_current = false WHERE organization_id = :oid"), {"oid": org_ctx.org_id})

    db.execute(
        text("""
            INSERT INTO academic_terms (id, organization_id, name, start_date, end_date, is_current, created_at)
            VALUES (:id, :oid, :name, :sdate, :edate, :curr, :now)
        """),
        {
            "id": term_id,
            "oid": org_ctx.org_id,
            "name": req.name.strip(),
            "sdate": req.start_date,
            "edate": req.end_date,
            "curr": req.is_current,
            "now": now
        }
    )
    db.commit()
    created = db.execute(text("SELECT * FROM academic_terms WHERE id = :id"), {"id": term_id}).mappings().first()
    return dict(created)

@router.patch("/terms/{term_id}/current")
def set_current_term(term_id: str, org_ctx: OrgContext = Depends(require_permission("organization.settings.update")), db: Session = Depends(get_db)):
    db.execute(text("UPDATE academic_terms SET is_current = false WHERE organization_id = :oid"), {"oid": org_ctx.org_id})
    res = db.execute(text("UPDATE academic_terms SET is_current = true WHERE id = :tid AND organization_id = :oid"), {"tid": term_id, "oid": org_ctx.org_id})
    if res.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Term not found.")
    db.commit()
    return {"message": "Current academic term updated."}

@router.get("/audit-logs")
def get_org_audit_logs(org_ctx: OrgContext = Depends(require_permission("audit.view_org")), db: Session = Depends(get_db)):
    logs = db.execute(
        text("SELECT * FROM audit_logs WHERE organization_id = :oid ORDER BY created_at DESC LIMIT 100"),
        {"oid": org_ctx.org_id}
    ).mappings().all()
    return [dict(l) for l in logs]
