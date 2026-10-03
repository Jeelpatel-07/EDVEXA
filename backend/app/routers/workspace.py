"""Workspace operations missing from the original domain routers."""
import secrets
from datetime import date
from decimal import Decimal
from pathlib import Path
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import FileResponse
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.deps import OrgContext, get_current_org_context, get_current_user, require_permission
from app.services.auth_service import audit, live_roles
from app.routers import announcements, finance, fundraisers, membership, org_admin, store
from app.schemas.fundraisers import TaskCreate, TaskStatusUpdate, TaskCommentCreate
from app.schemas.events import TicketTypeUpdate
from app.schemas.store import VariantCreate

router=APIRouter(tags=["Workspace"])


def find(db,table,item,org):
    # table names are constants supplied by our endpoint code, never request values.
    row=db.execute(text(f"SELECT * FROM {table} WHERE id=:id AND organization_id=:org"),dict(id=item,org=org)).mappings().first()
    if not row:
        raise HTTPException(404,"Record not found in this organization")
    return dict(row)


class RolesUpdate(BaseModel):
    model_config=ConfigDict(extra="forbid")
    roles:list[Literal["TREASURER","EVENT_MANAGER","GATE_STAFF","VOLUNTEER"]]=Field(max_length=4)


@router.put("/orgs/{org_id}/users/{user_id}/roles")
def replace_roles(user_id:UUID,data:RolesUpdate,ctx:OrgContext=Depends(require_permission("users.assign_role")),user:dict=Depends(get_current_user),db:Session=Depends(get_db)):
    db.execute(text("SELECT id FROM organizations WHERE id=:org FOR UPDATE"),dict(org=ctx.org_id))
    if not ctx.term_id:
        raise HTTPException(409,"Create a current academic term before assigning roles")
    if not db.execute(text("SELECT 1 FROM organization_users WHERE organization_id=:org AND user_id=:uid AND status='ACTIVE'"),dict(org=ctx.org_id,uid=user_id)).scalar():
        raise HTTPException(404,"Active organization user not found")
    db.execute(text("""UPDATE user_roles SET revoked_at=now() WHERE organization_id=:org AND user_id=:uid AND term_id=:term
        AND role_id IN (SELECT id FROM roles WHERE is_assignable_via_api) AND revoked_at IS NULL"""),dict(org=ctx.org_id,uid=user_id,term=ctx.term_id))
    for role in set(data.roles):
        db.execute(text("""INSERT INTO user_roles(user_id,organization_id,role_id,term_id,assigned_by)
        SELECT :uid,:org,id,:term,:actor FROM roles WHERE code=:role AND is_assignable_via_api"""),dict(uid=user_id,org=ctx.org_id,term=ctx.term_id,actor=user["id"],role=role))
    audit(db,"ROLE_REPLACE",user,ctx.org_id,user_id,{"roles":data.roles})
    db.commit()
    return {"roles":live_roles(db,user_id,ctx.org_id)}


@router.post("/orgs/{org_id}/settings/regenerate-join-code")
def join_code(ctx:OrgContext=Depends(require_permission("organization.settings.update")),user:dict=Depends(get_current_user),db:Session=Depends(get_db)):
    code=secrets.token_hex(6).upper()
    db.execute(text("UPDATE organizations SET join_code=:code WHERE id=:org"),dict(code=code,org=ctx.org_id))
    audit(db,"JOIN_CODE_CHANGED",user,ctx.org_id)
    db.commit()
    return {"join_code":code}


