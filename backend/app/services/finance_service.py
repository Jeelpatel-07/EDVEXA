import csv
import io
import uuid
from datetime import datetime, timezone
from typing import Optional, Tuple
from sqlalchemy import text
from sqlalchemy.orm import Session

def submit_expense_claim(
    db: Session,
    user_id: str,
    org_id: str,
    category_id: str,
    title: str,
    amount: float,
    description: Optional[str],
    receipt_filename: str,
    receipt_url: str,
    receipt_size: int,
    receipt_mime: str
) -> dict:
    now = datetime.now(timezone.utc)
    current_year = now.year

    # 1. Generate Claim Number
    seq = db.execute(
        text("SELECT fn_next_sequence(:oid, 'CLAIM', :yr)"),
        {"oid": org_id, "yr": current_year}
    ).scalar()

    org = db.execute(
        text("SELECT member_number_prefix FROM organizations WHERE id = :oid"),
        {"oid": org_id}
    ).mappings().first()
    prefix = org["member_number_prefix"] if org else "EDV"
    claim_number = f"{prefix}-CLM-{current_year}-{seq:05d}"

    # 2. Find current term
    term_row = db.execute(
        text("SELECT id FROM academic_terms WHERE organization_id = :oid AND is_current = true"),
        {"oid": org_id}
    ).mappings().first()
    term_id = str(term_row["id"]) if term_row else None

    claim_id = str(uuid.uuid4())
    db.execute(
        text("""
            INSERT INTO expense_claims (id, organization_id, user_id, category_id, claim_number, title, description, amount, status, term_id, created_at)
            VALUES (:id, :oid, :uid, :cid, :cnum, :title, :desc, :amt, 'SUBMITTED', :tid, :now)
        """),
        {
            "id": claim_id,
            "oid": org_id,
            "uid": user_id,
            "cid": category_id,
            "cnum": claim_number,
            "title": title,
            "desc": description,
            "amt": amount,
            "tid": term_id,
            "now": now
        }
    )

    # 3. Insert receipt
    db.execute(
        text("""
            INSERT INTO expense_receipts (organization_id, claim_id, file_name, file_url, file_size, mime_type, created_at)
            VALUES (:oid, :cid, :fname, :furl, :fsize, :fmime, :now)
        """),
        {
            "oid": org_id,
            "cid": claim_id,
            "fname": receipt_filename,
            "furl": receipt_url,
            "fsize": receipt_size,
            "fmime": receipt_mime,
            "now": now
        }
    )

    # 4. Notify Claimant
    db.execute(
        text("""
            INSERT INTO notifications (organization_id, user_id, title, message, type, channel, status, created_at)
            VALUES (:oid, :uid, 'Expense Claim Submitted', :msg, 'EXPENSE', 'IN_APP', 'SENT', :now)
        """),
        {
            "oid": org_id,
            "uid": user_id,
            "msg": f"Your claim {claim_number} for ₹{amount:.2f} has been submitted for review.",
            "now": now
        }
    )

    db.commit()
    row = db.execute(text("SELECT * FROM expense_claims WHERE id = :id"), {"id": claim_id}).mappings().first()
    return dict(row)

