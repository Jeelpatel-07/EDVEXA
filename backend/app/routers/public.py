from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db import get_db

router = APIRouter(prefix="/public", tags=["Public Portal"])


def _format_public_event(ev: dict, ticket_types: list) -> dict:
    prices = [float(t["member_price"]) for t in ticket_types] + [float(t["non_member_price"]) for t in ticket_types]
    min_price = min(prices) if prices else 0.0
    total_capacity = sum(t["quantity_total"] for t in ticket_types) if ticket_types else (ev.get("capacity") or 0)
    total_sold = sum(t["quantity_sold"] for t in ticket_types) if ticket_types else (ev.get("total_sold") or 0)

    tts_formatted = [
        {
            "id": str(t["id"]),
            "name": t["name"],
            "title": t["name"],
            "member_price": float(t["member_price"]),
            "memberPrice": float(t["member_price"]),
            "non_member_price": float(t["non_member_price"]),
            "nonMemberPrice": float(t["non_member_price"]),
            "price": float(t["member_price"]),
            "quantity_total": t["quantity_total"],
            "quantity_sold": t["quantity_sold"],
            "max_per_order": t.get("max_per_order", 10),
            "remaining_seats": t["quantity_total"] - t["quantity_sold"],
            "remainingSeats": t["quantity_total"] - t["quantity_sold"],
        }
        for t in ticket_types
    ]

    return {
        "id": str(ev["id"]),
        "title": ev["title"],
        "name": ev["title"],
        "description": ev["description"],
        "location": ev["location"],
        "venue": ev["location"],
        "start_time": str(ev["start_time"]),
        "startDate": str(ev["start_time"]),
        "startTime": str(ev["start_time"]),
        "end_time": str(ev["end_time"]) if ev.get("end_time") else None,
        "endDate": str(ev["end_time"]) if ev.get("end_time") else None,
        "endTime": str(ev["end_time"]) if ev.get("end_time") else None,
        "banner_url": ev["banner_url"],
        "bannerUrl": ev["banner_url"],
        "image": ev["banner_url"],
        "imageUrl": ev["banner_url"],
        "category": ev.get("category") or "Campus",
        "status": ev.get("status") or "PUBLISHED",
        "visibility": ev.get("visibility") or "PUBLIC",
        "price": min_price,
        "minPrice": min_price,
        "capacity": total_capacity,
        "registeredCount": total_sold,
        "ticket_types": tts_formatted,
        "ticketTypes": tts_formatted,
    }


def _format_public_announcement(a: dict) -> dict:
    pub_date = a.get("published_at") or a.get("publish_at") or a.get("created_at")
    return {
        "id": str(a["id"]),
        "title": a["title"],
        "content": a["content"],
        "category": a.get("category") or "General",
        "author": a.get("author_name") or "Administrator",
        "authorName": a.get("author_name") or "Administrator",
        "isPinned": bool(a.get("is_pinned")),
        "pinned": bool(a.get("is_pinned")),
        "publishedAt": str(pub_date) if pub_date else None,
        "publishAt": str(a.get("publish_at")) if a.get("publish_at") else None,
        "createdAt": str(a.get("created_at")) if a.get("created_at") else None,
        "date": str(pub_date) if pub_date else None,
        "priority": "HIGH" if a.get("is_pinned") else "NORMAL",
    }


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

        results.append(_format_public_event(ev, tts))
    return results


@router.get("/o/{slug}/events/{event_id}")
def get_public_event_detail(slug: str, event_id: str, db: Session = Depends(get_db)):
    org = db.execute(
        text("SELECT id FROM organizations WHERE slug = :slug AND status = 'ACTIVE'"),
        {"slug": slug.strip().lower()}
    ).mappings().first()

    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    ev = db.execute(
        text("""
            SELECT e.*, 
                   coalesce(SUM(tt.quantity_sold), 0)::INT as total_sold
            FROM events e
            LEFT JOIN ticket_types tt ON tt.event_id = e.id
            WHERE e.id = :eid AND e.organization_id = :oid AND e.status = 'PUBLISHED' AND e.visibility = 'PUBLIC'
            GROUP BY e.id
        """),
        {"eid": event_id, "oid": org["id"]}
    ).mappings().first()

    if not ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found or not publicly available.")

    tts = db.execute(
        text("SELECT id, name, member_price, non_member_price, quantity_total, quantity_sold, max_per_order FROM ticket_types WHERE event_id = :eid"),
        {"eid": ev["id"]}
    ).mappings().all()

    return _format_public_event(ev, tts)


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
            SELECT a.*, u.full_name as author_name
            FROM announcements a
            JOIN users u ON u.id = a.author_id
            WHERE a.organization_id = :oid AND a.audience = 'ALL' AND a.publish_at <= now()
            ORDER BY a.is_pinned DESC, a.publish_at DESC
        """),
        {"oid": org["id"]}
    ).mappings().all()

    return [_format_public_announcement(a) for a in anns]


@router.get("/o/{slug}/announcements/{announcement_id}")
def get_public_announcement_detail(slug: str, announcement_id: str, db: Session = Depends(get_db)):
    org = db.execute(
        text("SELECT id FROM organizations WHERE slug = :slug AND status = 'ACTIVE'"),
        {"slug": slug.strip().lower()}
    ).mappings().first()

    if not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found.")

    a = db.execute(
        text("""
            SELECT a.*, u.full_name as author_name
            FROM announcements a
            JOIN users u ON u.id = a.author_id
            WHERE a.id = :aid AND a.organization_id = :oid AND a.audience = 'ALL' AND a.publish_at <= now()
        """),
        {"aid": announcement_id, "oid": org["id"]}
    ).mappings().first()

    if not a:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Announcement not found.")

    return _format_public_announcement(a)
