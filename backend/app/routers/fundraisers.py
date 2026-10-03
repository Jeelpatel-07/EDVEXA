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

router = APIRouter(prefix="/orgs/{org_id}/fundraisers", tags=["Fundraisers & Tasks"])

@router.get("")
def list_fundraisers(
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    rows = db.execute(
        text("SELECT * FROM v_fundraiser_progress WHERE organization_id = :oid"),
        {"oid": org_ctx.org_id}
    ).mappings().all()
    return [dict(r) for r in rows]

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

@router.get("/{fundraiser_id}")
def get_fundraiser(
    fundraiser_id: str,
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    f = db.execute(
        text("SELECT * FROM v_fundraiser_progress WHERE fundraiser_id = :id AND organization_id = :oid"),
        {"id": fundraiser_id, "oid": org_ctx.org_id}
    ).mappings().first()

    if not f:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fundraiser not found.")

    tasks = db.execute(
        text("""
            SELECT t.*, 
                   ARRAY_REMOVE(ARRAY_AGG(u.full_name), NULL) as assigned_names
            FROM tasks t
            LEFT JOIN task_assignments ta ON ta.task_id = t.id
            LEFT JOIN users u ON u.id = ta.user_id
            WHERE t.fundraiser_id = :fid AND t.organization_id = :oid
            GROUP BY t.id
            ORDER BY t.created_at ASC
        """),
        {"fid": fundraiser_id, "oid": org_ctx.org_id}
    ).mappings().all()

    res = dict(f)
    res["tasks"] = [dict(t) for t in tasks]
    return res

@router.patch("/{fundraiser_id}")
def update_fundraiser(
    fundraiser_id: str,
    req: FundraiserUpdate,
    org_ctx: OrgContext = Depends(require_permission("fundraisers.manage")),
    db: Session = Depends(get_db)
):
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

@router.post("/{fundraiser_id}/tasks", status_code=status.HTTP_201_CREATED)
def create_task(
    fundraiser_id: str,
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
            "fid": fundraiser_id,
            "eid": req.event_id,
            "cby": current_user["id"],
            "now": now
        }
    )

    for uid in req.assigned_user_ids:
        # Check that assignee is active org user
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

            # Notify assignee
            db.execute(
                text("""
                    INSERT INTO notifications (organization_id, user_id, title, message, type, channel, status, created_at)
                    VALUES (:oid, :uid, 'New Volunteer Duty Assigned', :msg, 'TASK', 'IN_APP', 'SENT', :now)
                """),
                {
                    "oid": org_ctx.org_id,
                    "uid": uid,
                    "msg": f"You were assigned to duty: {req.title.strip()}",
                    "now": now
                }
            )

    db.commit()
    return {"message": "Task created and assigned.", "id": task_id}

@router.get("/tasks/mine")
def get_my_tasks(
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(get_current_org_context),
    db: Session = Depends(get_db)
):
    tasks = db.execute(
        text("""
            SELECT t.*, f.name as fundraiser_name, e.title as event_title
            FROM tasks t
            JOIN task_assignments ta ON ta.task_id = t.id
            LEFT JOIN fundraisers f ON f.id = t.fundraiser_id
            LEFT JOIN events e ON e.id = t.event_id
            WHERE ta.user_id = :uid AND t.organization_id = :oid
            ORDER BY t.due_date ASC NULLS LAST, t.created_at DESC
        """),
        {"uid": current_user["id"], "oid": org_ctx.org_id}
    ).mappings().all()

    return [dict(t) for t in tasks]

@router.patch("/tasks/{task_id}/status")
def update_task_status(
    task_id: str,
    req: TaskStatusUpdate,
    current_user: dict = Depends(get_current_user),
    org_ctx: OrgContext = Depends(require_permission("tasks.update_own")),
    db: Session = Depends(get_db)
):
    now = datetime.now(timezone.utc)

    # Check permission: if volunteer, must be assigned to this task!
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
