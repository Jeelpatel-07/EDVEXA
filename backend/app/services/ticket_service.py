import io
from datetime import datetime, timezone
from typing import Tuple, Optional
import qrcode
from sqlalchemy import text
from sqlalchemy.orm import Session

def scan_ticket(db: Session, code: str, scanner_user_id: str, scanner_org_id: str) -> dict:
    now = datetime.now(timezone.utc)

    # 1. Lookup ticket by code
    ticket = db.execute(
        text("""
            SELECT t.*, u.full_name as holder_name, e.title as event_title, tt.name as ticket_type_name
            FROM tickets t
            JOIN users u ON u.id = t.user_id
            JOIN events e ON e.id = t.event_id
            JOIN ticket_types tt ON tt.id = t.ticket_type_id
            WHERE t.ticket_code = :code FOR UPDATE OF t
        """),
        {"code": code.strip()}
    ).mappings().first()

    if not ticket:
        return {
            "status": "INVALID",
            "message": "Invalid ticket code. Ticket does not exist.",
            "ticket_code": code,
            "is_member": False
        }

    # 2. Check Organization Match (Tenant isolation)
    if str(ticket["organization_id"]) != str(scanner_org_id):
        return {
            "status": "WRONG_ORGANIZATION",
            "message": "Ticket belongs to a different organization.",
            "ticket_code": code,
            "holder_name": ticket["holder_name"],
            "event_title": ticket["event_title"],
            "is_member": False
        }

    # 3. Check Cancelled or Refunded
    if ticket["status"] == "CANCELLED":
        return {
            "status": "CANCELLED",
            "message": "This ticket has been cancelled.",
            "ticket_code": code,
            "holder_name": ticket["holder_name"],
            "event_title": ticket["event_title"],
            "is_member": False
        }
    if ticket["status"] == "REFUNDED":
        return {
            "status": "REFUNDED",
            "message": "This ticket was refunded and is no longer valid.",
            "ticket_code": code,
            "holder_name": ticket["holder_name"],
            "event_title": ticket["event_title"],
            "is_member": False
        }

    # 4. Check If Already Used
    if ticket["status"] == "USED":
        ci = db.execute(
            text("SELECT checked_in_at FROM check_ins WHERE ticket_id = :tid"),
            {"tid": ticket["id"]}
        ).mappings().first()
        time_str = ci["checked_in_at"].strftime("%H:%M:%S") if ci and ci["checked_in_at"] else "previously"
        return {
            "status": "ALREADY_USED",
            "message": f"Ticket already used at {time_str}.",
            "ticket_code": code,
            "holder_name": ticket["holder_name"],
            "event_title": ticket["event_title"],
            "ticket_type": ticket["ticket_type_name"],
            "is_member": ticket["was_member_price"],
            "checked_in_at": ci["checked_in_at"] if ci else None
        }

    # 5. Check Membership Badge
    is_member = db.execute(
        text("SELECT fn_is_member(:uid, :oid)"),
        {"uid": ticket["user_id"], "oid": scanner_org_id}
    ).scalar() or False

    # 6. Check In Ticket
    db.execute(
        text("""
            INSERT INTO check_ins (organization_id, ticket_id, scanned_by, membership_verified, method, checked_in_at)
            VALUES (:oid, :tid, :scanby, :mem_ver, 'QR', :now)
        """),
        {
            "oid": scanner_org_id,
            "tid": ticket["id"],
            "scanby": scanner_user_id,
            "mem_ver": bool(is_member),
            "now": now
        }
    )

    db.execute(
        text("UPDATE tickets SET status = 'USED', updated_at = :now WHERE id = :id"),
        {"now": now, "id": ticket["id"]}
    )
    db.commit()

    return {
        "status": "VALID",
        "message": "Ticket successfully verified and checked in.",
        "ticket_code": code,
        "holder_name": ticket["holder_name"],
        "event_title": ticket["event_title"],
        "ticket_type": ticket["ticket_type_name"],
        "is_member": bool(is_member),
        "checked_in_at": now,
        "ticket_id": str(ticket["id"])
    }

def refund_ticket(db: Session, ticket_id: str, org_id: str, operator_user_id: str) -> dict:
    now = datetime.now(timezone.utc)
    tkt = db.execute(
        text("SELECT * FROM tickets WHERE id = :id AND organization_id = :oid FOR UPDATE"),
        {"id": ticket_id, "oid": org_id}
    ).mappings().first()

    if not tkt:
        raise ValueError("Ticket not found.")

    if tkt["status"] in ("CANCELLED", "REFUNDED"):
        raise ValueError("Ticket is already refunded or cancelled.")

    # 1. Update ticket status
    db.execute(
        text("UPDATE tickets SET status = 'REFUNDED', updated_at = :now WHERE id = :id"),
        {"now": now, "id": ticket_id}
    )

    # 2. Restore seat
    db.execute(
        text("UPDATE ticket_types SET quantity_sold = quantity_sold - 1 WHERE id = :id"),
        {"id": tkt["ticket_type_id"]}
    )

    # 3. Post Ledger OUT (source_type REFUND)
    term_row = db.execute(
        text("SELECT id FROM academic_terms WHERE organization_id = :oid AND is_current = true"),
        {"oid": org_id}
    ).mappings().first()
    term_id = str(term_row["id"]) if term_row else None

    cat = db.execute(
        text("SELECT id FROM budget_categories WHERE organization_id = :oid AND name = 'Tickets'"),
        {"oid": org_id}
    ).mappings().first()
    category_id = str(cat["id"]) if cat else None

    db.execute(
        text("""
            INSERT INTO ledger_entries (organization_id, term_id, category_id, direction, amount, source_type, description, reference_number, recorded_by, created_at)
            VALUES (:oid, :tid, :cid, 'OUT', :amt, 'REFUND', :desc, :ref, :recby, :now)
        """),
        {
            "oid": org_id,
            "tid": term_id,
            "cid": category_id,
            "amt": tkt["price_paid"],
            "desc": f"Refund for ticket {tkt['ticket_code']}",
            "ref": tkt["ticket_code"],
            "recby": operator_user_id,
            "now": now
        }
    )

    db.commit()
    return {"ticket_id": ticket_id, "status": "REFUNDED", "amount": float(tkt["price_paid"])}

def generate_qr_png_bytes(data: str) -> bytes:
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0F766E", back_color="white")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
