import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db import get_db
from app.deps import get_current_org_context, require_permission, OrgContext, get_current_user
from app.schemas.store import (
    ProductCreate, ProductUpdate, VariantCreate, VariantUpdate,
    StockAdjustRequest, FulfillmentUpdateRequest
)

router = APIRouter(prefix="/orgs/{org_id}/store", tags=["Store & Merchandise"])

@router.get("/products")
def list_products(
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    products = db.execute(
        text("SELECT * FROM products WHERE organization_id = :oid AND is_active = true ORDER BY name ASC"),
        {"oid": org_ctx.org_id}
    ).mappings().all()

    results = []
    for p in products:
        variants = db.execute(
            text("SELECT * FROM product_variants WHERE product_id = :pid AND organization_id = :oid ORDER BY size ASC"),
            {"pid": p["id"], "oid": org_ctx.org_id}
        ).mappings().all()

        applicable_price = float(p["member_price"]) if org_ctx.is_member else float(p["base_price"])
        results.append({
            "id": str(p["id"]),
            "name": p["name"],
            "description": p["description"],
            "base_price": float(p["base_price"]),
            "member_price": float(p["member_price"]),
            "applicable_price": applicable_price,
            "savings": max(0.0, float(p["base_price"]) - float(p["member_price"])) if org_ctx.is_member else 0.0,
            "image_url": p["image_url"],
            "variants": [
                {
                    "id": str(v["id"]),
                    "sku": v["sku"],
                    "size": v["size"],
                    "color": v["color"],
                    "stock_quantity": v["stock_quantity"],
                    "is_low_stock": v["stock_quantity"] <= v["low_stock_threshold"]
                }
                for v in variants
            ]
        })
    return results

@router.post("/products", status_code=status.HTTP_201_CREATED)
def create_product(
    req: ProductCreate,
    org_ctx: OrgContext = Depends(require_permission("products.manage")),
    db: Session = Depends(get_db)
):
    prod_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    db.execute(
        text("""
            INSERT INTO products (id, organization_id, name, description, base_price, member_price, is_active, image_url, created_at)
            VALUES (:id, :oid, :name, :desc, :bprice, :mprice, :act, :img, :now)
        """),
        {
            "id": prod_id,
            "oid": org_ctx.org_id,
            "name": req.name.strip(),
            "desc": req.description,
            "bprice": req.base_price,
            "mprice": req.member_price,
            "act": req.is_active,
            "img": req.image_url,
            "now": now
        }
    )

    for v in req.variants:
        db.execute(
            text("""
                INSERT INTO product_variants (organization_id, product_id, sku, size, color, stock_quantity, low_stock_threshold, created_at)
                VALUES (:oid, :pid, :sku, :size, :col, :qty, :low, :now)
            """),
            {
                "oid": org_ctx.org_id,
                "pid": prod_id,
                "sku": v.sku.strip(),
                "size": v.size.strip(),
                "col": v.color.strip(),
                "qty": v.stock_quantity,
                "low": v.low_stock_threshold,
                "now": now
            }
        )

    db.commit()
    return {"message": "Product created successfully.", "id": prod_id}

@router.get("/products/{product_id}")
def get_product(
    product_id: str,
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    p = db.execute(
        text("SELECT * FROM products WHERE id = :id AND organization_id = :oid"),
        {"id": product_id, "oid": org_ctx.org_id}
    ).mappings().first()

    if not p:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found.")

    variants = db.execute(
        text("SELECT * FROM product_variants WHERE product_id = :pid AND organization_id = :oid"),
        {"pid": product_id, "oid": org_ctx.org_id}
    ).mappings().all()

    applicable_price = float(p["member_price"]) if org_ctx.is_member else float(p["base_price"])
    res = dict(p)
    res["applicable_price"] = applicable_price
    res["variants"] = [dict(v) for v in variants]
    return res

@router.patch("/products/{product_id}")
def update_product(
    product_id: str,
    req: ProductUpdate,
    org_ctx: OrgContext = Depends(require_permission("products.manage")),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    clauses = []
    params = {"id": product_id, "oid": org_ctx.org_id, "now": now}

    for k, v in req.model_dump(exclude_unset=True).items():
        clauses.append(f"{k} = :{k}")
        params[k] = v

    if clauses:
        clauses.append("updated_at = :now")
        db.execute(text(f"UPDATE products SET {', '.join(clauses)} WHERE id = :id AND organization_id = :oid"), params)
        db.commit()

    return {"message": "Product updated successfully."}

@router.delete("/products/{product_id}")
def delete_product(
    product_id: str,
    org_ctx: OrgContext = Depends(require_permission("products.manage")),
    db: Session = Depends(get_db)
):
    db.execute(
        text("UPDATE products SET is_active = false WHERE id = :id AND organization_id = :oid"),
        {"id": product_id, "oid": org_ctx.org_id}
    )
    db.commit()
    return {"message": "Product archived."}

@router.post("/variants/{variant_id}/stock")
def adjust_variant_stock(
    variant_id: str,
    req: StockAdjustRequest,
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(require_permission("products.manage_stock")),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    var = db.execute(
        text("SELECT * FROM product_variants WHERE id = :id AND organization_id = :oid FOR UPDATE"),
        {"id": variant_id, "oid": org_ctx.org_id}
    ).mappings().first()

    if not var:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found.")

    new_stock = var["stock_quantity"] + req.quantity_change
    if new_stock < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Stock quantity cannot become negative.")

    db.execute(
        text("UPDATE product_variants SET stock_quantity = :stock, updated_at = :now WHERE id = :id"),
        {"stock": new_stock, "now": now, "id": variant_id}
    )

    db.execute(
        text("""
            INSERT INTO stock_movements (organization_id, variant_id, movement_type, quantity_change, notes, performed_by, created_at)
            VALUES (:oid, :vid, :mtype, :chg, :notes, :perf, :now)
        """),
        {
            "oid": org_ctx.org_id,
            "vid": variant_id,
            "mtype": req.movement_type.upper(),
            "chg": req.quantity_change,
            "notes": req.notes,
            "perf": current_user["id"],
            "now": now
        }
    )
    db.commit()

    return {"message": "Stock updated successfully.", "variant_id": variant_id, "stock_quantity": new_stock}

@router.get("/inventory/low-stock")
def get_low_stock_inventory(
    org_ctx: OrgContext = Depends(require_permission("products.manage_stock")),
    db: Session = Depends(get_db)
):
    rows = db.execute(
        text("SELECT * FROM v_stock_levels WHERE organization_id = :oid AND is_low_stock = true"),
        {"oid": org_ctx.org_id}
    ).mappings().all()
    return [dict(r) for r in rows]

@router.patch("/order-items/{item_id}/fulfillment")
def update_fulfillment_status(
    item_id: str,
    req: FulfillmentUpdateRequest,
    org_ctx: OrgContext = Depends(require_permission("products.manage")),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    res = db.execute(
        text("UPDATE order_items SET fulfillment_status = :st, updated_at = :now WHERE id = :id AND organization_id = :oid"),
        {"st": req.fulfillment_status.upper(), "now": now, "id": item_id, "oid": org_ctx.org_id}
    )
    if res.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order item not found.")
    db.commit()
    return {"message": f"Fulfillment status updated to {req.fulfillment_status}."}
