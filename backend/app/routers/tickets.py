from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db import get_db
from app.deps import get_current_org_context, require_permission, OrgContext, get_current_user
from app.schemas.events import TicketScanRequest, TicketScanResponse
from app.services.ticket_service import scan_ticket, refund_ticket, generate_qr_png_bytes

router = APIRouter(prefix="/orgs/{org_id}/tickets", tags=["Tickets & Scanning"])

@router.get("/me")
def get_my_tickets(
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    tickets = db.execute(
        text("""
            SELECT t.*, e.title as event_title, e.location as event_location, e.start_time, e.end_time,
                   tt.name as ticket_type_name,
                   ci.checked_in_at
            FROM tickets t
            JOIN events e ON e.id = t.event_id
            JOIN ticket_types tt ON tt.id = t.ticket_type_id
            LEFT JOIN check_ins ci ON ci.ticket_id = t.id
            WHERE t.user_id = :uid AND t.organization_id = :oid
            ORDER BY e.start_time DESC
        """),
        {"uid": current_user["id"], "oid": org_ctx.org_id}
    ).mappings().all()
    return [dict(t) for t in tickets]

@router.get("/{ticket_id}")
def get_ticket_detail(
    ticket_id: str,
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    ticket = db.execute(
        text("""
            SELECT t.*, e.title as event_title, e.location as event_location, e.start_time, e.end_time,
                   tt.name as ticket_type_name, u.full_name as holder_name,
                   ci.checked_in_at
            FROM tickets t
            JOIN events e ON e.id = t.event_id
            JOIN ticket_types tt ON tt.id = t.ticket_type_id
            JOIN users u ON u.id = t.user_id
            LEFT JOIN check_ins ci ON ci.ticket_id = t.id
            WHERE t.id = :id AND t.organization_id = :oid
        """),
        {"id": ticket_id, "oid": org_ctx.org_id}
    ).mappings().first()

    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")

    # Ownership check: must be owner OR have tickets.manage permission
    if str(ticket["user_id"]) != str(current_user["id"]) and not org_ctx.has_permission("tickets.manage"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return dict(ticket)

@router.get("/{ticket_id}/qr")
def get_ticket_qr(ticket_id:str,current_user:dict=Depends(get_current_user),org_ctx:OrgContext=Depends(get_current_org_context),db:Session=Depends(get_db)):
    ticket=get_ticket_detail(ticket_id,current_user,org_ctx,db)
    return Response(content=generate_qr_png_bytes(ticket["ticket_code"]),media_type="image/png")

@router.post("/scan", response_model=TicketScanResponse)
def scan_ticket_endpoint(
    req: TicketScanRequest,
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(require_permission("tickets.scan")),
    db: Session = Depends(get_db)
):
    res = scan_ticket(
        db=db,
        code=req.code,
        scanner_user_id=str(current_user["id"]),
        scanner_org_id=org_ctx.org_id
    )
    return res

@router.post("/{ticket_id}/checkin")
def manual_checkin_endpoint(
    ticket_id: str,
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(require_permission("tickets.scan")),
    db: Session = Depends(get_db)
):
    ticket = db.execute(
        text("SELECT ticket_code FROM tickets WHERE id = :id AND organization_id = :oid"),
        {"id": ticket_id, "oid": org_ctx.org_id}
    ).mappings().first()

    if not ticket:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ticket not found.")

    res = scan_ticket(
        db=db,
        code=ticket["ticket_code"],
        scanner_user_id=str(current_user["id"]),
        scanner_org_id=org_ctx.org_id
    )
    return res

@router.post("/{ticket_id}/refund")
def refund_ticket_endpoint(
    ticket_id: str,
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(require_permission("tickets.refund")),
    db: Session = Depends(get_db)
):
    try:
        res = refund_ticket(
            db=db,
            ticket_id=ticket_id,
            org_id=org_ctx.org_id,
            operator_user_id=str(current_user["id"])
        )
        return res
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