@router.post("/orgs/{org_id}/terms/{term_id}/set-current")
def switch_term(term_id:UUID,ctx:OrgContext=Depends(require_permission("organization.settings.update")),user:dict=Depends(get_current_user),db:Session=Depends(get_db)):
    db.execute(text("SELECT id FROM organizations WHERE id=:org FOR UPDATE"),dict(org=ctx.org_id))
    term=find(db,"academic_terms",term_id,ctx.org_id)
    if not term["start_date"]<=date.today()<=term["end_date"]:
        raise HTTPException(400,"Current term must include today")
    # Carry administrators forward explicitly; committee positions require new assignments.
    db.execute(text("""INSERT INTO user_roles(user_id,role_id,organization_id,term_id,assigned_by)
       SELECT DISTINCT ur.user_id,ur.role_id,ur.organization_id,:term,:actor FROM user_roles ur
       JOIN roles r ON r.id=ur.role_id JOIN organization_users ou ON ou.user_id=ur.user_id AND ou.organization_id=ur.organization_id
       WHERE ur.organization_id=:org AND ur.revoked_at IS NULL AND r.code='ORG_ADMIN' AND ou.status='ACTIVE'
       ON CONFLICT DO NOTHING"""),dict(term=term_id,actor=user["id"],org=ctx.org_id))
    db.execute(text("UPDATE academic_terms SET is_current=false WHERE organization_id=:org"),dict(org=ctx.org_id))
    db.execute(text("UPDATE academic_terms SET is_current=true WHERE id=:id"),dict(id=term_id))
    audit(db,"CURRENT_TERM_CHANGED",user,ctx.org_id,term_id)
    db.commit()
    return {"message":"Current term changed; assign the new committee roles."}


@router.get("/orgs/{org_id}/tasks/mine")
def my_tasks(user:dict=Depends(get_current_user),ctx:OrgContext=Depends(get_current_org_context),db:Session=Depends(get_db)):
    return fundraisers.get_my_tasks(user,ctx,db)


@router.get("/orgs/{org_id}/tasks")
def tasks(user:dict=Depends(get_current_user),ctx:OrgContext=Depends(get_current_org_context),db:Session=Depends(get_db),limit:int=Query(100,ge=1,le=500),offset:int=Query(0,ge=0)):
    return [dict(r) for r in db.execute(text("""SELECT t.* FROM tasks t WHERE t.organization_id=:org
       AND (:manage OR EXISTS(SELECT 1 FROM task_assignments a WHERE a.task_id=t.id AND a.organization_id=:org AND a.user_id=:uid))
       ORDER BY t.created_at DESC LIMIT :limit OFFSET :offset"""),dict(org=ctx.org_id,uid=user["id"],manage=ctx.has_permission("tasks.assign"),limit=limit,offset=offset)).mappings()]


def task_access(db,task_id,ctx,user):
    row=find(db,"tasks",task_id,ctx.org_id)
    if not ctx.has_permission("tasks.assign") and not db.execute(text("SELECT 1 FROM task_assignments WHERE organization_id=:org AND task_id=:id AND user_id=:uid"),dict(org=ctx.org_id,id=task_id,uid=user["id"])).scalar():
        raise HTTPException(403,"You can access only tasks assigned to you")
    return row


@router.get("/orgs/{org_id}/tasks/{task_id}")
def task_detail(task_id:UUID,user:dict=Depends(get_current_user),ctx:OrgContext=Depends(get_current_org_context),db:Session=Depends(get_db)):
    row=task_access(db,task_id,ctx,user)
    row["comments"]=[dict(c) for c in db.execute(text("SELECT c.*,u.full_name FROM task_comments c JOIN users u ON u.id=c.user_id WHERE c.task_id=:id AND c.organization_id=:org ORDER BY c.created_at"),dict(id=task_id,org=ctx.org_id)).mappings()]
    return row


@router.post("/orgs/{org_id}/tasks",status_code=201)
def create_task(data:TaskCreate,user:dict=Depends(get_current_user),ctx:OrgContext=Depends(require_permission("tasks.assign")),db:Session=Depends(get_db)):
    return fundraisers.create_task(data.fundraiser_id,data,user,ctx,db)


@router.patch("/orgs/{org_id}/tasks/{task_id}/status")
def task_status(task_id:UUID,data:TaskStatusUpdate,user:dict=Depends(get_current_user),ctx:OrgContext=Depends(require_permission("tasks.update_own")),db:Session=Depends(get_db)):
    task_access(db,task_id,ctx,user)
    if data.status not in {"TODO","IN_PROGRESS","DONE","BLOCKED"}:
        raise HTTPException(422,"Invalid task status")
    return fundraisers.update_task_status(str(task_id),data,user,ctx,db)


