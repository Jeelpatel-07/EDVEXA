import json
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db import get_db
from app.config import settings
from app.deps import require_platform_admin
from app.schemas.platform import (
    OrganizationCreate, OrganizationUpdate, OrgSuspendRequest,
    OrgAdminInvite, PlatformAdminDirectInvite, PlatformSettingsUpdate
)
from app.services.auth_service import hash_token, send_email_notification

router = APIRouter(prefix="/platform", tags=["Platform Admin"])

@router.get("/stats")
def get_platform_stats(admin: dict = Depends(require_platform_admin), db: Session = Depends(get_db)):
    row = db.execute(text("SELECT * FROM v_platform_stats")).mappings().first()
    return dict(row) if row else {}

@router.get("/organizations")
def list_organizations(admin: dict = Depends(require_platform_admin), db: Session = Depends(get_db)):
    orgs = db.execute(
        text("""
            SELECT 
                o.*,
                (SELECT COUNT(*) FROM organization_users ou WHERE ou.organization_id = o.id AND ou.status = 'ACTIVE') as total_users,
                (SELECT COUNT(*) FROM memberships m WHERE m.organization_id = o.id AND m.status = 'ACTIVE' AND m.end_date >= CURRENT_DATE) as active_members,
                (SELECT COUNT(*) FROM events e WHERE e.organization_id = o.id) as total_events
            FROM organizations o
            ORDER BY o.created_at DESC
        """)
    ).mappings().all()
    return [dict(o) for o in orgs]

@router.post("/organizations", status_code=status.HTTP_201_CREATED)
def create_organization(req: OrganizationCreate, admin: dict = Depends(require_platform_admin), db: Session = Depends(get_db)):
    # Check slug and join_code uniqueness
    slug_exists = db.execute(text("SELECT 1 FROM organizations WHERE slug = :slug"), {"slug": req.slug.strip().lower()}).scalar()
    if slug_exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An organization with this slug already exists.")

    jcode_exists = db.execute(text("SELECT 1 FROM organizations WHERE join_code = :code"), {"code": req.join_code.strip()}).scalar()
    if jcode_exists:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Join code is already in use by another organization.")

    org_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    current_year = now.year

    db.execute(
        text("""
            INSERT INTO organizations (id, name, slug, status, join_code, member_number_prefix, currency, timezone, settings, created_by, created_at)
            VALUES (:id, :name, :slug, 'ACTIVE', :jcode, :prefix, :curr, :tz, :settings, :cby, :now)
        """),
        {
            "id": org_id,
            "name": req.name.strip(),
            "slug": req.slug.strip().lower(),
            "jcode": req.join_code.strip(),
            "prefix": req.member_number_prefix.strip().upper(),
            "curr": req.currency,
            "tz": req.timezone,
            "settings": json.dumps(req.settings or {}),
            "cby": admin["id"],
            "now": now
        }
    )

    # Initialize current academic term "2026-27"
    term_id = str(uuid.uuid4())
    db.execute(
        text("""
            INSERT INTO academic_terms (id, organization_id, name, start_date, end_date, is_current, created_at)
            VALUES (:id, :oid, '2026-27', :sdate, :edate, true, :now)
        """),
        {
            "id": term_id,
            "oid": org_id,
            "sdate": f"{current_year}-06-01",
            "edate": f"{current_year + 1}-05-31",
            "now": now
        }
    )

    # Initialize sequences
    for k in ["ORDER", "CLAIM", "MEMBER"]:
        db.execute(
            text("""
                INSERT INTO org_sequences (organization_id, seq_key, year, next_value)
                VALUES (:oid, :k, :yr, 1)
            """),
            {"oid": org_id, "k": k, "yr": current_year}
        )

    # Initialize default budget categories
    categories = [
        ("Dues", "INCOME", "Membership annual and semester dues"),
        ("Tickets", "INCOME", "Revenue from event ticket admissions"),
        ("Merch", "INCOME", "Revenue from merchandise catalog"),
        ("Fundraising", "INCOME", "Donations and fundraiser campaign proceeds"),
        ("Venue", "EXPENSE", "Hall and equipment rentals"),
        ("Supplies", "EXPENSE", "Event logistics and materials"),
        ("Marketing", "EXPENSE", "Promotional printouts and digital advertising")
    ]
    for cname, ctype, cdesc in categories:
        db.execute(
            text("""
                INSERT INTO budget_categories (organization_id, name, type, description, created_at)
                VALUES (:oid, :name, :type, :desc, :now)
            """),
            {"oid": org_id, "name": cname, "type": ctype, "desc": cdesc, "now": now}
        )

    # If admin email provided, invite initial ORG_ADMIN
    invite_url = None
    if req.admin_email:
        role_oa = db.execute(text("SELECT id FROM roles WHERE code = 'ORG_ADMIN'")).mappings().first()
        raw_tok = secrets.token_urlsafe(32)
        tok_h = hash_token(raw_tok)
        exp = now + timedelta(days=7)

        db.execute(
            text("""
                INSERT INTO invitations (organization_id, email, role_id, token_hash, invited_by, invited_by_role, expires_at, created_at)
                VALUES (:oid, :email, :rid, :thash, :ibro, 'PLATFORM_ADMIN', :exp, :now)
            """),
            {
                "oid": org_id,
                "email": req.admin_email.strip().lower(),
                "rid": role_oa["id"],
                "thash": tok_h,
                "ibro": admin["id"],
                "exp": exp,
                "now": now
            }
        )

        invite_url = f"{settings.APP_BASE_URL}/accept-invite#token={raw_tok}"
        send_email_notification(
            recipient=req.admin_email,
            subject=f"You are invited to administrate {req.name} on EDVEXA",
            message=f"You have been granted Organization Administrator access for {req.name}.",
            link=invite_url
        )

    # Audit log
    db.execute(
        text("""
            INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, target_type, target_id, details, created_at)
            VALUES (:oid, :aid, :aemail, 'ORGANIZATION_CREATE', 'ORGANIZATION', :tid, :det, :now)
        """),
        {
            "oid": org_id,
            "aid": admin["id"],
            "aemail": admin["email"],
            "tid": org_id,
            "det": json.dumps({"name": req.name, "slug": req.slug, "admin_email": req.admin_email}),
            "now": now
        }
    )

    db.commit()

    created_org = db.execute(text("SELECT * FROM organizations WHERE id = :id"), {"id": org_id}).mappings().first()
    res = dict(created_org)
    if invite_url:
        res["admin_invite_url"] = invite_url
    return res

