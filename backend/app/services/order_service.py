from decimal import Decimal
import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.services.pricing_service import resolve_ticket_price, resolve_product_price, resolve_membership_price

def create_order(db: Session, user_id: str, org_id: str, order_type: str, items: list[dict]) -> dict:
    now = datetime.now(timezone.utc)
    current_year = now.year
    expires_at = now + timedelta(minutes=15)

    # 1. Generate Order Number using org_sequences
    seq_num = db.execute(
        text("SELECT fn_next_sequence(:oid, 'ORDER', :yr)"),
        {"oid": org_id, "yr": current_year}
    ).scalar()

    org = db.execute(
        text("SELECT member_number_prefix FROM organizations WHERE id = :oid"),
        {"oid": org_id}
    ).mappings().first()
    prefix = org["member_number_prefix"] if org else "EDV"
    order_number = f"{prefix}-ORD-{current_year}-{seq_num:05d}"

    # 2. Process items, calculate server-side prices, and reserve stock FOR UPDATE
    total_amount = Decimal("0.00")
    processed_items = []

    for itm in sorted(items, key=lambda i: str(i.get("ticket_type_id") or i.get("variant_id") or i.get("plan_id"))):
        qty = itm.get("quantity", 1)
        if qty <= 0:
            raise ValueError("Quantity must be greater than zero.")

        if order_type == "TICKET":
            ttid = itm.get("ticket_type_id")
            if not ttid:
                raise ValueError("Missing ticket_type_id for ticket order.")

            # Concurrency protection with FOR UPDATE
            tt = db.execute(
                text("""
                    SELECT quantity_total, quantity_sold, member_price, non_member_price, max_per_order
                    FROM ticket_types
                    WHERE id = :id AND organization_id = :oid
                    FOR UPDATE
                """),
                {"id": ttid, "oid": org_id}
            ).mappings().first()

            if not tt:
                raise ValueError("Ticket type not found.")

            if tt["quantity_sold"] + qty > tt["quantity_total"]:
                raise ValueError("Not enough tickets remaining for this event tier.")

            unit_price, was_member = resolve_ticket_price(db, user_id, org_id, ttid)
            line_total = unit_price * qty
            total_amount += line_total

            # Reserve seats
            db.execute(
                text("UPDATE ticket_types SET quantity_sold = quantity_sold + :qty WHERE id = :id"),
                {"qty": qty, "id": ttid}
            )

            processed_items.append({
                "ticket_type_id": ttid,
                "variant_id": None,
                "plan_id": None,
                "quantity": qty,
                "unit_price": unit_price,
                "was_member_price": was_member
            })

        elif order_type == "MERCH":
            vid = itm.get("variant_id")
            if not vid:
                raise ValueError("Missing variant_id for merch order.")

            # Concurrency protection with FOR UPDATE
            var = db.execute(
                text("""
                    SELECT stock_quantity 
                    FROM product_variants 
                    WHERE id = :id AND organization_id = :oid
                    FOR UPDATE
                """),
                {"id": vid, "oid": org_id}
            ).mappings().first()

            if not var:
                raise ValueError("Product variant not found.")

            if var["stock_quantity"] < qty:
                raise ValueError("Insufficient stock for selected item.")

            unit_price, was_member = resolve_product_price(db, user_id, org_id, vid)
            line_total = unit_price * qty
            total_amount += line_total

            # Reserve stock
            db.execute(
                text("UPDATE product_variants SET stock_quantity = stock_quantity - :qty WHERE id = :id"),
                {"qty": qty, "id": vid}
            )

            processed_items.append({
                "ticket_type_id": None,
                "variant_id": vid,
                "plan_id": None,
                "quantity": qty,
                "unit_price": unit_price,
                "was_member_price": was_member
            })

        elif order_type == "MEMBERSHIP":
            pid = itm.get("plan_id")
            if not pid:
                raise ValueError("Missing plan_id for membership order.")

            unit_price = resolve_membership_price(db, org_id, pid)
            total_amount += unit_price

            processed_items.append({
                "ticket_type_id": None,
                "variant_id": None,
                "plan_id": pid,
                "quantity": 1,
                "unit_price": unit_price,
                "was_member_price": False
            })

    # 3. Create Order Row
    order_id = str(uuid.uuid4())
    db.execute(
        text("""
            INSERT INTO orders (id, organization_id, user_id, order_number, order_type, status, subtotal, discount_total, total, expires_at, created_at)
            VALUES (:id, :oid, :uid, :onum, :otype, 'PENDING', :sub, 0.00, :tot, :exp, :now)
        """),
        {
            "id": order_id,
            "oid": org_id,
            "uid": user_id,
            "onum": order_number,
            "otype": order_type,
            "sub": total_amount,
            "tot": total_amount,
            "exp": expires_at,
            "now": now
        }
    )

    # 4. Insert Order Items
    for itm in processed_items:
        db.execute(
            text("""
                INSERT INTO order_items (organization_id, order_id, ticket_type_id, variant_id, plan_id, quantity, unit_price, was_member_price, fulfillment_status)
                VALUES (:oid, :ord_id, :ttid, :vid, :pid, :qty, :uprice, :was_mem, :ful)
            """),
            {
                "oid": org_id,
                "ord_id": order_id,
                "ttid": itm["ticket_type_id"],
                "vid": itm["variant_id"],
                "pid": itm["plan_id"],
                "qty": itm["quantity"],
                "uprice": itm["unit_price"],
                "was_mem": itm["was_member_price"],
                "ful": "NONE" if order_type != "MERCH" else "NONE"
            }
        )

    db.commit()

    order_row = db.execute(
        text("SELECT * FROM orders WHERE id = :id"),
        {"id": order_id}
    ).mappings().first()

    return dict(order_row)

