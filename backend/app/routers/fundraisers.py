import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db import get_db
from app.deps import get_current_org_context, require_permission, OrgContext, get_current_user
from app.schemas.fundraisers import (
    FundraiserCreate, FundraiserUpdate, TaskCreate, TaskStatusUpdate, TaskCommentCreate
)

router = APIRouter(prefix="/orgs/{org_id}/fundraisers", tags=["Fundraisers"])
tasks_router = APIRouter(prefix="/orgs/{org_id}/tasks", tags=["Tasks & Volunteer Duties"])


def _format_task(t: dict) -> dict:
    d = dict(t)
    due_str = str(t["due_date"]) if t.get("due_date") else "Flexible / Ongoing"
    event_label = t.get("event_title") or t.get("fundraiser_name") or "General Operations"
    d.update({
        "id": str(t["id"]),
        "title": t["title"],
        "description": t.get("description") or "",
        "status": t["status"],
        "priority": t["priority"],
        "event": event_label,
        "eventName": event_label,
        "date": due_str,
        "shiftTime": "09:00 AM - 05:00 PM" if not t.get("due_date") else f"Due by {due_str}",
        "lead": t.get("lead_name") or t.get("creator_name") or "Shift Supervisor",
        "fundraiserId": str(t["fundraiser_id"]) if t.get("fundraiser_id") else None,
        "eventId": str(t["event_id"]) if t.get("event_id") else None,
        "dueDate": due_str,
        "completedAt": str(t["completed_at"]) if t.get("completed_at") else None,
        "createdAt": str(t["created_at"]) if t.get("created_at") else None,
    })
    return d


# ==========================================
# FUNDRAISERS ENDPOINTS
# ==========================================