def review_expense_claim(
    db: Session,
    claim_id: str,
    org_id: str,
    reviewer_user_id: str,
    action: str, # APPROVE or REJECT
    reject_reason: Optional[str] = None
) -> dict:
    now = datetime.now(timezone.utc)
    claim = db.execute(
        text("SELECT * FROM expense_claims WHERE id = :id AND organization_id = :oid FOR UPDATE"),
        {"id": claim_id, "oid": org_id}
    ).mappings().first()

    if not claim:
        raise ValueError("Expense claim not found.")

    # Business Rule 7: Claimant cannot approve/review their own claim!
    if str(claim["user_id"]) == str(reviewer_user_id):
        raise ValueError("Claimant cannot review or approve their own expense claim.")

    if claim["status"] != "SUBMITTED":
        raise ValueError(f"Claim is already {claim['status'].lower()} and cannot be reviewed.")

    if action == "APPROVE":
        db.execute(
            text("""
                UPDATE expense_claims 
                SET status = 'APPROVED', reviewed_by = :rev, reviewed_at = :now, updated_at = :now 
                WHERE id = :id
            """),
            {"rev": reviewer_user_id, "now": now, "id": claim_id}
        )
        # Notify
        db.execute(
            text("""
                INSERT INTO notifications (organization_id, user_id, title, message, type, channel, status, created_at)
                VALUES (:oid, :uid, 'Expense Claim Approved', :msg, 'EXPENSE', 'IN_APP', 'SENT', :now)
            """),
            {
                "oid": org_id,
                "uid": claim["user_id"],
                "msg": f"Your expense claim {claim['claim_number']} for ₹{claim['amount']:.2f} has been approved and queued for payout.",
                "now": now
            }
        )
    elif action == "REJECT":
        if not reject_reason or not reject_reason.strip():
            raise ValueError("A reason is strictly required when rejecting an expense claim.")

        db.execute(
            text("""
                UPDATE expense_claims 
                SET status = 'REJECTED', reviewed_by = :rev, reviewed_at = :now, reject_reason = :reason, updated_at = :now 
                WHERE id = :id
            """),
            {"rev": reviewer_user_id, "now": now, "reason": reject_reason.strip(), "id": claim_id}
        )
        # Notify
        db.execute(
            text("""
                INSERT INTO notifications (organization_id, user_id, title, message, type, channel, status, created_at)
                VALUES (:oid, :uid, 'Expense Claim Rejected', :msg, 'EXPENSE', 'IN_APP', 'SENT', :now)
            """),
            {
                "oid": org_id,
                "uid": claim["user_id"],
                "msg": f"Your expense claim {claim['claim_number']} was rejected. Reason: {reject_reason.strip()}",
                "now": now
            }
        )
    else:
        raise ValueError("Invalid review action. Must be APPROVE or REJECT.")

    db.commit()
    updated = db.execute(text("SELECT * FROM expense_claims WHERE id = :id"), {"id": claim_id}).mappings().first()
    return dict(updated)

def reimburse_expense_claim(
    db: Session,
    claim_id: str,
    org_id: str,
    operator_user_id: str
) -> dict:
    now = datetime.now(timezone.utc)
    claim = db.execute(
        text("SELECT * FROM expense_claims WHERE id = :id AND organization_id = :oid FOR UPDATE"),
        {"id": claim_id, "oid": org_id}
    ).mappings().first()

    if not claim:
        raise ValueError("Expense claim not found.")

    if claim["status"] != "APPROVED":
        raise ValueError("Only APPROVED claims can be reimbursed.")

    # 1. Update status
    db.execute(
        text("UPDATE expense_claims SET status = 'REIMBURSED', reimbursed_at = :now, updated_at = :now WHERE id = :id"),
        {"now": now, "id": claim_id}
    )

    # 2. Post Ledger OUT
    term_row = db.execute(
        text("SELECT id FROM academic_terms WHERE organization_id = :oid AND is_current = true"),
        {"oid": org_id}
    ).mappings().first()
    term_id = str(term_row["id"]) if term_row else claim["term_id"]

    db.execute(
        text("""
            INSERT INTO ledger_entries (organization_id, term_id, category_id, direction, amount, source_type, expense_claim_id, description, reference_number, recorded_by, created_at)
            VALUES (:oid, :tid, :cid, 'OUT', :amt, 'EXPENSE_CLAIM', :eid, :desc, :ref, :recby, :now)
        """),
        {
            "oid": org_id,
            "tid": term_id,
            "cid": claim["category_id"],
            "amt": claim["amount"],
            "eid": claim_id,
            "desc": f"Reimbursement payout for claim {claim['claim_number']}: {claim['title']}",
            "ref": claim["claim_number"],
            "recby": operator_user_id,
            "now": now
        }
    )

    # 3. Notify Claimant
    db.execute(
        text("""
            INSERT INTO notifications (organization_id, user_id, title, message, type, channel, status, created_at)
            VALUES (:oid, :uid, 'Reimbursement Processed', :msg, 'EXPENSE', 'IN_APP', 'SENT', :now)
        """),
        {
            "oid": org_id,
            "uid": claim["user_id"],
            "msg": f"Your reimbursement of ₹{claim['amount']:.2f} for claim {claim['claim_number']} has been processed.",
            "now": now
        }
    )

    db.commit()
    updated = db.execute(text("SELECT * FROM expense_claims WHERE id = :id"), {"id": claim_id}).mappings().first()
    return dict(updated)