@router.get("/organizations/{id}")
def get_organization(id: str, admin: dict = Depends(require_platform_admin), db: Session = Depends(get_db)):
    org = db.execute(text("SELECT * FROM organizations WHERE id = :id"), {"id": id}).mappings().first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
    return dict(org)

@router.patch("/organizations/{id}")
def update_organization(id: str, req: OrganizationUpdate, admin: dict = Depends(require_platform_admin), db: Session = Depends(get_db)):
    org = db.execute(text("SELECT * FROM organizations WHERE id = :id"), {"id": id}).mappings().first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    now = datetime.now(timezone.utc)
    updates = []
    params = {"id": id, "now": now}

    if req.name is not None:
        updates.append("name = :name")
        params["name"] = req.name.strip()
    if req.join_code is not None:
        updates.append("join_code = :jcode")
        params["jcode"] = req.join_code.strip()
    if req.member_number_prefix is not None:
        updates.append("member_number_prefix = :pfx")
        params["pfx"] = req.member_number_prefix.strip().upper()
    if req.currency is not None:
        updates.append("currency = :curr")
        params["curr"] = req.currency.strip()
    if req.timezone is not None:
        updates.append("timezone = :tz")
        params["tz"] = req.timezone.strip()
    if req.settings is not None:
        updates.append("settings = :settings")
        params["settings"] = json.dumps(req.settings)

    if updates:
        updates.append("updated_at = :now")
        db.execute(text(f"UPDATE organizations SET {', '.join(updates)} WHERE id = :id"), params)

        db.execute(
            text("""
                INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, target_type, target_id, details, created_at)
                VALUES (:oid, :aid, :aemail, 'ORGANIZATION_UPDATE', 'ORGANIZATION', :tid, :det, :now)
            """),
            {
                "oid": id,
                "aid": admin["id"],
                "aemail": admin["email"],
                "tid": id,
                "det": json.dumps(params, default=str),
                "now": now
            }
        )
        db.commit()

    updated = db.execute(text("SELECT * FROM organizations WHERE id = :id"), {"id": id}).mappings().first()
    return dict(updated)

@router.post("/organizations/{id}/suspend")
def suspend_organization(id: str, req: OrgSuspendRequest, admin: dict = Depends(require_platform_admin), db: Session = Depends(get_db)):
    org = db.execute(text("SELECT * FROM organizations WHERE id = :id"), {"id": id}).mappings().first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    now = datetime.now(timezone.utc)
    db.execute(
        text("UPDATE organizations SET status = 'SUSPENDED', updated_at = :now WHERE id = :id"),
        {"now": now, "id": id}
    )

    db.execute(
        text("""
            INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, target_type, target_id, details, created_at)
            VALUES (:oid, :aid, :aemail, 'ORGANIZATION_SUSPEND', 'ORGANIZATION', :tid, :det, :now)
        """),
        {
            "oid": id,
            "aid": admin["id"],
            "aemail": admin["email"],
            "tid": id,
            "det": json.dumps({"reason": req.reason}),
            "now": now
        }
    )
    db.commit()

    return {"message": "Organization suspended successfully.", "organization_id": id, "status": "SUSPENDED"}

@router.post("/organizations/{id}/activate")
def activate_organization(id: str, admin: dict = Depends(require_platform_admin), db: Session = Depends(get_db)):
    org = db.execute(text("SELECT * FROM organizations WHERE id = :id"), {"id": id}).mappings().first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    now = datetime.now(timezone.utc)
    db.execute(
        text("UPDATE organizations SET status = 'ACTIVE', updated_at = :now WHERE id = :id"),
        {"now": now, "id": id}
    )

    db.execute(
        text("""
            INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, target_type, target_id, details, created_at)
            VALUES (:oid, :aid, :aemail, 'ORGANIZATION_ACTIVATE', 'ORGANIZATION', :tid, :det, :now)
        """),
        {
            "oid": id,
            "aid": admin["id"],
            "aemail": admin["email"],
            "tid": id,
            "det": json.dumps({"status": "ACTIVE"}),
            "now": now
        }
    )
    db.commit()

    return {"message": "Organization activated successfully.", "organization_id": id, "status": "ACTIVE"}