@router.get("")
def list_fundraisers(
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    rows = db.execute(
        text("""
            SELECT fp.*, f.description, f.budget_amount, f.status as fundraiser_status, u.full_name as lead_name
            FROM v_fundraiser_progress fp
            JOIN fundraisers f ON f.id = fp.fundraiser_id
            LEFT JOIN users u ON u.id = f.lead_user_id
            WHERE fp.organization_id = :oid
            ORDER BY fp.name ASC
        """),
        {"oid": org_ctx.org_id}
    ).mappings().all()

    results = []
    for r in rows:
        d = dict(r)
        raised_pct = float(r.get("raised_pct") or 0.0)
        goal_amt = float(r.get("goal_amount") or 0.0)
        raised_amt = float(r.get("raised_amount") or 0.0)
        budget_amt = float(r.get("budget_amount") or 0.0)
        d.update({
            "id": str(r["fundraiser_id"]),
            "fundraiser_id": str(r["fundraiser_id"]),
            "name": r["name"],
            "title": r["name"],
            "description": r.get("description") or "",
            "goalAmount": goal_amt,
            "goal_amount": goal_amt,
            "raisedAmount": raised_amt,
            "raised_amount": raised_amt,
            "budgetAmount": budget_amt,
            "budget_amount": budget_amt,
            "progressPercent": raised_pct,
            "progress_percent": raised_pct,
            "raised_pct": raised_pct,
            "completed_tasks": r.get("completed_tasks") or 0,
            "total_tasks": r.get("total_tasks") or 0,
            "task_done_pct": float(r.get("task_done_pct") or 0.0),
            "leadName": r.get("lead_name") or "Campaign Director",
            "lead_name": r.get("lead_name") or "Campaign Director",
            "status": r.get("fundraiser_status") or "ACTIVE"
        })
        results.append(d)
    return results


@router.post("", status_code=status.HTTP_201_CREATED)
def create_fundraiser(
    req: FundraiserCreate,
    org_ctx: OrgContext = Depends(require_permission("fundraisers.manage")),
    db: Session = Depends(get_db)
):
    f_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    db.execute(
        text("""
            INSERT INTO fundraisers (id, organization_id, name, description, goal_amount, raised_amount, budget_amount, status, lead_user_id, created_at)
            VALUES (:id, :oid, :name, :desc, :goal, 0.00, :bamt, 'PLANNING', :lead, :now)
        """),
        {
            "id": f_id,
            "oid": org_ctx.org_id,
            "name": req.name.strip(),
            "desc": req.description,
            "goal": req.goal_amount,
            "bamt": req.budget_amount,
            "lead": req.lead_user_id,
            "now": now
        }
    )
    db.commit()
    return {"message": "Fundraiser created successfully.", "id": f_id}


# ==========================================
# TASKS ENDPOINTS (/orgs/{org_id}/tasks)
# ==========================================

@tasks_router.get("/mine")
@router.get("/tasks/mine")
def get_my_tasks(
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    tasks = db.execute(
        text("""
            SELECT t.*, 
                   f.name as fundraiser_name, e.title as event_title,
                   u_lead.full_name as lead_name, u_creator.full_name as creator_name
            FROM tasks t
            JOIN task_assignments ta ON ta.task_id = t.id
            LEFT JOIN fundraisers f ON f.id = t.fundraiser_id
            LEFT JOIN events e ON e.id = t.event_id
            LEFT JOIN users u_lead ON u_lead.id = f.lead_user_id
            LEFT JOIN users u_creator ON u_creator.id = t.created_by
            WHERE ta.user_id = :uid AND t.organization_id = :oid
            ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
        """),
        {"uid": current_user["id"], "oid": org_ctx.org_id}
    ).mappings().all()

    return [_format_task(t) for t in tasks]


@tasks_router.get("")
@router.get("/tasks")
def list_all_tasks(
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    tasks = db.execute(
        text("""
            SELECT t.*, 
                   f.name as fundraiser_name, e.title as event_title,
                   u_lead.full_name as lead_name, u_creator.full_name as creator_name,
                   ARRAY_REMOVE(ARRAY_AGG(u.full_name), NULL) as assigned_names
            FROM tasks t
            LEFT JOIN fundraisers f ON f.id = t.fundraiser_id
            LEFT JOIN events e ON e.id = t.event_id
            LEFT JOIN users u_lead ON u_lead.id = f.lead_user_id
            LEFT JOIN users u_creator ON u_creator.id = t.created_by
            LEFT JOIN task_assignments ta ON ta.task_id = t.id
            LEFT JOIN users u ON u.id = ta.user_id
            WHERE t.organization_id = :oid
            GROUP BY t.id, f.name, e.title, u_lead.full_name, u_creator.full_name
            ORDER BY t.created_at DESC
        """),
        {"oid": org_ctx.org_id}
    ).mappings().all()

    return [_format_task(t) for t in tasks]


@tasks_router.get("/{task_id}")
@router.get("/tasks/{task_id}")
def get_single_task(
    task_id: str,
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    t = db.execute(
        text("""
            SELECT t.*, 
                   f.name as fundraiser_name, e.title as event_title,
                   u_lead.full_name as lead_name, u_creator.full_name as creator_name
            FROM tasks t
            LEFT JOIN fundraisers f ON f.id = t.fundraiser_id
            LEFT JOIN events e ON e.id = t.event_id
            LEFT JOIN users u_lead ON u_lead.id = f.lead_user_id
            LEFT JOIN users u_creator ON u_creator.id = t.created_by
            WHERE t.id = :id AND t.organization_id = :oid
        """),
        {"id": task_id, "oid": org_ctx.org_id}
    ).mappings().first()

    if not t:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found.")

    assignments = db.execute(
        text("""
            SELECT u.id, u.full_name, u.email
            FROM task_assignments ta
            JOIN users u ON u.id = ta.user_id
            WHERE ta.task_id = :id AND ta.organization_id = :oid
        """),
        {"id": task_id, "oid": org_ctx.org_id}
    ).mappings().all()

    comments = db.execute(
        text("""
            SELECT tc.*, u.full_name as author_name
            FROM task_comments tc
            JOIN users u ON u.id = tc.user_id
            WHERE tc.task_id = :id AND tc.organization_id = :oid
            ORDER BY tc.created_at ASC
        """),
        {"id": task_id, "oid": org_ctx.org_id}
    ).mappings().all()

    formatted = _format_task(t)
    formatted["assignedUsers"] = [dict(a) for a in assignments]
    formatted["comments"] = [
        {
            "id": str(c["id"]),
            "author": c["author_name"],
            "comment": c["comment"],
            "createdAt": str(c["created_at"])
        }
        for c in comments
    ]
    return formatted


@tasks_router.post("", status_code=status.HTTP_201_CREATED)
@router.post("/tasks", status_code=status.HTTP_201_CREATED)
def create_org_task(
    req: TaskCreate,
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(require_permission("tasks.assign")),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    task_id = str(uuid.uuid4())

    db.execute(
        text("""
            INSERT INTO tasks (id, organization_id, title, description, status, priority, due_date, fundraiser_id, event_id, created_by, created_at)
            VALUES (:id, :oid, :title, :desc, 'TODO', :pri, :due, :fid, :eid, :cby, :now)
        """),
        {
            "id": task_id,
            "oid": org_ctx.org_id,
            "title": req.title.strip(),
            "desc": req.description,
            "pri": req.priority.upper(),
            "due": req.due_date,
            "fid": getattr(req, "fundraiser_id", None),
            "eid": getattr(req, "event_id", None),
            "cby": current_user["id"],
            "now": now
        }
    )

    for uid in (req.assigned_user_ids or []):
        is_member = db.execute(
            text("SELECT 1 FROM organization_users WHERE organization_id = :oid AND user_id = :uid AND status = 'ACTIVE'"),
            {"oid": org_ctx.org_id, "uid": uid}
        ).scalar()
        if is_member:
            db.execute(
                text("""
                    INSERT INTO task_assignments (organization_id, task_id, user_id, assigned_at, created_at)
                    VALUES (:oid, :tid, :uid, :now, :now)
                    ON CONFLICT DO NOTHING
                """),
                {"oid": org_ctx.org_id, "tid": task_id, "uid": uid, "now": now}
            )

    db.commit()
    return {"message": "Task created successfully.", "id": task_id}


@router.post("/{fundraiser_id}/tasks", status_code=status.HTTP_201_CREATED)
def create_fundraiser_task(
    fundraiser_id: str,
    req: TaskCreate,
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(require_permission("tasks.assign")),
    db: Session = Depends(get_db)
):
    req_dict = req.model_dump()
    req_dict["fundraiser_id"] = fundraiser_id
    now = datetime.now(timezone.utc)
    task_id = str(uuid.uuid4())

    db.execute(
        text("""
            INSERT INTO tasks (id, organization_id, title, description, status, priority, due_date, fundraiser_id, event_id, created_by, created_at)
            VALUES (:id, :oid, :title, :desc, 'TODO', :pri, :due, :fid, :eid, :cby, :now)
        """),
        {
            "id": task_id,
            "oid": org_ctx.org_id,
            "title": req.title.strip(),
            "desc": req.description,
            "pri": req.priority.upper(),
            "due": req.due_date,
            "fid": fundraiser_id,
            "eid": getattr(req, "event_id", None),
            "cby": current_user["id"],
            "now": now
        }
    )

    for uid in (req.assigned_user_ids or []):
        is_member = db.execute(
            text("SELECT 1 FROM organization_users WHERE organization_id = :oid AND user_id = :uid AND status = 'ACTIVE'"),
            {"oid": org_ctx.org_id, "uid": uid}
        ).scalar()
        if is_member:
            db.execute(
                text("""
                    INSERT INTO task_assignments (organization_id, task_id, user_id, assigned_at, created_at)
                    VALUES (:oid, :tid, :uid, :now, :now)
                    ON CONFLICT DO NOTHING
                """),
                {"oid": org_ctx.org_id, "tid": task_id, "uid": uid, "now": now}
            )

    db.commit()
    return {"message": "Task created and assigned.", "id": task_id}


@tasks_router.patch("/{task_id}/status")
@router.patch("/tasks/{task_id}/status")
def update_task_status(
    task_id: str,
    req: TaskStatusUpdate,
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(require_permission("tasks.update_own")),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)

    if not (org_ctx.has_role("ORG_ADMIN") or org_ctx.has_role("EVENT_MANAGER")):
        is_assigned = db.execute(
            text("SELECT 1 FROM task_assignments WHERE task_id = :tid AND user_id = :uid AND organization_id = :oid"),
            {"tid": task_id, "uid": current_user["id"], "oid": org_ctx.org_id}
        ).scalar()
        if not is_assigned:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only update tasks assigned to you.")

    completed_at = now if req.status.upper() == "DONE" else None
    db.execute(
        text("""
            UPDATE tasks 
            SET status = :st, completed_at = :cat, updated_at = :now 
            WHERE id = :id AND organization_id = :oid
        """),
        {"st": req.status.upper(), "cat": completed_at, "now": now, "id": task_id, "oid": org_ctx.org_id}
    )
    db.commit()
    return {"message": f"Task status updated to {req.status}."}


@tasks_router.post("/{task_id}/comments")
@router.post("/tasks/{task_id}/comments")
def add_task_comment(
    task_id: str,
    req: TaskCommentCreate,
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)
    comment_id = str(uuid.uuid4())

    db.execute(
        text("""
            INSERT INTO task_comments (id, organization_id, task_id, user_id, comment, created_at)
            VALUES (:id, :oid, :tid, :uid, :cmt, :now)
        """),
        {
            "id": comment_id,
            "oid": org_ctx.org_id,
            "tid": task_id,
            "uid": current_user["id"],
            "cmt": req.comment.strip(),
            "now": now
        }
    )
    db.commit()
    return {"message": "Comment added.", "id": comment_id}


# ==========================================
# SPECIFIC FUNDRAISER ENDPOINTS (/{fundraiser_id})
# Registered after static /tasks routes to prevent route collisions
# ==========================================

@router.get("/{fundraiser_id}")
def get_fundraiser(
    fundraiser_id: str,
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    try:
        uuid.UUID(fundraiser_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fundraiser not found.")

    f = db.execute(
        text("""
            SELECT fp.*, f.description, f.budget_amount, f.status as fundraiser_status, u.full_name as lead_name
            FROM v_fundraiser_progress fp
            JOIN fundraisers f ON f.id = fp.fundraiser_id
            LEFT JOIN users u ON u.id = f.lead_user_id
            WHERE fp.fundraiser_id = :id AND fp.organization_id = :oid
        """),
        {"id": fundraiser_id, "oid": org_ctx.org_id}
    ).mappings().first()

    if not f:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fundraiser not found.")

    tasks = db.execute(
        text("""
            SELECT t.*, 
                   f.name as fundraiser_name, e.title as event_title,
                   u_lead.full_name as lead_name, u_creator.full_name as creator_name,
                   ARRAY_REMOVE(ARRAY_AGG(u.full_name), NULL) as assigned_names
            FROM tasks t
            LEFT JOIN fundraisers f ON f.id = t.fundraiser_id
            LEFT JOIN events e ON e.id = t.event_id
            LEFT JOIN users u_lead ON u_lead.id = f.lead_user_id
            LEFT JOIN users u_creator ON u_creator.id = t.created_by
            LEFT JOIN task_assignments ta ON ta.task_id = t.id
            LEFT JOIN users u ON u.id = ta.user_id
            WHERE t.fundraiser_id = :fid AND t.organization_id = :oid
            GROUP BY t.id, f.name, e.title, u_lead.full_name, u_creator.full_name
            ORDER BY t.created_at ASC
        """),
        {"fid": fundraiser_id, "oid": org_ctx.org_id}
    ).mappings().all()

    res = dict(f)
    raised_pct = float(f.get("raised_pct") or 0.0)
    goal_amt = float(f.get("goal_amount") or 0.0)
    raised_amt = float(f.get("raised_amount") or 0.0)
    budget_amt = float(f.get("budget_amount") or 0.0)
    res.update({
        "id": str(f["fundraiser_id"]),
        "fundraiser_id": str(f["fundraiser_id"]),
        "name": f["name"],
        "title": f["name"],
        "description": f.get("description") or "",
        "goalAmount": goal_amt,
        "goal_amount": goal_amt,
        "raisedAmount": raised_amt,
        "raised_amount": raised_amt,
        "budgetAmount": budget_amt,
        "budget_amount": budget_amt,
        "progressPercent": raised_pct,
        "progress_percent": raised_pct,
        "raised_pct": raised_pct,
        "completed_tasks": f.get("completed_tasks") or 0,
        "total_tasks": f.get("total_tasks") or 0,
        "task_done_pct": float(f.get("task_done_pct") or 0.0),
        "leadName": f.get("lead_name") or "Campaign Director",
        "lead_name": f.get("lead_name") or "Campaign Director",
        "status": f.get("fundraiser_status") or "ACTIVE",
        "tasks": [_format_task(t) for t in tasks]
    })
    return res


@router.patch("/{fundraiser_id}")
def update_fundraiser(
    fundraiser_id: str,
    req: FundraiserUpdate,
    org_ctx: OrgContext = Depends(require_permission("fundraisers.manage")),
    db: Session = Depends(get_db)
):
    try:
        uuid.UUID(fundraiser_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fundraiser not found.")

    now = datetime.now(timezone.utc)
    clauses = []
    params = {"id": fundraiser_id, "oid": org_ctx.org_id, "now": now}

    for k, v in req.model_dump(exclude_unset=True).items():
        clauses.append(f"{k} = :{k}")
        params[k] = v

    if clauses:
        clauses.append("updated_at = :now")
        db.execute(text(f"UPDATE fundraisers SET {', '.join(clauses)} WHERE id = :id AND organization_id = :oid"), params)
        db.commit()

    return {"message": "Fundraiser updated."}

