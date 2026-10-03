import os
import uuid
import secrets
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Response
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db import get_db
from app.config import settings
from app.deps import get_current_org_context, require_permission, OrgContext, get_current_user
from app.schemas.finance import ExpenseReviewRequest, ManualLedgerEntryRequest, BudgetCategoryCreate, TermBudgetSetRequest
from app.services.finance_service import (
    submit_expense_claim, review_expense_claim, reimburse_expense_claim,
    get_finance_summary, export_finance_csv
)

router = APIRouter(prefix="/orgs/{org_id}/finance", tags=["Finance & Treasury"])

@router.get("/summary")
def get_summary(
    org_ctx: OrgContext = Depends(require_permission("finance.view_summary")),
    db: Session = Depends(get_db)
):
    return get_finance_summary(db, org_ctx.org_id)

@router.get("/ledger")
def get_ledger(
    direction: Optional[str] = None,
    category_id: Optional[str] = None,
    org_ctx: OrgContext = Depends(require_permission("finance.view")),
    db: Session = Depends(get_db)
):
    query = """
        SELECT le.*, bc.name as category_name
        FROM ledger_entries le
        LEFT JOIN budget_categories bc ON bc.id = le.category_id
        WHERE le.organization_id = :oid
    """
    params = {"oid": org_ctx.org_id}

    if direction:
        query += " AND le.direction = :dir"
        params["dir"] = direction.upper()
    if category_id:
        query += " AND le.category_id = :cid"
        params["cid"] = category_id

    query += " ORDER BY le.created_at DESC"
    rows = db.execute(text(query), params).mappings().all()
    return [dict(r) for r in rows]

@router.post("/ledger/manual", status_code=status.HTTP_201_CREATED)
def create_manual_ledger_entry(
    req: ManualLedgerEntryRequest,
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(require_permission("finance.report")),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    entry_id = str(uuid.uuid4())
    ref = req.reference_number or f"MANUAL-{secrets.token_hex(4).upper()}"

    db.execute(
        text("""
            INSERT INTO ledger_entries (id, organization_id, term_id, category_id, direction, amount, source_type, description, reference_number, recorded_by, created_at)
            VALUES (:id, :oid, :tid, :cid, :dir, :amt, 'MANUAL', :desc, :ref, :recby, :now)
        """),
        {
            "id": entry_id,
            "oid": org_ctx.org_id,
            "tid": org_ctx.term_id,
            "cid": req.category_id,
            "dir": req.direction.upper(),
            "amt": req.amount,
            "desc": req.description.strip(),
            "ref": ref,
            "recby": current_user["id"],
            "now": now
        }
    )
    db.commit()
    return {"message": "Manual ledger entry posted successfully.", "id": entry_id}

@router.get("/export-csv")
def export_csv(
    org_ctx: OrgContext = Depends(require_permission("finance.report")),
    db: Session = Depends(get_db)
):
    csv_data = export_finance_csv(db, org_ctx.org_id)
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=edvexa_ledger_{org_ctx.org_slug}.csv"}
    )