@router.post("/organizations/{id}/admins", status_code=status.HTTP_201_CREATED)
def invite_org_admin(id: str, req: OrgAdminInvite, admin: dict = Depends(require_platform_admin), db: Session = Depends(get_db)):
    org = db.execute(text("SELECT * FROM organizations WHERE id = :id"), {"id": id}).mappings().first()
    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    now = datetime.now(timezone.utc)
    role_oa = db.execute(text("SELECT id FROM roles WHERE code = 'ORG_ADMIN'")).mappings().first()
    raw_tok = secrets.token_urlsafe(32)
    tok_h = hash_token(raw_tok)
    exp = now + timedelta(days=7)

    db.execute(
        text("""
            INSERT INTO invitations (organization_id, email, role_id, token_hash, invited_by, invited_by_role, expires_at, created_at)
            VALUES (:oid, :email, :rid, :thash, :ibro, 'PLATFORM_ADMIN', :exp, :now)
        """),
        {
            "oid": id,
            "email": req.email.strip().lower(),
            "rid": role_oa["id"],
            "thash": tok_h,
            "ibro": admin["id"],
            "exp": exp,
            "now": now
        }
    )

    db.execute(
        text("""
            INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, target_type, target_id, details, created_at)
            VALUES (:oid, :aid, :aemail, 'ORG_ADMIN_INVITE', 'USER', NULL, :det, :now)
        """),
        {
            "oid": id,
            "aid": admin["id"],
            "aemail": admin["email"],
            "det": json.dumps({"email": req.email, "org_name": org["name"]}),
            "now": now
        }
    )
    db.commit()

    invite_url = f"{settings.APP_BASE_URL}/accept-invite#token={raw_tok}"
    send_email_notification(
        recipient=req.email,
        subject=f"Organization Administrator Invitation for {org['name']}",
        message=f"You have been invited as an Organization Administrator for {org['name']}.",
        link=invite_url
    )

    return {
        "message": f"Invitation dispatched to {req.email}.",
        "invite_url": invite_url
    }

@router.post("/admins", status_code=status.HTTP_201_CREATED)
def invite_org_admin_direct(req: PlatformAdminDirectInvite, admin: dict = Depends(require_platform_admin), db: Session = Depends(get_db)):
    return invite_org_admin(id=req.organization_id, req=OrgAdminInvite(email=req.email, full_name=req.full_name), admin=admin, db=db)

@router.get("/audit-logs")
def get_platform_audit_logs(admin: dict = Depends(require_platform_admin), db: Session = Depends(get_db)):
    logs = db.execute(
        text("""
            SELECT al.*, o.name as organization_name
            FROM audit_logs al
            LEFT JOIN organizations o ON o.id = al.organization_id
            ORDER BY al.created_at DESC
            LIMIT 100
        """)
    ).mappings().all()
    return [dict(l) for l in logs]

@router.get("/settings")
def get_platform_settings(admin: dict = Depends(require_platform_admin), db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT key, value FROM platform_settings")).mappings().all()
    return {r["key"]: r["value"] for r in rows}

@router.put("/settings")
def update_platform_settings(req: PlatformSettingsUpdate, admin: dict = Depends(require_platform_admin), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    for k, v in req.settings.items():
        db.execute(
            text("""
                INSERT INTO platform_settings (key, value, updated_at)
                VALUES (:k, :v, :now)
                ON CONFLICT (key) DO UPDATE SET value = :v, updated_at = :now
            """),
            {"k": k, "v": json.dumps(v), "now": now}
        )

    db.execute(
        text("""
            INSERT INTO audit_logs (organization_id, actor_id, actor_email, action, target_type, target_id, details, created_at)
            VALUES (NULL, :aid, :aemail, 'PLATFORM_SETTINGS_UPDATE', 'SETTINGS', NULL, :det, :now)
        """),
        {
            "aid": admin["id"],
            "aemail": admin["email"],
            "det": json.dumps(req.settings),
            "now": now
        }
    )
    db.commit()
    return {"message": "Settings updated successfully."}

@router.get("/users")
def get_platform_users(admin: dict = Depends(require_platform_admin), db: Session = Depends(get_db)):
    # Basic list, no club finances/tickets/orders per R7
    users = db.execute(
        text("""
            SELECT 
                u.id, u.email, u.full_name, u.status, u.created_via, u.created_at, u.last_login_at,
                (SELECT COUNT(*) FROM organization_users ou WHERE ou.user_id = u.id) as organization_count
            FROM users u
            ORDER BY u.created_at DESC
            LIMIT 200
        """)
    ).mappings().all()
    return [dict(u) for u in users]