@router.post("/orgs/{org_id}/tasks/{task_id}/comments")
def task_comment(task_id:UUID,data:TaskCommentCreate,user:dict=Depends(get_current_user),ctx:OrgContext=Depends(get_current_org_context),db:Session=Depends(get_db)):
    task_access(db,task_id,ctx,user)
    return fundraisers.add_task_comment(str(task_id),data,user,ctx,db)


@router.delete("/orgs/{org_id}/tasks/{task_id}")
def delete_task(task_id:UUID,user:dict=Depends(get_current_user),ctx:OrgContext=Depends(require_permission("tasks.assign")),db:Session=Depends(get_db)):
    task_access(db,task_id,ctx,user)
    db.execute(text("DELETE FROM tasks WHERE id=:id AND organization_id=:org"),dict(id=task_id,org=ctx.org_id))
    db.commit()
    return {"message":"Task deleted"}


@router.get("/orgs/{org_id}/notifications/me")
def notifications(user:dict=Depends(get_current_user),ctx:OrgContext=Depends(get_current_org_context),db:Session=Depends(get_db)):
    return announcements.get_my_notifications(user,ctx,db)


@router.patch("/orgs/{org_id}/notifications/{notification_id}/read")
def read_notification(notification_id:UUID,user:dict=Depends(get_current_user),ctx:OrgContext=Depends(get_current_org_context),db:Session=Depends(get_db)):
    changed=db.execute(text("UPDATE notifications SET status='READ',read_at=now() WHERE id=:id AND organization_id=:org AND user_id=:uid"),dict(id=notification_id,org=ctx.org_id,uid=user["id"]))
    if not changed.rowcount:
        raise HTTPException(404,"Notification not found")
    db.commit()
    return {"message":"Notification read"}


@router.get("/orgs/{org_id}/finance/claims/mine")
def my_claims(user:dict=Depends(get_current_user),ctx:OrgContext=Depends(get_current_org_context),db:Session=Depends(get_db)):
    return [r for r in finance.list_claims(user,ctx,db) if str(r["user_id"])==str(user["id"])]


@router.get("/orgs/{org_id}/finance/receipts/{receipt_id}")
def receipt_file(receipt_id:UUID,user:dict=Depends(get_current_user),ctx:OrgContext=Depends(get_current_org_context),db:Session=Depends(get_db)):
    receipt=find(db,"expense_receipts",receipt_id,ctx.org_id)
    claim=find(db,"expense_claims",receipt["claim_id"],ctx.org_id)
    if str(claim["user_id"])!=str(user["id"]) and not ctx.has_permission("expenses.approve"):
        raise HTTPException(403,"Receipt is private")
    path=(settings.UPLOAD_DIR/"receipts"/Path(receipt["file_url"]).name).resolve()
    if path.parent!=(settings.UPLOAD_DIR/"receipts").resolve() or not path.is_file():
        raise HTTPException(404,"Receipt file not found")
    return FileResponse(path,media_type=receipt["mime_type"],filename=receipt["file_name"])


@router.get("/orgs/{org_id}/finance/export.csv")
def export(ctx:OrgContext=Depends(require_permission("finance.report")),db:Session=Depends(get_db)):
    return finance.export_csv(ctx,db)


@router.get("/orgs/{org_id}/store/low-stock")
def low_stock(ctx:OrgContext=Depends(require_permission("products.manage_stock")),db:Session=Depends(get_db)):
    return store.get_low_stock_inventory(ctx,db)


@router.post("/orgs/{org_id}/store/products/{product_id}/variants",status_code=201)
def add_variant(product_id:UUID,data:VariantCreate,user:dict=Depends(get_current_user),ctx:OrgContext=Depends(require_permission("products.manage")),db:Session=Depends(get_db)):
    find(db,"products",product_id,ctx.org_id)
    row=db.execute(text("""INSERT INTO product_variants(organization_id,product_id,sku,size,color,stock_quantity,low_stock_threshold)
    VALUES(:org,:product,:sku,:size,:color,:stock,:low) RETURNING *"""),dict(org=ctx.org_id,product=product_id,sku=data.sku,size=data.size,color=data.color,stock=data.stock_quantity,low=data.low_stock_threshold)).mappings().one()
    audit(db,"PRODUCT_VARIANT_CREATED",user,ctx.org_id,row["id"])
    db.commit()
    return dict(row)