def get_finance_summary(db: Session, org_id: str) -> dict:
    # 1. In vs Out totals from ledger
    ledger_totals = db.execute(
        text("""
            SELECT 
                coalesce(SUM(CASE WHEN direction = 'IN' THEN amount ELSE 0 END), 0) as total_in,
                coalesce(SUM(CASE WHEN direction = 'OUT' THEN amount ELSE 0 END), 0) as total_out
            FROM ledger_entries
            WHERE organization_id = :oid
        """),
        {"oid": org_id}
    ).mappings().first()

    total_in = float(ledger_totals["total_in"])
    total_out = float(ledger_totals["total_out"])
    balance = total_in - total_out

    # 2. By Category breakdown
    categories_breakdown = db.execute(
        text("""
            SELECT 
                bc.id, bc.name, bc.type,
                coalesce(SUM(CASE WHEN le.direction = 'IN' THEN le.amount ELSE 0 END), 0) as total_in,
                coalesce(SUM(CASE WHEN le.direction = 'OUT' THEN le.amount ELSE 0 END), 0) as total_out
            FROM budget_categories bc
            LEFT JOIN ledger_entries le ON le.category_id = bc.id AND le.organization_id = :oid
            WHERE bc.organization_id = :oid
            GROUP BY bc.id, bc.name, bc.type
            ORDER BY bc.type, bc.name
        """),
        {"oid": org_id}
    ).mappings().all()

    # 3. Planned vs Actual from term_budgets
    planned_actual = db.execute(
        text("""
            SELECT 
                bc.id, bc.name, bc.type,
                coalesce(tb.allocated_amount, 0) as planned_amount,
                coalesce(SUM(le.amount), 0) as actual_amount
            FROM budget_categories bc
            LEFT JOIN academic_terms at ON at.organization_id = :oid AND at.is_current = true
            LEFT JOIN term_budgets tb ON tb.category_id = bc.id AND tb.term_id = at.id
            LEFT JOIN ledger_entries le ON le.category_id = bc.id AND le.organization_id = :oid
            WHERE bc.organization_id = :oid
            GROUP BY bc.id, bc.name, bc.type, tb.allocated_amount
            ORDER BY bc.name
        """),
        {"oid": org_id}
    ).mappings().all()

    # 4. Pending Reimbursements
    pending_reimbursements = db.execute(
        text("""
            SELECT 
                COUNT(*) as count,
                coalesce(SUM(amount), 0) as total_amount
            FROM expense_claims
            WHERE organization_id = :oid AND status IN ('SUBMITTED', 'APPROVED')
        """),
        {"oid": org_id}
    ).mappings().first()

    # 5. Income channels
    income_by_channel = db.execute(
        text("""
            SELECT 
                coalesce(SUM(CASE WHEN bc.name ILIKE '%Member%' OR le.source_type::text = 'MEMBERSHIP' THEN le.amount ELSE 0 END), 0) as memberships,
                coalesce(SUM(CASE WHEN bc.name ILIKE '%Ticket%' OR le.source_type::text = 'TICKET' THEN le.amount ELSE 0 END), 0) as tickets,
                coalesce(SUM(CASE WHEN bc.name ILIKE '%Merch%' OR bc.name ILIKE '%Store%' OR le.source_type::text = 'STORE' THEN le.amount ELSE 0 END), 0) as merchandise,
                coalesce(SUM(CASE WHEN bc.name ILIKE '%Fundrais%' OR bc.name ILIKE '%Charity%' OR le.source_type::text = 'FUNDRAISER' THEN le.amount ELSE 0 END), 0) as fundraisers,
                coalesce(SUM(CASE WHEN 
                    (bc.name NOT ILIKE '%Member%' AND bc.name NOT ILIKE '%Ticket%' AND bc.name NOT ILIKE '%Merch%' AND bc.name NOT ILIKE '%Store%' AND bc.name NOT ILIKE '%Fundrais%' AND bc.name NOT ILIKE '%Charity%')
                    OR bc.id IS NULL
                THEN le.amount ELSE 0 END), 0) as other
            FROM ledger_entries le
            LEFT JOIN budget_categories bc ON bc.id = le.category_id
            WHERE le.organization_id = :oid AND le.direction = 'IN'
        """),
        {"oid": org_id}
    ).mappings().first()

    # 6. Expenses breakdown
    exp_breakdown = db.execute(
        text("""
            SELECT 
                coalesce(SUM(CASE WHEN source_type = 'EXPENSE_CLAIM' THEN amount ELSE 0 END), 0) as reimbursements,
                coalesce(SUM(CASE WHEN source_type != 'EXPENSE_CLAIM' AND direction = 'OUT' THEN amount ELSE 0 END), 0) as other_expenses
            FROM ledger_entries
            WHERE organization_id = :oid AND direction = 'OUT'
        """),
        {"oid": org_id}
    ).mappings().first()

    # 7. Approved claims pending payment
    approved_pending = db.execute(
        text("""
            SELECT coalesce(SUM(amount), 0) as total
            FROM expense_claims
            WHERE organization_id = :oid AND status = 'APPROVED'
        """),
        {"oid": org_id}
    ).scalar() or 0.0

    # 8. Recent ledger entries
    recent_ledger = db.execute(
        text("""
            SELECT le.id, le.created_at, le.reference_number, le.direction, le.amount, le.description, le.source_type, bc.name as category_name
            FROM ledger_entries le
            LEFT JOIN budget_categories bc ON bc.id = le.category_id
            WHERE le.organization_id = :oid
            ORDER BY le.created_at DESC
            LIMIT 10
        """),
        {"oid": org_id}
    ).mappings().all()

    return {
        "total_revenue": total_in,
        "total_expenses": total_out,
        "net_balance": balance,
        "closingCash": balance,
        "closing_cash": balance,
        "openingBalance": 0.0,
        "moneyReceived": total_in,
        "refunds": 0.0,
        "reimbursements": float(exp_breakdown["reimbursements"]),
        "otherExpenses": float(exp_breakdown["other_expenses"]),
        "approvedClaimsAwaitingPayment": float(approved_pending),
        "incomeBreakdown": {
            "memberships": float(income_by_channel["memberships"]),
            "tickets": float(income_by_channel["tickets"]),
            "merchandise": float(income_by_channel["merchandise"]),
            "fundraisers": float(income_by_channel["fundraisers"]),
            "other": float(income_by_channel["other"])
        },
        "by_category": [dict(c) for c in categories_breakdown],
        "planned_vs_actual": [dict(p) for p in planned_actual],
        "pending_claims_count": int(pending_reimbursements["count"]),
        "pending_claims_amount": float(pending_reimbursements["total_amount"]),
        "ledger": [dict(r) for r in recent_ledger]
    }

