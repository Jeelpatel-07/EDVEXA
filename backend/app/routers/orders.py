from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db import get_db
from app.deps import get_current_org_context, require_permission, OrgContext, get_current_user
from app.schemas.orders import OrderCreateRequest, PaymentPayRequest
from app.services.order_service import create_order, process_order_payment

router = APIRouter(prefix="/orgs/{org_id}/orders", tags=["Orders & Payments"])

@router.post("", status_code=status.HTTP_201_CREATED)
def create_new_order(
    req: OrderCreateRequest,
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    try:
        order = create_order(
            db=db,
            user_id=str(current_user["id"]),
            org_id=org_ctx.org_id,
            order_type=req.order_type.upper(),
            items=[itm.model_dump() for itm in req.items]
        )
        return order
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/me")
def list_my_orders(
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    orders = db.execute(
        text("""
            SELECT * FROM orders 
            WHERE user_id = :uid AND organization_id = :oid 
            ORDER BY created_at DESC
        """),
        {"uid": current_user["id"], "oid": org_ctx.org_id}
    ).mappings().all()

    results = []
    for o in orders:
        items = db.execute(
            text("""
                SELECT oi.*, 
                       tt.name as ticket_name,
                       p.name as product_name, pv.sku, pv.size, pv.color,
                       mp.name as plan_name
                FROM order_items oi
                LEFT JOIN ticket_types tt ON tt.id = oi.ticket_type_id
                LEFT JOIN product_variants pv ON pv.id = oi.variant_id
                LEFT JOIN products p ON p.id = pv.product_id
                LEFT JOIN membership_plans mp ON mp.id = oi.plan_id
                WHERE oi.order_id = :oid
            """),
            {"oid": o["id"]}
        ).mappings().all()

        results.append({
            "id": str(o["id"]),
            "order_number": o["order_number"],
            "order_type": o["order_type"],
            "status": o["status"],
            "subtotal": float(o["subtotal"]),
            "discount_total": float(o["discount_total"]),
            "total": float(o["total"]),
            "expires_at": str(o["expires_at"]),
            "created_at": str(o["created_at"]),
            "items": [dict(i) for i in items]
        })
    return results

@router.get("")
def list_all_orders(
    org_ctx: OrgContext = Depends(require_permission("orders.view_all")),
    db: Session = Depends(get_db)
):
    orders = db.execute(
        text("""
            SELECT o.*, u.full_name, u.email
            FROM orders o
            JOIN users u ON u.id = o.user_id
            WHERE o.organization_id = :oid
            ORDER BY o.created_at DESC
        """),
        {"oid": org_ctx.org_id}
    ).mappings().all()

    results = []
    for o in orders:
        items = db.execute(
            text("""
                SELECT oi.*, 
                       tt.name as ticket_name,
                       p.name as product_name, pv.sku, pv.size, pv.color,
                       mp.name as plan_name
                FROM order_items oi
                LEFT JOIN ticket_types tt ON tt.id = oi.ticket_type_id
                LEFT JOIN product_variants pv ON pv.id = oi.variant_id
                LEFT JOIN products p ON p.id = pv.product_id
                LEFT JOIN membership_plans mp ON mp.id = oi.plan_id
                WHERE oi.order_id = :oid
            """),
            {"oid": o["id"]}
        ).mappings().all()

        results.append({
            "id": str(o["id"]),
            "order_number": o["order_number"],
            "customer_name": o["full_name"],
            "customer_email": o["email"],
            "order_type": o["order_type"],
            "status": o["status"],
            "subtotal": float(o["subtotal"]),
            "discount_total": float(o["discount_total"]),
            "total": float(o["total"]),
            "expires_at": str(o["expires_at"]),
            "created_at": str(o["created_at"]),
            "items": [dict(i) for i in items]
        })
    return results

@router.get("/{order_id}")
def get_order_detail(
    order_id: str,
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    order = db.execute(
        text("SELECT * FROM orders WHERE id = :id AND organization_id = :oid"),
        {"id": order_id, "oid": org_ctx.org_id}
    ).mappings().first()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found.")

    # Ownership check
    if str(order["user_id"]) != str(current_user["id"]) and not org_ctx.has_permission("orders.view_all"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    items = db.execute(
        text("""
            SELECT oi.*, 
                   tt.name as ticket_name,
                   p.name as product_name, pv.sku, pv.size, pv.color,
                   mp.name as plan_name
            FROM order_items oi
            LEFT JOIN ticket_types tt ON tt.id = oi.ticket_type_id
            LEFT JOIN product_variants pv ON pv.id = oi.variant_id
            LEFT JOIN products p ON p.id = pv.product_id
            LEFT JOIN membership_plans mp ON mp.id = oi.plan_id
            WHERE oi.order_id = :oid
        """),
        {"oid": order["id"]}
    ).mappings().all()

    payments = db.execute(
        text("SELECT * FROM payments WHERE order_id = :oid"),
        {"oid": order["id"]}
    ).mappings().all()

    return {
        "id": str(order["id"]),
        "order_number": order["order_number"],
        "order_type": order["order_type"],
        "status": order["status"],
        "subtotal": float(order["subtotal"]),
        "discount_total": float(order["discount_total"]),
        "total": float(order["total"]),
        "expires_at": str(order["expires_at"]),
        "created_at": str(order["created_at"]),
        "items": [dict(i) for i in items],
        "payments": [dict(p) for p in payments]
    }

@router.post("/{order_id}/pay")
def pay_order(
    order_id: str,
    req: PaymentPayRequest,
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    try:
        paid_order = process_order_payment(
            db=db,
            order_id=order_id,
            org_id=org_ctx.org_id,
            payment_method=req.method.upper(),
            idempotency_key=req.idempotency_key,
            provider_ref=req.provider_ref,
            recorded_by=str(current_user["id"])
        )
        return paid_order
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
