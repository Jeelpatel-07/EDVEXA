from typing import Tuple, Optional
from sqlalchemy import text
from sqlalchemy.orm import Session

def resolve_ticket_price(db: Session, user_id: str, org_id: str, ticket_type_id: str) -> Tuple[float, bool]:
    is_member = db.execute(
        text("SELECT fn_is_member(:uid, :oid)"),
        {"uid": user_id, "oid": org_id}
    ).scalar() or False

    ticket_type = db.execute(
        text("SELECT member_price, non_member_price FROM ticket_types WHERE id = :ttid AND organization_id = :oid"),
        {"ttid": ticket_type_id, "oid": org_id}
    ).mappings().first()

    if not ticket_type:
        raise ValueError("Ticket type not found.")

    if is_member:
        return ticket_type["member_price"], True
    else:
        return ticket_type["non_member_price"], False

def resolve_product_price(db: Session, user_id: str, org_id: str, variant_id: str) -> Tuple[float, bool]:
    is_member = db.execute(
        text("SELECT fn_is_member(:uid, :oid)"),
        {"uid": user_id, "oid": org_id}
    ).scalar() or False

    prod = db.execute(
        text("""
            SELECT p.base_price, p.member_price
            FROM product_variants pv
            JOIN products p ON p.id = pv.product_id
            WHERE pv.id = :vid AND pv.organization_id = :oid
        """),
        {"vid": variant_id, "oid": org_id}
    ).mappings().first()

    if not prod:
        raise ValueError("Product variant not found.")

    if is_member:
        return prod["member_price"], True
    else:
        return prod["base_price"], False

def resolve_membership_price(db: Session, org_id: str, plan_id: str) -> float:
    plan = db.execute(
        text("SELECT price FROM membership_plans WHERE id = :pid AND organization_id = :oid AND is_active = true"),
        {"pid": plan_id, "oid": org_id}
    ).mappings().first()

    if not plan:
        raise ValueError("Membership plan not found or inactive.")

    return plan["price"]