def get_finance_reports(db: Session, org_id: str, timeframe: Optional[str] = None) -> dict:
    summary = get_finance_summary(db, org_id)
    
    # Monthly breakdown from ledger entries
    months_data = db.execute(
        text("""
            SELECT 
                to_char(created_at, 'Month YYYY') as month,
                date_trunc('month', created_at) as month_date,
                coalesce(SUM(CASE WHEN direction = 'IN' THEN amount ELSE 0 END), 0) as income,
                coalesce(SUM(CASE WHEN direction = 'OUT' THEN amount ELSE 0 END), 0) as expenses
            FROM ledger_entries
            WHERE organization_id = :oid
            GROUP BY date_trunc('month', created_at), to_char(created_at, 'Month YYYY')
            ORDER BY month_date ASC
        """),
        {"oid": org_id}
    ).mappings().all()

    breakdown = []
    for m in months_data:
        inc = float(m["income"])
        exp = float(m["expenses"])
        breakdown.append({
            "month": m["month"].strip(),
            "income": inc,
            "expenses": exp,
            "net": inc - exp
        })

    if not breakdown:
        breakdown = [
            {"month": "October 2026", "income": summary["total_revenue"], "expenses": summary["total_expenses"], "net": summary["net_balance"]}
        ]

    return {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "summary": summary,
        "breakdownByMonth": breakdown
    }

def export_finance_csv(db: Session, org_id: str) -> str:
    entries = db.execute(
        text("""
            SELECT 
                le.created_at,
                le.reference_number,
                le.direction,
                le.source_type,
                bc.name as category_name,
                le.amount,
                le.description
            FROM ledger_entries le
            LEFT JOIN budget_categories bc ON bc.id = le.category_id
            WHERE le.organization_id = :oid
            ORDER BY le.created_at DESC
        """),
        {"oid": org_id}
    ).mappings().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Timestamp", "Reference", "Direction", "Source", "Category", "Amount (INR)", "Description"])

    for r in entries:
        writer.writerow([
            r["created_at"].strftime("%Y-%m-%d %H:%M:%S") if r["created_at"] else "",
            r["reference_number"] or "",
            r["direction"],
            r["source_type"],
            r["category_name"] or "Uncategorized",
            f"{float(r['amount']):.2f}",
            r["description"]
        ])

    return output.getvalue()
