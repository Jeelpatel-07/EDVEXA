import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db import get_db
from app.deps import get_current_org_context, require_permission, OrgContext, get_current_user
from app.schemas.announcements import AnnouncementCreate, AnnouncementUpdate, MailingSubscribeRequest

router = APIRouter(prefix="/orgs/{org_id}/announcements", tags=["Announcements & Notifications"])

@router.get("")
def list_announcements(
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    query = """
        SELECT a.*, u.full_name as author_name
        FROM announcements a
        JOIN users u ON u.id = a.author_id
        WHERE a.organization_id = :oid AND a.publish_at <= now()
    """
    params = {"oid": org_ctx.org_id}

    # Audience filter
    if not (org_ctx.has_role("ORG_ADMIN") or org_ctx.has_role("EVENT_MANAGER")):
        if org_ctx.is_member:
            query += " AND a.audience IN ('ALL', 'MEMBERS_ONLY')"
        elif org_ctx.has_role("VOLUNTEER"):
            query += " AND a.audience IN ('ALL', 'VOLUNTEERS')"
        else:
            query += " AND a.audience = 'ALL'"

    query += " ORDER BY a.is_pinned DESC, a.publish_at DESC"
    rows = db.execute(text(query), params).mappings().all()
    return [dict(r) for r in rows]

@router.post("", status_code=status.HTTP_201_CREATED)
def create_announcement(
    req: AnnouncementCreate,
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(require_permission("announcements.create")),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    ann_id = str(uuid.uuid4())
    pub_at = req.publish_at or now

    db.execute(
        text("""
            INSERT INTO announcements (id, organization_id, author_id, title, content, category, audience, is_pinned, publish_at, published_at, event_id, created_at)
            VALUES (:id, :oid, :aid, :title, :cnt, :cat, :aud, :pin, :pat, :pdat, :eid, :now)
        """),
        {
            "id": ann_id,
            "oid": org_ctx.org_id,
            "aid": current_user["id"],
            "title": req.title.strip(),
            "cnt": req.content.strip(),
            "cat": req.category.upper(),
            "aud": req.audience.upper(),
            "pin": req.is_pinned,
            "pat": pub_at,
            "pdat": now if pub_at <= now else None,
            "eid": req.event_id,
            "now": now
        }
    )

    # Fanout notifications if published now
    if pub_at <= now:
        # Fanout to target users based on audience
        target_query = "SELECT user_id FROM organization_users WHERE organization_id = :oid AND status = 'ACTIVE'"
        if req.audience.upper() == "MEMBERS_ONLY":
            target_query = """
                SELECT user_id FROM memberships 
                WHERE organization_id = :oid AND status = 'ACTIVE' AND payment_status = 'PAID' AND end_date >= CURRENT_DATE
            """
        elif req.audience.upper() == "VOLUNTEERS":
            target_query = """
                SELECT ur.user_id FROM user_roles ur
                JOIN roles r ON r.id = ur.role_id
                WHERE ur.organization_id = :oid AND r.code = 'VOLUNTEER' AND ur.revoked_at IS NULL
            """

        users = db.execute(text(target_query), {"oid": org_ctx.org_id}).scalars().all()
        for uid in users:
            db.execute(
                text("""
                    INSERT INTO notifications (organization_id, user_id, title, message, type, channel, status, created_at)
                    VALUES (:oid, :uid, :title, :msg, 'ANNOUNCEMENT', 'IN_APP', 'SENT', :now)
                """),
                {
                    "oid": org_ctx.org_id,
                    "uid": uid,
                    "title": req.title.strip(),
                    "msg": req.content.strip()[:200],
                    "now": now
                }
            )

    db.commit()
    return {"message": "Announcement created.", "id": ann_id}

@router.patch("/{announcement_id}")
def update_announcement(
    announcement_id: str,
    req: AnnouncementUpdate,
    org_ctx: OrgContext = Depends(require_permission("announcements.update")),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    clauses = []
    params = {"id": announcement_id, "oid": org_ctx.org_id, "now": now}

    for k, v in req.model_dump(exclude_unset=True).items():
        clauses.append(f"{k} = :{k}")
        params[k] = v

    if clauses:
        clauses.append("updated_at = :now")
        db.execute(text(f"UPDATE announcements SET {', '.join(clauses)} WHERE id = :id AND organization_id = :oid"), params)
        db.commit()

    return {"message": "Announcement updated."}

@router.delete("/{announcement_id}")
def delete_announcement(
    announcement_id: str,
    org_ctx: OrgContext = Depends(require_permission("announcements.delete")),
    db: Session = Depends(get_db)
):
    db.execute(
        text("DELETE FROM announcements WHERE id = :id AND organization_id = :oid"),
        {"id": announcement_id, "oid": org_ctx.org_id}
    )
    db.commit()
    return {"message": "Announcement deleted."}

@router.get("/notifications/me")
def get_my_notifications(
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    notes = db.execute(
        text("""
            SELECT * FROM notifications 
            WHERE user_id = :uid AND organization_id = :oid 
            ORDER BY created_at DESC 
            LIMIT 50
        """),
        {"uid": current_user["id"], "oid": org_ctx.org_id}
    ).mappings().all()
    return [dict(n) for n in notes]

@router.patch("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    db.execute(
        text("""
            UPDATE notifications 
            SET status = 'READ', read_at = :now, updated_at = :now 
            WHERE id = :id AND user_id = :uid AND organization_id = :oid
        """),
        {"now": now, "id": notification_id, "uid": current_user["id"], "oid": org_ctx.org_id}
    )
    db.commit()
    return {"message": "Notification marked as read."}

@router.post("/notifications/read-all")
def mark_all_notifications_read(
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    db.execute(
        text("""
            UPDATE notifications 
            SET status = 'READ', read_at = :now, updated_at = :now 
            WHERE user_id = :uid AND organization_id = :oid AND status != 'READ'
        """),
        {"now": now, "uid": current_user["id"], "oid": org_ctx.org_id}
    )
    db.commit()
    return {"message": "All notifications marked as read."}

@router.post("/subscribe")
def subscribe_mailing_list(
    req: MailingSubscribeRequest,
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    db.execute(
        text("""
            INSERT INTO mailing_subscribers (organization_id, email, subscribed_at)
            VALUES (:oid, :email, now())
            ON CONFLICT (organization_id, email) DO NOTHING
        """),
        {"oid": org_ctx.org_id, "email": req.email.strip().lower()}
    )
    db.commit()
    return {"message": "Subscribed to club mailing list."}