@router.patch("/orgs/{org_id}/events/{event_id}/ticket-types/{type_id}")
def ticket_type_update(event_id:UUID,type_id:UUID,data:TicketTypeUpdate,user:dict=Depends(get_current_user),ctx:OrgContext=Depends(require_permission("tickets.manage")),db:Session=Depends(get_db)):
    row=find(db,"ticket_types",type_id,ctx.org_id)
    if row["event_id"]!=event_id:
        raise HTTPException(404,"Ticket type not found for this event")
    fields=data.model_dump(exclude_unset=True)
    if fields:
        clause=','.join(f'{k}=:{k}' for k in fields)
        db.execute(text(f"UPDATE ticket_types SET {clause} WHERE id=:id AND organization_id=:org"),dict(fields,id=type_id,org=ctx.org_id))
        audit(db,"TICKET_TYPE_UPDATED",user,ctx.org_id,type_id,fields)
        db.commit()
    return find(db,"ticket_types",type_id,ctx.org_id)


@router.post("/orgs/{org_id}/events/{event_id}/cancel")
def cancel_event(event_id:UUID,user:dict=Depends(get_current_user),ctx:OrgContext=Depends(require_permission("events.update")),db:Session=Depends(get_db)):
    find(db,"events",event_id,ctx.org_id)
    db.execute(text("UPDATE events SET status='CANCELLED' WHERE id=:id AND organization_id=:org"),dict(id=event_id,org=ctx.org_id))
    audit(db,"EVENT_CANCELLED",user,ctx.org_id,event_id)
    db.commit()
    return {"message":"Event cancelled. Review paid tickets for refunds."}


class Budget(BaseModel):
    term_id:UUID
    category_id:UUID
    allocated_amount:Decimal=Field(ge=0,max_digits=12,decimal_places=2)


@router.get("/orgs/{org_id}/finance/budgets")
def budgets(ctx:OrgContext=Depends(require_permission("finance.view_summary")),db:Session=Depends(get_db)):
    return [dict(r) for r in db.execute(text("""SELECT b.*,c.name AS category_name,coalesce((SELECT sum(l.amount) FROM ledger_entries l
    WHERE l.organization_id=b.organization_id AND l.term_id=b.term_id AND l.category_id=b.category_id),0) AS actual_amount
    FROM term_budgets b JOIN budget_categories c ON c.id=b.category_id WHERE b.organization_id=:org"""),dict(org=ctx.org_id)).mappings()]


@router.put("/orgs/{org_id}/finance/budgets")
def set_budget(data:Budget,ctx:OrgContext=Depends(require_permission("finance.report")),db:Session=Depends(get_db)):
    find(db,"academic_terms",data.term_id,ctx.org_id)
    find(db,"budget_categories",data.category_id,ctx.org_id)
    db.execute(text("""INSERT INTO term_budgets(organization_id,term_id,category_id,allocated_amount)
    VALUES(:org,:term,:category,:amount) ON CONFLICT(organization_id,term_id,category_id) DO UPDATE SET allocated_amount=EXCLUDED.allocated_amount"""),dict(org=ctx.org_id,term=data.term_id,category=data.category_id,amount=data.allocated_amount))
    db.commit()
    return {"message":"Budget saved"}


@router.get("/public/o/{slug}/events/{event_id}")
def public_event(slug:str,event_id:UUID,db:Session=Depends(get_db)):
    from app.routers.public import get_public_events
    row=next((r for r in get_public_events(slug,db) if r["id"]==str(event_id)),None)
    if not row:
        raise HTTPException(404,"Published event not found")
    return row


@router.get("/public/o/{slug}/announcements/{announcement_id}")
def public_announcement(slug:str,announcement_id:UUID,db:Session=Depends(get_db)):
    from app.routers.public import get_public_announcements
    row=next((r for r in get_public_announcements(slug,db) if str(r["id"])==str(announcement_id)),None)
    if not row:
        raise HTTPException(404,"Public announcement not found")
    return row
