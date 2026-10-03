import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db import get_db
from app.deps import get_current_org_context, require_permission, OrgContext
from app.schemas.events import EventCreate, EventUpdate, TicketTypeCreate, TicketTypeUpdate

router = APIRouter(prefix="/orgs/{org_id}/events", tags=["Events & Ticketing"])

@router.get("")
def list_events(
    status_filter: Optional[str] = None,
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    query = """
        SELECT e.*, 
            coalesce(SUM(tt.quantity_sold), 0)::INT as total_sold,
            (SELECT COUNT(*) FROM check_ins ci JOIN tickets t ON t.id = ci.ticket_id WHERE t.event_id = e.id)::INT as total_checked_in
        FROM events e
        LEFT JOIN ticket_types tt ON tt.event_id = e.id
        WHERE e.organization_id = :oid
    """
    params = {"oid": org_ctx.org_id}

    if status_filter:
        query += " AND e.status = :st"
        params["st"] = status_filter.upper()

    query += " GROUP BY e.id ORDER BY e.start_time ASC"
    rows = db.execute(text(query), params).mappings().all()

    results = []
    for r in rows:
        ticket_types = db.execute(
            text("SELECT * FROM ticket_types WHERE event_id = :eid AND organization_id = :oid ORDER BY member_price ASC"),
            {"eid": r["id"], "oid": org_ctx.org_id}
        ).mappings().all()

        tt_list = []
        for tt in ticket_types:
            # Resolve viewer price based on member status
            applicable_price = float(tt["member_price"]) if org_ctx.is_member else float(tt["non_member_price"])
            tt_list.append({
                "id": str(tt["id"]),
                "name": tt["name"],
                "member_price": float(tt["member_price"]),
                "non_member_price": float(tt["non_member_price"]),
                "applicable_price": applicable_price,
                "quantity_total": tt["quantity_total"],
                "quantity_sold": tt["quantity_sold"],
                "remaining_seats": tt["quantity_total"] - tt["quantity_sold"],
                "max_per_order": tt["max_per_order"]
            })

        results.append({
            "id": str(r["id"]),
            "title": r["title"],
            "description": r["description"],
            "location": r["location"],
            "start_time": r["start_time"],
            "end_time": r["end_time"],
            "status": r["status"],
            "visibility": r["visibility"],
            "total_capacity": r["total_capacity"],
            "total_sold": r["total_sold"],
            "total_checked_in": r["total_checked_in"],
            "banner_url": r["banner_url"],
            "ticket_types": tt_list
        })
    return results

@router.post("", status_code=status.HTTP_201_CREATED)
def create_event(req: EventCreate, org_ctx: OrgContext = Depends(require_permission("events.create")), db: Session = Depends(get_db)):
    event_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    db.execute(
        text("""
            INSERT INTO events (id, organization_id, title, description, location, start_time, end_time, status, visibility, total_capacity, sales_open_at, sales_close_at, budget_amount, fundraiser_id, term_id, banner_url, created_at)
            VALUES (:id, :oid, :title, :desc, :loc, :st, :et, 'DRAFT', :vis, :cap, :so, :sc, :bamt, :fid, :tid, :burl, :now)
        """),
        {
            "id": event_id,
            "oid": org_ctx.org_id,
            "title": req.title.strip(),
            "desc": req.description,
            "loc": req.location,
            "st": req.start_time,
            "et": req.end_time,
            "vis": req.visibility,
            "cap": req.total_capacity,
            "so": req.sales_open_at,
            "sc": req.sales_close_at,
            "bamt": req.budget_amount,
            "fid": req.fundraiser_id,
            "tid": req.term_id or org_ctx.term_id,
            "burl": req.banner_url,
            "now": now
        }
    )

    for tt in req.ticket_types:
        db.execute(
            text("""
                INSERT INTO ticket_types (organization_id, event_id, name, member_price, non_member_price, quantity_total, quantity_sold, max_per_order, created_at)
                VALUES (:oid, :eid, :name, :mprice, :nprice, :qty, 0, :max_ord, :now)
            """),
            {
                "oid": org_ctx.org_id,
                "eid": event_id,
                "name": tt.name.strip(),
                "mprice": tt.member_price,
                "nprice": tt.non_member_price,
                "qty": tt.quantity_total,
                "max_ord": tt.max_per_order,
                "now": now
            }
        )

    db.commit()
    return {"message": "Event created successfully in DRAFT mode.", "id": event_id}

@router.get("/{event_id}")
def get_event(event_id: str, org_ctx: OrgContext = Depends(get_current_org_context), db: Session = Depends(get_db)):
    ev = db.execute(
        text("SELECT * FROM events WHERE id = :id AND organization_id = :oid"),
        {"id": event_id, "oid": org_ctx.org_id}
    ).mappings().first()

    if not ev:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found.")

    ticket_types = db.execute(
        text("SELECT * FROM ticket_types WHERE event_id = :eid AND organization_id = :oid"),
        {"eid": event_id, "oid": org_ctx.org_id}
    ).mappings().all()

    tt_list = []
    for tt in ticket_types:
        applicable_price = float(tt["member_price"]) if org_ctx.is_member else float(tt["non_member_price"])
        tt_list.append({
            "id": str(tt["id"]),
            "name": tt["name"],
            "member_price": float(tt["member_price"]),
            "non_member_price": float(tt["non_member_price"]),
            "applicable_price": applicable_price,
            "quantity_total": tt["quantity_total"],
            "quantity_sold": tt["quantity_sold"],
            "remaining_seats": tt["quantity_total"] - tt["quantity_sold"],
            "max_per_order": tt["max_per_order"]
        })

    res = dict(ev)
    res["ticket_types"] = tt_list
    return res

@router.patch("/{event_id}")
def update_event(event_id: str, req: EventUpdate, org_ctx: OrgContext = Depends(require_permission("events.update")), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    clauses = []
    params = {"id": event_id, "oid": org_ctx.org_id, "now": now}

    for k, v in req.model_dump(exclude_unset=True).items():
        clauses.append(f"{k} = :{k}")
        params[k] = v

    if clauses:
        clauses.append("updated_at = :now")
        db.execute(text(f"UPDATE events SET {', '.join(clauses)} WHERE id = :id AND organization_id = :oid"), params)
        db.commit()

    return {"message": "Event updated successfully."}

@router.delete("/{event_id}")
def delete_event(event_id: str, org_ctx: OrgContext = Depends(require_permission("events.delete")), db: Session = Depends(get_db)):
    db.execute(
        text("UPDATE events SET status = 'CANCELLED' WHERE id = :id AND organization_id = :oid"),
        {"id": event_id, "oid": org_ctx.org_id}
    )
    db.commit()
    return {"message": "Event cancelled."}

@router.post("/{event_id}/publish")
def publish_event(event_id: str, org_ctx: OrgContext = Depends(require_permission("events.update")), db: Session = Depends(get_db)):
    db.execute(
        text("UPDATE events SET status = 'PUBLISHED', updated_at = now() WHERE id = :id AND organization_id = :oid"),
        {"id": event_id, "oid": org_ctx.org_id}
    )
    db.commit()
    return {"message": "Event is now PUBLISHED."}

@router.post("/{event_id}/close")
def close_event(event_id: str, org_ctx: OrgContext = Depends(require_permission("events.update")), db: Session = Depends(get_db)):
    db.execute(
        text("UPDATE events SET status = 'CLOSED', updated_at = now() WHERE id = :id AND organization_id = :oid"),
        {"id": event_id, "oid": org_ctx.org_id}
    )
    db.commit()
    return {"message": "Event ticket sales CLOSED."}

@router.get("/{event_id}/report")
def get_event_report(event_id: str, org_ctx: OrgContext = Depends(require_permission("events.update")), db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT * FROM v_event_report WHERE event_id = :id AND organization_id = :oid"),
        {"id": event_id, "oid": org_ctx.org_id}
    ).mappings().first()

    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event report not found.")

    return dict(row)

@router.get("/{event_id}/attendees")
def get_event_attendees(event_id: str, org_ctx: OrgContext = Depends(require_permission("events.update")), db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT t.id, t.ticket_code, t.price_paid, t.was_member_price, t.status,
                   u.full_name, u.email, tt.name as ticket_type_name,
                   ci.checked_in_at, ci.membership_verified, ci.method as check_in_method
            FROM tickets t
            JOIN users u ON u.id = t.user_id
            JOIN ticket_types tt ON tt.id = t.ticket_type_id
            LEFT JOIN check_ins ci ON ci.ticket_id = t.id
            WHERE t.event_id = :eid AND t.organization_id = :oid
            ORDER BY t.created_at DESC
        """),
        {"eid": event_id, "oid": org_ctx.org_id}
    ).mappings().all()
    return [dict(r) for r in rows]

@router.post("/{event_id}/ticket-types", status_code=status.HTTP_201_CREATED)
def create_ticket_type(event_id: str, req: TicketTypeCreate, org_ctx: OrgContext = Depends(require_permission("tickets.manage")), db: Session = Depends(get_db)):
    tt_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    db.execute(
        text("""
            INSERT INTO ticket_types (id, organization_id, event_id, name, member_price, non_member_price, quantity_total, quantity_sold, max_per_order, created_at)
            VALUES (:id, :oid, :eid, :name, :mprice, :nprice, :qty, 0, :max_ord, :now)
        """),
        {
            "id": tt_id,
            "oid": org_ctx.org_id,
            "eid": event_id,
            "name": req.name.strip(),
            "mprice": req.member_price,
            "nprice": req.non_member_price,
            "qty": req.quantity_total,
            "max_ord": req.max_per_order,
            "now": now
        }
    )
    db.commit()
    return {"message": "Ticket type created.", "id": tt_id}