@router.get("/categories")
def list_budget_categories(
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    cats = db.execute(
        text("SELECT * FROM budget_categories WHERE organization_id = :oid ORDER BY type, name"),
        {"oid": org_ctx.org_id}
    ).mappings().all()
    return [dict(c) for c in cats]

@router.get("/claims")
def list_claims(
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    # If user has expenses.approve permission -> sees all claims
    # Otherwise -> sees only their own claims
    can_view_all = org_ctx.has_permission("expenses.approve") or org_ctx.has_permission("finance.view")

    query = """
        SELECT ec.*, bc.name as category_name, u.full_name as claimant_name, u.email as claimant_email,
               er.file_name as receipt_name, er.file_url as receipt_url
        FROM expense_claims ec
        JOIN users u ON u.id = ec.user_id
        LEFT JOIN budget_categories bc ON bc.id = ec.category_id
        LEFT JOIN expense_receipts er ON er.claim_id = ec.id
        WHERE ec.organization_id = :oid
    """
    params = {"oid": org_ctx.org_id}

    if not can_view_all:
        query += " AND ec.user_id = :uid"
        params["uid"] = current_user["id"]

    query += " ORDER BY ec.created_at DESC"
    rows = db.execute(text(query), params).mappings().all()
    return [dict(r) for r in rows]

@router.post("/claims", status_code=status.HTTP_201_CREATED)
async def submit_claim(
    title: str = Form(...),
    amount: float = Form(...),
    category_id: str = Form(...),
    description: Optional[str] = Form(None),
    receipt: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(require_permission("expenses.submit")),
    db: Session = Depends(get_db)
):
    # Business Rule 7: Receipt is strictly required before submit!
    if not receipt or not receipt.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A receipt upload is strictly required for expense reimbursement claims.")

    # Save receipt to uploads/receipts
    ext = os.path.splitext(receipt.filename)[1].lower()
    receipt_filename = f"{uuid.uuid4().hex[:12]}_{receipt.filename}"
    save_path = settings.UPLOAD_DIR / "receipts" / receipt_filename

    content = await receipt.read()
    with open(save_path, "wb") as f:
        f.write(content)

    receipt_url = f"/uploads/receipts/{receipt_filename}"

    try:
        claim = submit_expense_claim(
            db=db,
            user_id=str(current_user["id"]),
            org_id=org_ctx.org_id,
            category_id=category_id,
            title=title,
            amount=amount,
            description=description,
            receipt_filename=receipt.filename,
            receipt_url=receipt_url,
            receipt_size=len(content),
            receipt_mime=receipt.content_type or "application/octet-stream"
        )
        return claim
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/claims/{claim_id}")
def get_claim(
    claim_id: str,
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    claim = db.execute(
        text("""
            SELECT ec.*, bc.name as category_name, u.full_name as claimant_name, u.email as claimant_email,
                   rev.full_name as reviewer_name
            FROM expense_claims ec
            JOIN users u ON u.id = ec.user_id
            LEFT JOIN users rev ON rev.id = ec.reviewed_by
            LEFT JOIN budget_categories bc ON bc.id = ec.category_id
            WHERE ec.id = :id AND ec.organization_id = :oid
        """),
        {"id": claim_id, "oid": org_ctx.org_id}
    ).mappings().first()

    if not claim:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Expense claim not found.")

    can_view_all = org_ctx.has_permission("expenses.approve") or org_ctx.has_permission("finance.view")
    if str(claim["user_id"]) != str(current_user["id"]) and not can_view_all:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    receipts = db.execute(
        text("SELECT * FROM expense_receipts WHERE claim_id = :cid"),
        {"cid": claim_id}
    ).mappings().all()

    res = dict(claim)
    res["receipts"] = [dict(r) for r in receipts]
    return res

@router.post("/claims/{claim_id}/approve")
def approve_claim(
    claim_id: str,
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(require_permission("expenses.approve")),
    db: Session = Depends(get_db)
):
    try:
        updated = review_expense_claim(
            db=db,
            claim_id=claim_id,
            org_id=org_ctx.org_id,
            reviewer_user_id=str(current_user["id"]),
            action="APPROVE"
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/claims/{claim_id}/reject")
def reject_claim(
    claim_id: str,
    req: ExpenseReviewRequest,
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(require_permission("expenses.approve")),
    db: Session = Depends(get_db)
):
    try:
        updated = review_expense_claim(
            db=db,
            claim_id=claim_id,
            org_id=org_ctx.org_id,
            reviewer_user_id=str(current_user["id"]),
            action="REJECT",
            reject_reason=req.reject_reason
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.post("/claims/{claim_id}/reimburse")
def reimburse_claim(
    claim_id: str,
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(require_permission("expenses.reimburse")),
    db: Session = Depends(get_db)
):
    try:
        updated = reimburse_expense_claim(
            db=db,
            claim_id=claim_id,
            org_id=org_ctx.org_id,
            operator_user_id=str(current_user["id"])
        )
        return updated
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