def process_order_payment(db: Session, order_id: str, org_id: str, payment_method: str = "ONLINE", idempotency_key: str = None, provider_ref: str = None, recorded_by: str = None) -> dict:
    now = datetime.now(timezone.utc)
    current_year = now.year
    idem_key = idempotency_key or f"idem_{order_id}_{uuid.uuid4().hex[:8]}"

    # Check idempotency: If payment already SUCCESS with this idempotency key
    existing_payment = db.execute(
        text("SELECT * FROM payments WHERE idempotency_key = :ikey AND organization_id = :oid"),
        {"ikey": idem_key, "oid": org_id}
    ).mappings().first()

    if existing_payment and str(existing_payment["order_id"]) != str(order_id):
        raise ValueError("Idempotency key already belongs to another order.")
    if existing_payment and existing_payment["status"] == "SUCCESS":
        order = db.execute(text("SELECT * FROM orders WHERE id = :id"), {"id": order_id}).mappings().first()
        return dict(order)

    # Lock order FOR UPDATE
    order = db.execute(
        text("SELECT * FROM orders WHERE id = :id AND organization_id = :oid FOR UPDATE"),
        {"id": order_id, "oid": org_id}
    ).mappings().first()

    if not order:
        raise ValueError("Order not found.")

    if order["status"] == "PAID":
        return dict(order)

    if order["status"] in ("CANCELLED", "REFUNDED"):
        raise ValueError("Cannot pay for a cancelled or refunded order.")

    if order["expires_at"] and order["expires_at"] <= now:
        raise ValueError("Reservation expired; create a new order.")

    # 1. Normalize payment method to database payment_method_enum (CARD, ONLINE, CASH, UPI)
    valid_methods = {"ONLINE", "CASH", "UPI", "CARD"}
    method_map = {
        "CAMPUS_CARD": "CARD",
        "CAMPUS_PAY": "CARD",
        "STRIPE_CARD": "CARD",
        "DEMO_PAY": "ONLINE",
        "MEMBER_BENEFIT": "CASH",
    }
    resolved_method = method_map.get(payment_method.upper(), payment_method.upper())
    if resolved_method not in valid_methods:
        resolved_method = "ONLINE"

    # Create Payment row
    payment_id = str(uuid.uuid4())
    db.execute(
        text("""
            INSERT INTO payments (id, organization_id, order_id, amount, method, status, provider_ref, idempotency_key, recorded_by, created_at)
            VALUES (:id, :oid, :ord_id, :amt, :mthd, 'SUCCESS', :pref, :ikey, :recby, :now)
        """),
        {
            "id": payment_id,
            "oid": org_id,
            "ord_id": order_id,
            "amt": order["total"],
            "mthd": resolved_method,
            "pref": provider_ref or f"PAY_{payment_method.upper()}_{uuid.uuid4().hex[:8].upper()}",
            "ikey": idem_key,
            "recby": recorded_by,
            "now": now
        }
    )

    # 2. Mark order as PAID
    db.execute(
        text("UPDATE orders SET status = 'PAID', updated_at = :now WHERE id = :id"),
        {"now": now, "id": order_id}
    )

    # 3. Find current academic term for ledger
    term_row = db.execute(
        text("SELECT id FROM academic_terms WHERE organization_id = :oid AND is_current = true"),
        {"oid": org_id}
    ).mappings().first()
    term_id = str(term_row["id"]) if term_row else None

    # Fetch order items
    items = db.execute(
        text("SELECT * FROM order_items WHERE order_id = :ord_id"),
        {"ord_id": order_id}
    ).mappings().all()

    # 4. Handle Fulfillment by order_type
    if order["order_type"] == "TICKET":
        # Determine income budget category
        cat = db.execute(
            text("SELECT id FROM budget_categories WHERE organization_id = :oid AND name = 'Tickets'"),
            {"oid": org_id}
        ).mappings().first()
        category_id = str(cat["id"]) if cat else None

        for item in items:
            tt = db.execute(
                text("SELECT event_id, name FROM ticket_types WHERE id = :id"),
                {"id": item["ticket_type_id"]}
            ).mappings().first()

            for _ in range(item["quantity"]):
                # 128-bit random ticket code
                tkt_code = f"EDV-TKT-{uuid.uuid4().hex[:16].upper()}"
                db.execute(
                    text("""
                        INSERT INTO tickets (organization_id, order_id, event_id, ticket_type_id, user_id, ticket_code, price_paid, was_member_price, status, created_at)
                        VALUES (:oid, :ord_id, :eid, :ttid, :uid, :code, :price, :was_mem, 'VALID', :now)
                    """),
                    {
                        "oid": org_id,
                        "ord_id": order_id,
                        "eid": tt["event_id"],
                        "ttid": item["ticket_type_id"],
                        "uid": order["user_id"],
                        "code": tkt_code,
                        "price": item["unit_price"],
                        "was_mem": item["was_member_price"],
                        "now": now
                    }
                )

        # Post Ledger IN for Tickets
        db.execute(
            text("""
                INSERT INTO ledger_entries (organization_id, term_id, category_id, direction, amount, source_type, payment_id, description, reference_number, recorded_by, created_at)
                VALUES (:oid, :tid, :cid, 'IN', :amt, 'PAYMENT', :pid, :desc, :ref, :recby, :now)
            """),
            {
                "oid": org_id,
                "tid": term_id,
                "cid": category_id,
                "amt": order["total"],
                "pid": payment_id,
                "desc": f"Ticket Order Payment - Order {order['order_number']}",
                "ref": order["order_number"],
                "recby": recorded_by,
                "now": now
            }
        )

    elif order["order_type"] == "MEMBERSHIP":
        cat = db.execute(
            text("SELECT id FROM budget_categories WHERE organization_id = :oid AND name = 'Dues'"),
            {"oid": org_id}
        ).mappings().first()
        category_id = str(cat["id"]) if cat else None

        for item in items:
            plan = db.execute(
                text("SELECT name, duration_days FROM membership_plans WHERE id = :id"),
                {"id": item["plan_id"]}
            ).mappings().first()

            duration = plan["duration_days"] if plan else 365
            start_date = now.date()
            end_date = (now + timedelta(days=duration)).date()

            # Sequence number for member_number
            m_seq = db.execute(
                text("SELECT fn_next_sequence(:oid, 'MEMBER', :yr)"),
                {"oid": org_id, "yr": current_year}
            ).scalar()

            org = db.execute(
                text("SELECT member_number_prefix FROM organizations WHERE id = :oid"),
                {"oid": org_id}
            ).mappings().first()
            prefix = org["member_number_prefix"] if org else "EDV"
            member_number = f"{prefix}-MEM-{current_year}-{m_seq:05d}"
            qr_tok = f"qr_mem_{secrets.token_hex(16)}"

            # Deactivate any previous active memberships for this user/org
            db.execute(
                text("UPDATE memberships SET status = 'EXPIRED' WHERE user_id = :uid AND organization_id = :oid AND status = 'ACTIVE'"),
                {"uid": order["user_id"], "oid": org_id}
            )

            # Insert new ACTIVE + PAID membership
            db.execute(
                text("""
                    INSERT INTO memberships (organization_id, user_id, plan_id, member_number, status, payment_status, start_date, end_date, order_id, qr_token, created_at)
                    VALUES (:oid, :uid, :pid, :mnum, 'ACTIVE', 'PAID', :sdate, :edate, :ord_id, :qrtok, :now)
                """),
                {
                    "oid": org_id,
                    "uid": order["user_id"],
                    "pid": item["plan_id"],
                    "mnum": member_number,
                    "sdate": start_date,
                    "edate": end_date,
                    "ord_id": order_id,
                    "qrtok": qr_tok,
                    "now": now
                }
            )

        # Post Ledger IN for Dues
        db.execute(
            text("""
                INSERT INTO ledger_entries (organization_id, term_id, category_id, direction, amount, source_type, payment_id, description, reference_number, recorded_by, created_at)
                VALUES (:oid, :tid, :cid, 'IN', :amt, 'PAYMENT', :pid, :desc, :ref, :recby, :now)
            """),
            {
                "oid": org_id,
                "tid": term_id,
                "cid": category_id,
                "amt": order["total"],
                "pid": payment_id,
                "desc": f"Membership Dues Payment - Order {order['order_number']}",
                "ref": order["order_number"],
                "recby": recorded_by,
                "now": now
            }
        )

    elif order["order_type"] == "MERCH":
        cat = db.execute(
            text("SELECT id FROM budget_categories WHERE organization_id = :oid AND name = 'Merch'"),
            {"oid": org_id}
        ).mappings().first()
        category_id = str(cat["id"]) if cat else None

        for item in items:
            # Record stock movement SALE
            db.execute(
                text("""
                    INSERT INTO stock_movements (organization_id, variant_id, movement_type, quantity_change, reference_order_id, notes, performed_by, created_at)
                    VALUES (:oid, :vid, 'SALE', :change, :ord_id, :notes, :perf, :now)
                """),
                {
                    "oid": org_id,
                    "vid": item["variant_id"],
                    "change": -item["quantity"],
                    "ord_id": order_id,
                    "notes": f"Sale via order {order['order_number']}",
                    "perf": recorded_by,
                    "now": now
                }
            )
            # Set item fulfillment status to READY
            db.execute(
                text("UPDATE order_items SET fulfillment_status = 'READY' WHERE id = :id"),
                {"id": item["id"]}
            )

        # Post Ledger IN for Merch
        db.execute(
            text("""
                INSERT INTO ledger_entries (organization_id, term_id, category_id, direction, amount, source_type, payment_id, description, reference_number, recorded_by, created_at)
                VALUES (:oid, :tid, :cid, 'IN', :amt, 'PAYMENT', :pid, :desc, :ref, :recby, :now)
            """),
            {
                "oid": org_id,
                "tid": term_id,
                "cid": category_id,
                "amt": order["total"],
                "pid": payment_id,
                "desc": f"Merchandise Sale Payment - Order {order['order_number']}",
                "ref": order["order_number"],
                "recby": recorded_by,
                "now": now
            }
        )

    # 5. In-App Notification
    db.execute(
        text("""
            INSERT INTO notifications (organization_id, user_id, title, message, type, channel, status, created_at)
            VALUES (:oid, :uid, :title, :msg, 'ORDER', 'IN_APP', 'SENT', :now)
        """),
        {
            "oid": org_id,
            "uid": order["user_id"],
            "title": f"Order {order['order_number']} Confirmed",
            "msg": f"Your payment of ₹{order['total']:.2f} for {order['order_type'].lower()} was successful!",
            "now": now
        }
    )

    db.commit()

    updated = db.execute(text("SELECT * FROM orders WHERE id = :id"), {"id": order_id}).mappings().first()
    return dict(updated)

def cancel_expired_orders(db: Session):
    now = datetime.now(timezone.utc)
    expired = db.execute(
        text("SELECT * FROM orders WHERE status = 'PENDING' AND expires_at < :now FOR UPDATE SKIP LOCKED"),
        {"now": now}
    ).mappings().all()

    for ord_row in expired:
        # Revert reserved stock or seats
        items = db.execute(
            text("SELECT * FROM order_items WHERE order_id = :ord_id"),
            {"ord_id": ord_row["id"]}
        ).mappings().all()

        for itm in items:
            if itm["ticket_type_id"]:
                db.execute(
                    text("UPDATE ticket_types SET quantity_sold = quantity_sold - :qty WHERE id = :id"),
                    {"qty": itm["quantity"], "id": itm["ticket_type_id"]}
                )
            elif itm["variant_id"]:
                db.execute(
                    text("UPDATE product_variants SET stock_quantity = stock_quantity + :qty WHERE id = :id"),
                    {"qty": itm["quantity"], "id": itm["variant_id"]}
                )

        db.execute(
            text("UPDATE orders SET status = 'CANCELLED', updated_at = :now WHERE id = :id"),
            {"now": now, "id": ord_row["id"]}
        )

    db.commit()
