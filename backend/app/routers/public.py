from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db import get_db

router = APIRouter(prefix="/public", tags=["Public Portal"])

@router.get("/organizations")
def list_public_organizations(
    join_code: Optional[str] = None,
    db: Session = Depends(get_db)
):
    if join_code:
        org = db.execute(
            text("SELECT id, name, slug, status, member_number_prefix, settings FROM organizations WHERE join_code = :code AND status = 'ACTIVE'"),
            {"code": join_code.strip()}
        ).mappings().first()
        if not org:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active organization found with this join code.")
        return [dict(org)]

    orgs = db.execute(
        text("SELECT id, name, slug, status, member_number_prefix, settings FROM organizations WHERE status = 'ACTIVE' ORDER BY name ASC")
    ).mappings().all()
    return [dict(o) for o in orgs]

@router.get("/o/{slug}")
def get_public_org(slug: str, db: Session = Depends(get_db)):
    org = db.execute(
        text("SELECT id, name, slug, status, currency, timezone, settings FROM organizations WHERE slug = :slug AND status = 'ACTIVE'"),
        {"slug": slug.strip().lower()}
    ).mappings().first()

    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")
    return dict(org)

@router.get("/o/{slug}/events")
def get_public_events(slug: str, db: Session = Depends(get_db)):
    org = db.execute(
        text("SELECT id FROM organizations WHERE slug = :slug AND status = 'ACTIVE'"),
        {"slug": slug.strip().lower()}
    ).mappings().first()

    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    events = db.execute(
        text("""
            SELECT e.*, 
                   coalesce(SUM(tt.quantity_sold), 0)::INT as total_sold
            FROM events e
            LEFT JOIN ticket_types tt ON tt.event_id = e.id
            WHERE e.organization_id = :oid AND e.status = 'PUBLISHED' AND e.visibility = 'PUBLIC'
            GROUP BY e.id
            ORDER BY e.start_time ASC
        """),
        {"oid": org["id"]}
    ).mappings().all()

    results = []
    for ev in events:
        tts = db.execute(
            text("SELECT id, name, member_price, non_member_price, quantity_total, quantity_sold, max_per_order FROM ticket_types WHERE event_id = :eid"),
            {"eid": ev["id"]}
        ).mappings().all()

        results.append({
            "id": str(ev["id"]),
            "title": ev["title"],
            "description": ev["description"],
            "location": ev["location"],
            "start_time": ev["start_time"],
            "end_time": ev["end_time"],
            "banner_url": ev["banner_url"],
            "ticket_types": [
                {
                    "id": str(t["id"]),
                    "name": t["name"],
                    "member_price": float(t["member_price"]),
                    "non_member_price": float(t["non_member_price"]),
                    "remaining_seats": t["quantity_total"] - t["quantity_sold"]
                }
                for t in tts
            ]
        })
    return results

@router.get("/o/{slug}/announcements")
def get_public_announcements(slug: str, db: Session = Depends(get_db)):
    org = db.execute(
        text("SELECT id FROM organizations WHERE slug = :slug AND status = 'ACTIVE'"),
        {"slug": slug.strip().lower()}
    ).mappings().first()

    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    anns = db.execute(
        text("""
            SELECT a.id, a.title, a.content, a.category, a.is_pinned, a.publish_at, a.published_at, u.full_name as author_name
            FROM announcements a
            JOIN users u ON u.id = a.author_id
            WHERE a.organization_id = :oid AND a.audience = 'ALL' AND a.publish_at <= now()
            ORDER BY a.is_pinned DESC, a.publish_at DESC
        """),
        {"oid": org["id"]}
    ).mappings().all()

    return [dict(a) for a in anns]
