import uuid
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db import get_db
from app.deps import get_current_org_context, require_permission, OrgContext
from app.schemas.org import MembershipPlanCreate, MembershipPlanUpdate, ManualMembershipRequest
from app.services.order_service import create_order, process_order_payment

router = APIRouter(prefix="/orgs/{org_id}/memberships", tags=["Memberships"])

@router.get("/plans")
def list_plans(org_ctx: OrgContext = Depends(get_current_org_context), db: Session = Depends(get_db)):
    plans = db.execute(
        text("SELECT * FROM membership_plans WHERE organization_id = :oid AND is_active = true ORDER BY price ASC"),
        {"oid": org_ctx.org_id}
    ).mappings().all()

    results = []
    for p in plans:
        benefits = db.execute(
            text("SELECT * FROM membership_benefits WHERE plan_id = :pid AND organization_id = :oid"),
            {"pid": p["id"], "oid": org_ctx.org_id}
        ).mappings().all()

        benefits_list = [dict(b) for b in benefits]
        features = [
            f"{b.get('discount_type', '').replace('_', ' ').title()}: {b.get('discount_value', 0)}% Off"
            if b.get('discount_type') and b.get('discount_value')
            else "Full Member Access"
            for b in benefits
        ] or ["Free or Discounted Event Passes", "20% Merchandise Discount", "Executive Board Voting Rights"]

        results.append({
            "id": str(p["id"]),
            "name": p["name"],
            "description": p["description"],
            "price": float(p["price"]),
            "duration_days": p["duration_days"],
            "durationMonths": max(1, p["duration_days"] // 30),
            "is_popular": "Gold" in p["name"] or "Annual" in p["name"],
            "isPopular": "Gold" in p["name"] or "Annual" in p["name"],
            "features": features,
            "benefits": benefits_list
        })
    return results

@router.post("/plans", status_code=status.HTTP_201_CREATED)
def create_plan(req: MembershipPlanCreate, org_ctx: OrgContext = Depends(require_permission("membership.plans.manage")), db: Session = Depends(get_db)):
    plan_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    db.execute(
        text("""
            INSERT INTO membership_plans (id, organization_id, name, description, price, duration_days, is_active, created_at)
            VALUES (:id, :oid, :name, :desc, :price, :dur, :act, :now)
        """),
        {
            "id": plan_id,
            "oid": org_ctx.org_id,
            "name": req.name.strip(),
            "desc": req.description,
            "price": req.price,
            "dur": req.duration_days,
            "act": req.is_active,
            "now": now
        }
    )

    for b in req.benefits:
        db.execute(
            text("""
                INSERT INTO membership_benefits (organization_id, plan_id, applies_to, discount_type, discount_value, created_at)
                VALUES (:oid, :pid, :app, :dtype, :dval, :now)
            """),
            {
                "oid": org_ctx.org_id,
                "pid": plan_id,
                "app": b.applies_to,
                "dtype": b.discount_type,
                "dval": b.discount_value,
                "now": now
            }
        )

    db.commit()
    return {"message": "Membership plan created successfully.", "id": plan_id}

@router.patch("/plans/{plan_id}")
def update_plan(plan_id: str, req: MembershipPlanUpdate, org_ctx: OrgContext = Depends(require_permission("membership.plans.manage")), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    updates = []
    params = {"id": plan_id, "oid": org_ctx.org_id, "now": now}

    if req.name is not None:
        updates.append("name = :name")
        params["name"] = req.name.strip()
    if req.description is not None:
        updates.append("description = :desc")
        params["desc"] = req.description
    if req.price is not None:
        updates.append("price = :price")
        params["price"] = req.price
    if req.duration_days is not None:
        updates.append("duration_days = :dur")
        params["dur"] = req.duration_days
    if req.is_active is not None:
        updates.append("is_active = :act")
        params["act"] = req.is_active

    if updates:
        updates.append("updated_at = :now")
        db.execute(text(f"UPDATE membership_plans SET {', '.join(updates)} WHERE id = :id AND organization_id = :oid"), params)
        db.commit()

    return {"message": "Plan updated successfully."}

@router.delete("/plans/{plan_id}")
def delete_plan(plan_id: str, org_ctx: OrgContext = Depends(require_permission("membership.plans.manage")), db: Session = Depends(get_db)):
    db.execute(
        text("UPDATE membership_plans SET is_active = false WHERE id = :id AND organization_id = :oid"),
        {"id": plan_id, "oid": org_ctx.org_id}
    )
    db.commit()
    return {"message": "Plan marked inactive."}

@router.get("/me")
def get_my_membership(org_ctx: OrgContext = Depends(get_current_org_context)):
    return {
        "is_member": org_ctx.is_member,
        "membership": org_ctx.membership
    }

@router.get("/verify/{qr_token}")
def verify_membership_qr(qr_token: str, org_ctx: OrgContext = Depends(get_current_org_context), db: Session = Depends(get_db)):
    m = db.execute(
        text("""
            SELECT m.*, u.full_name, u.email, mp.name as plan_name
            FROM memberships m
            JOIN users u ON u.id = m.user_id
            JOIN membership_plans mp ON mp.id = m.plan_id
            WHERE m.qr_token = :tok AND m.organization_id = :oid
        """),
        {"tok": qr_token.strip(), "oid": org_ctx.org_id}
    ).mappings().first()

    if not m:
        return {"valid": False, "message": "Invalid membership QR code."}

    is_valid = (m["status"] == "ACTIVE" and m["payment_status"] == "PAID" and m["end_date"] >= datetime.now(timezone.utc).date())
    return {
        "valid": is_valid,
        "member_number": m["member_number"],
        "full_name": m["full_name"],
        "plan_name": m["plan_name"],
        "status": m["status"],
        "end_date": str(m["end_date"]),
        "message": "Active verified member" if is_valid else "Membership is expired or unpaid"
    }

@router.post("/purchase")
def purchase_membership(plan_id: str, org_ctx: OrgContext = Depends(get_current_org_context), db: Session = Depends(get_db)):
    order = create_order(
        db,
        user_id=org_ctx.membership.get("user_id") if org_ctx.membership else db.execute(text("SELECT id FROM users WHERE email = :e"), {"e": org_ctx.org_name}).scalar(), # resolved from token
        org_id=org_ctx.org_id,
        order_type="MEMBERSHIP",
        items=[{"plan_id": plan_id, "quantity": 1}]
    )
    return order

@router.get("/members")
def list_members(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = None,
    org_ctx: OrgContext = Depends(require_permission("members.view")),
    db: Session = Depends(get_db)
):
    query = "SELECT * FROM v_member_status WHERE organization_id = :oid"
    params = {"oid": org_ctx.org_id}

    if status_filter:
        if status_filter.upper() == "ACTIVE":
            query += " AND derived_status = 'ACTIVE'"
        elif status_filter.upper() == "EXPIRING":
            query += " AND derived_status = 'EXPIRING_SOON'"
        elif status_filter.upper() == "EXPIRED":
            query += " AND derived_status = 'EXPIRED'"

    if search:
        query += " AND (full_name ILIKE :search OR email ILIKE :search OR member_number ILIKE :search)"
        params["search"] = f"%{search.strip()}%"

    query += " ORDER BY end_date DESC"
    rows = db.execute(text(query), params).mappings().all()
    results = []
    for r in rows:
        d = dict(r)
        d["memberNumber"] = d.get("member_number")
        d["fullName"] = d.get("full_name")
        d["planName"] = d.get("plan_name")
        d["startDate"] = str(d.get("start_date"))
        d["endDate"] = str(d.get("end_date"))
        d["derivedStatus"] = d.get("derived_status")
        d["paymentStatus"] = d.get("payment_status")
        results.append(d)
    return results

@router.post("/members/manual")
def manual_membership_entry(
    req: ManualMembershipRequest,
    org_ctx: OrgContext = Depends(require_permission("members.manage")),
    db: Session = Depends(get_db)
):
    # Create order, process mock payment immediately
    order = create_order(
        db,
        user_id=req.user_id,
        org_id=org_ctx.org_id,
        order_type="MEMBERSHIP",
        items=[{"plan_id": req.plan_id, "quantity": 1}]
    )

    paid_order = process_order_payment(
        db,
        order_id=order["id"],
        org_id=org_ctx.org_id,
        payment_method=req.payment_method,
        provider_ref=f"MANUAL_CASH_RECEIPT_{secrets.token_hex(4).upper()}",
        recorded_by=org_ctx.org_id
    )

    return {"message": "Membership successfully granted and dues recorded in ledger.", "order": paid_order}
