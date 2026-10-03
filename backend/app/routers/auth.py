from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.deps import get_current_user
from app.schemas.auth import (RegisterRequest, LoginRequest, SelectOrgRequest, JoinOrgRequest,
    ForgotPasswordRequest, TokenRequest, ResetPasswordRequest, ChangePasswordRequest,
    AcceptInviteRequest, ProfileUpdate)
from app.services import auth_service as s

router=APIRouter(prefix="/auth",tags=["Authentication"])
COOKIE="edvexa_refresh"
COOKIE_PATH="/api/v1/auth"


def clear_cookie(response):
    response.delete_cookie(COOKIE,path=COOKIE_PATH,httponly=True,secure=settings.COOKIE_SECURE,samesite="lax")


def tokens(db,user,org,request,response,family=None,expiry=None):
    context=s.session_context(db,user,org)
    raw,family,expiry=s.new_refresh(db,user,org,family,expiry,request)
    access=s.create_access_token(user["id"],org,context["roles"],family)
    db.commit()
    response.set_cookie(COOKIE,raw,httponly=True,secure=settings.COOKIE_SECURE,samesite="lax",
        path=COOKIE_PATH,max_age=max(1,int((expiry-datetime.now(UTC)).total_seconds())))
    return {**context,"access_token":access,"token_type":"bearer","csrf_token":s.csrf_token(family),"expires_in":settings.ACCESS_TOKEN_MINUTES*60}


def send_link(user,raw,purpose):
    path="reset-password" if purpose=="PASSWORD_RESET" else "verify-email"
    s.send_email_notification(user["email"],"EDVEXA account action","Use this single-use link:",f"{settings.APP_BASE_URL.rstrip('/')}/{path}#token={raw}")


@router.post("/register",status_code=201)
def register(data:RegisterRequest,db:Session=Depends(get_db)):
    req_role = (data.role or "GUEST").strip().upper()
    if req_role in ("PLATFORM_ADMIN", "ORG_ADMIN"):
        s.fail("Platform Administrator and Organization Administrator accounts cannot be self-registered.", 422)

    ALLOWED_ROLES = {"TREASURER", "EVENT_MANAGER", "GATE_STAFF", "VOLUNTEER", "MEMBER", "GUEST", "STUDENT"}
    if req_role not in ALLOWED_ROLES:
        s.fail(f"Invalid registration role '{data.role}'.", 422)

    org = None
    if data.join_code:
        org = db.execute(text("SELECT * FROM organizations WHERE join_code=:code AND status='ACTIVE' FOR UPDATE"), dict(code=data.join_code.strip())).mappings().first()
        if not org:
            s.fail("Invalid organization code", 400)
    elif req_role in ("TREASURER", "EVENT_MANAGER", "GATE_STAFF", "VOLUNTEER", "MEMBER"):
        # Default to the primary EDVEXA Student Association organization if no code provided
        org = db.execute(text("SELECT * FROM organizations WHERE slug='edvexa' AND status='ACTIVE'")).mappings().first()

    if data.student_id and not org:
        s.fail("An organization code is required with a student ID", 400)
    if org and data.student_id and db.execute(text("SELECT 1 FROM organization_users WHERE organization_id=:org AND student_id=:student"), dict(org=org["id"], student=data.student_id.strip())).scalar():
        s.fail("Student ID already belongs to an account in this organization", 409)

    email = str(data.email).lower()
    pw = s.hash_password(data.password)

    user = db.execute(text("""
        INSERT INTO users(email, password_hash, full_name, status, email_verified_at, created_via)
        VALUES(:email, :pw, :name, 'ACTIVE', now(), 'SELF_SIGNUP')
        ON CONFLICT(email) DO NOTHING RETURNING *
    """), dict(email=email, pw=pw, name=data.full_name.strip())).mappings().first()

    if not user:
        s.fail("An account with this email address already exists.", 409)

    if org:
        db.execute(text("""
            INSERT INTO organization_users(organization_id, user_id, student_id, joined_via, status)
            VALUES(:org, :uid, :student, 'JOIN_CODE', 'ACTIVE')
            ON CONFLICT DO NOTHING
        """), dict(org=org["id"], uid=user["id"], student=data.student_id.strip() if data.student_id else None))

        # Assign requested staff role
        if req_role in ("TREASURER", "EVENT_MANAGER", "GATE_STAFF", "VOLUNTEER"):
            role_id = db.execute(text("SELECT id FROM roles WHERE code=:code"), dict(code=req_role)).scalar()
            term_id = db.execute(text("SELECT id FROM academic_terms WHERE organization_id=:oid AND is_current=true"), dict(oid=org["id"])).scalar()
            if role_id and term_id:
                db.execute(text("""
                    INSERT INTO user_roles(user_id, role_id, organization_id, term_id, valid_from, created_at)
                    VALUES(:uid, :rid, :oid, :tid, now(), now())
                    ON CONFLICT DO NOTHING
                """), dict(uid=user["id"], rid=role_id, oid=org["id"], tid=term_id))

        # Provision active membership if registered as Member
        elif req_role == "MEMBER":
            plan = db.execute(text("SELECT id FROM membership_plans WHERE organization_id=:oid AND is_active=true LIMIT 1"), dict(oid=org["id"])).mappings().first()
            if plan:
                seq_val = db.execute(text("SELECT fn_next_sequence(:oid, 'MEMBER', 2026)"), dict(oid=org["id"])).scalar() or 1
                db.execute(text("""
                    INSERT INTO memberships (organization_id, user_id, plan_id, member_number, status, payment_status, start_date, end_date, qr_token, created_at)
                    VALUES (:oid, :uid, :pid, :mnum, 'ACTIVE', 'PAID', CURRENT_DATE, CURRENT_DATE + interval '365 days', gen_random_uuid(), now())
                    ON CONFLICT DO NOTHING
                """), dict(oid=org["id"], uid=user["id"], pid=plan["id"], mnum=f"EDV-MEM-2026-{seq_val:05d}"))

    db.commit()
    return {
        "message": f"Successfully registered as {req_role}. You can sign in immediately.",
        "email": email,
        "role": req_role
    }


@router.post("/verify-email")
def verify_email(data:TokenRequest,db:Session=Depends(get_db)):
    user,tok=s.lock_auth_token(db,data.token,"EMAIL_VERIFY")
    if user["status"]!="PENDING_EMAIL_VERIFICATION":
        s.fail("This account cannot be verified with this link",400)
    db.execute(text("UPDATE users SET status='ACTIVE',email_verified_at=now() WHERE id=:uid"),dict(uid=user["id"]))
    db.execute(text("UPDATE auth_tokens SET used_at=now() WHERE user_id=:uid AND purpose='EMAIL_VERIFY'"),dict(uid=user["id"]))
    db.commit()
    return {"message":"Email verified. Sign in to continue."}


@router.get("/verify-email")
def verify_email_get(token:str,db:Session=Depends(get_db)):
    return verify_email(TokenRequest(token=token),db)


@router.post("/forgot-password")
def forgot(data:ForgotPasswordRequest,db:Session=Depends(get_db)):
    return request_link(data,db,"PASSWORD_RESET")


@router.post("/resend-verification")
def resend(data:ForgotPasswordRequest,db:Session=Depends(get_db)):
    return request_link(data,db,"EMAIL_VERIFY")


def request_link(data,db,purpose):
    user=db.execute(text("SELECT * FROM users WHERE email=:email FOR UPDATE"),dict(email=str(data.email).lower())).mappings().first()
    required="ACTIVE" if purpose=="PASSWORD_RESET" else "PENDING_EMAIL_VERIFICATION"
    if user and user["status"]==required:
        raw=s.issue_auth_token(db,user,purpose)
        db.commit()
        send_link(user,raw,purpose)
    return {"message":"If the account is eligible, a link has been sent."}


@router.post("/login")
def login(data:LoginRequest,request:Request,response:Response,db:Session=Depends(get_db)):
    s.trusted_origin(request)
    email=str(data.email).lower()
    ip=request.client.host if request.client else "unknown"
    recent=db.execute(text("SELECT count(*) FROM login_attempts WHERE ip=:ip AND NOT successful AND created_at>now()-interval '15 minutes'"),dict(ip=ip)).scalar()
    if recent>=30:
        s.fail("Too many attempts from this address. Try again in 15 minutes.",429)
    user=db.execute(text("SELECT * FROM users WHERE email=:email FOR UPDATE"),dict(email=email)).mappings().first()
    if user and user["locked_until"] and user["locked_until"]>datetime.now(UTC):
        s.fail("Account is locked. Try again in 15 minutes.",429)
    valid=s.verify_password(data.password,user["password_hash"] if user else s.DUMMY_HASH)
    db.execute(text("INSERT INTO login_attempts(email,ip,successful,user_agent) VALUES(:email,:ip,:ok,:ua)"),dict(email=email,ip=ip,ok=bool(user and valid),ua=request.headers.get("user-agent","")[:500]))
    if not user or not valid:
        if user:
            failures=db.execute(text("SELECT count(*) FROM login_attempts WHERE email=:email AND NOT successful AND created_at>now()-interval '15 minutes'"),dict(email=email)).scalar()
            db.execute(text("UPDATE users SET failed_login_count=:count,locked_until=:lock WHERE id=:uid"),dict(count=failures,lock=datetime.now(UTC)+timedelta(minutes=15) if failures>=5 else None,uid=user["id"]))
            if failures>=5:
                s.audit(db,"ACCOUNT_LOCKED",user,target=user["id"])
        db.commit()
        s.fail("Invalid email or password")
    if user["status"]!="ACTIVE" or not user["email_verified_at"]:
        s.fail("Account must be active and email verified",403)
    db.execute(text("UPDATE users SET failed_login_count=0,locked_until=NULL,last_login_at=now() WHERE id=:uid"),dict(uid=user["id"]))
    context=s.session_context(db,user)
    active=[o for o in context["organizations"] if o["status"]=="ACTIVE"]
    if context["organizations"] and not active:
        s.fail("Your organization is suspended",403)
    org=active[0]["id"] if len(active)==1 else None
    return tokens(db,user,org,request,response)


@router.get("/me")
@router.get("/context",include_in_schema=False)
def me(user:dict=Depends(get_current_user),db:Session=Depends(get_db)):
    return s.session_context(db,user,user["token_payload"]["org_id"])


@router.patch("/profile")
def profile(data:ProfileUpdate,user:dict=Depends(get_current_user),db:Session=Depends(get_db)):
    db.execute(text("UPDATE users SET full_name=:name,phone=:phone WHERE id=:uid"),dict(name=data.full_name.strip(),phone=data.phone,uid=user["id"]))
    db.commit()
    return {"message":"Profile saved"}


@router.post("/select-org")
def select_org(data:SelectOrgRequest,request:Request,response:Response,user:dict=Depends(get_current_user),db:Session=Depends(get_db)):
    if s.live_roles(db,user["id"],None):
        s.fail("Platform accounts cannot select an organization",403)
    user=dict(db.execute(text("SELECT * FROM users WHERE id=:uid FOR UPDATE"),dict(uid=user["id"])).mappings().one())|{"token_payload":user["token_payload"]}
    s.session_context(db,user,data.organization_id)
    s.revoke_family(db,user["token_payload"]["sid"],"ORG_SWITCH")
    return tokens(db,user,data.organization_id,request,response)


@router.post("/join-org")
def join(data:JoinOrgRequest,request:Request,response:Response,user:dict=Depends(get_current_user),db:Session=Depends(get_db)):
    if s.live_roles(db,user["id"],None):
        s.fail("Platform accounts cannot join organizations",403)
    org=db.execute(text("SELECT id FROM organizations WHERE join_code=:code AND status='ACTIVE' FOR UPDATE"),dict(code=data.join_code.strip())).scalar()
    if not org:
        s.fail("Invalid organization code",400)
    row=db.execute(text("SELECT status FROM organization_users WHERE organization_id=:org AND user_id=:uid"),dict(org=org,uid=user["id"])).scalar()
    if row and row!="ACTIVE":
        s.fail("Organization access is suspended",403)
    db.execute(text("INSERT INTO organization_users(organization_id,user_id,student_id,joined_via) VALUES(:org,:uid,:student,'JOIN_CODE') ON CONFLICT(organization_id,user_id) DO NOTHING"),dict(org=org,uid=user["id"],student=data.student_id))
    s.audit(db,"ORGANIZATION_JOIN",user,org,user["id"])
    s.revoke_family(db,user["token_payload"]["sid"],"ORG_SWITCH")
    return tokens(db,user,org,request,response)


@router.get("/csrf")
def csrf(request:Request,db:Session=Depends(get_db)):
    s.trusted_origin(request)
    pair=s.lock_refresh(db,request.cookies.get(COOKIE))
    if not pair:
        s.fail()
    user,row=pair
    if row["revoked_at"] or row["expires_at"]<=datetime.now(UTC) or user["status"]!="ACTIVE" or row["credential_version"]!=user["credential_version"]:
        s.fail()
    return {"csrf_token":s.csrf_token(row["family_id"])}


@router.post("/refresh")
def refresh(request:Request,response:Response,db:Session=Depends(get_db)):
    s.trusted_origin(request)
    pair=s.lock_refresh(db,request.cookies.get(COOKIE))
    if not pair:
        s.fail()
    user,row=pair
    s.check_csrf(request,row["family_id"])
    if row["revoked_at"] or row["expires_at"]<=datetime.now(UTC) or user["status"]!="ACTIVE" or not user["email_verified_at"] or row["credential_version"]!=user["credential_version"]:
        s.revoke_family(db,row["family_id"],"REUSE_OR_INVALID")
        db.commit()
        s.fail()
    db.execute(text("UPDATE refresh_tokens SET revoked_at=now(),revoked_reason='ROTATED' WHERE id=:id"),dict(id=row["id"]))
    return tokens(db,user,row["organization_id"],request,response,row["family_id"],row["expires_at"])


@router.post("/logout")
def logout(request:Request,response:Response,db:Session=Depends(get_db)):
    s.trusted_origin(request)
    pair=s.lock_refresh(db,request.cookies.get(COOKIE))
    if pair:
        user,row=pair
        s.check_csrf(request,row["family_id"])
        s.revoke_family(db,row["family_id"],"LOGOUT")
        db.commit()
    clear_cookie(response)
    return {"message":"Signed out"}


@router.post("/logout-all")
def logout_all(response:Response,user:dict=Depends(get_current_user),db:Session=Depends(get_db)):
    db.execute(text("SELECT id FROM users WHERE id=:uid FOR UPDATE"),dict(uid=user["id"]))
    s.revoke_all(db,user["id"],"LOGOUT_ALL")
    db.commit()
    clear_cookie(response)
    return {"message":"All sessions ended"}


def update_password(db,user,password):
    db.execute(text("UPDATE users SET password_hash=:hash,credential_version=credential_version+1,must_change_password=false WHERE id=:uid"),dict(hash=s.hash_password(password),uid=user["id"]))
    db.execute(text("UPDATE auth_tokens SET used_at=now() WHERE user_id=:uid AND purpose='PASSWORD_RESET'"),dict(uid=user["id"]))
    s.revoke_all(db,user["id"])
    s.audit(db,"PASSWORD_CHANGED",user,target=user["id"])


@router.post("/change-password")
def change(data:ChangePasswordRequest,response:Response,user:dict=Depends(get_current_user),db:Session=Depends(get_db)):
    row=db.execute(text("SELECT * FROM users WHERE id=:uid FOR UPDATE"),dict(uid=user["id"])).mappings().one()
    if not s.verify_password(data.current_password,row["password_hash"]):
        s.fail("Current password is incorrect",400)
    update_password(db,row,data.new_password)
    db.commit()
    clear_cookie(response)
    return {"message":"Password changed; sign in again on all devices"}


@router.post("/reset-password")
def reset(data:ResetPasswordRequest,response:Response,db:Session=Depends(get_db)):
    user,tok=s.lock_auth_token(db,data.token,"PASSWORD_RESET")
    if user["status"]!="ACTIVE":
        s.fail("Account is not active",400)
    update_password(db,user,data.new_password)
    db.commit()
    clear_cookie(response)
    return {"message":"Password reset; sign in again"}


@router.get("/sessions")
def sessions(user:dict=Depends(get_current_user),db:Session=Depends(get_db)):
    rows=db.execute(text("""SELECT family_id AS id,user_agent,ip,created_at,last_used_at,expires_at FROM refresh_tokens
    WHERE user_id=:uid AND revoked_at IS NULL AND expires_at>now() ORDER BY created_at DESC"""),dict(uid=user["id"])).mappings()
    return [{**dict(r),"is_current":str(r["id"])==user["token_payload"]["sid"]} for r in rows]


@router.post("/accept-invite")
def accept(data:AcceptInviteRequest,request:Request,db:Session=Depends(get_db)):
    invitation=db.execute(text("SELECT * FROM invitations WHERE token_hash=:hash FOR UPDATE"),dict(hash=s.hash_token(data.token))).mappings().first()
    if not invitation or invitation["accepted_at"] or invitation["revoked_at"] or invitation["expires_at"]<=datetime.now(UTC):
        s.fail("Invalid or expired invitation",400)
    org=db.execute(text("SELECT * FROM organizations WHERE id=:org AND status='ACTIVE' FOR UPDATE"),dict(org=invitation["organization_id"])).mappings().first()
    role=db.execute(text("SELECT code FROM roles WHERE id=:id"),dict(id=invitation["role_id"])).scalar()
    term=db.execute(text("SELECT id FROM academic_terms WHERE organization_id=:org AND is_current AND CURRENT_DATE BETWEEN start_date AND end_date"),dict(org=invitation["organization_id"])).scalar()
    if not org or role=="PLATFORM_ADMIN" or not term or (invitation["term_id"] and invitation["term_id"]!=term):
        s.fail("Invitation is no longer valid for this organization and term",400)
    user=db.execute(text("SELECT * FROM users WHERE email=:email FOR UPDATE"),dict(email=invitation["email"])).mappings().first()
    if user:
        from fastapi.security import HTTPAuthorizationCredentials
        header=request.headers.get("authorization","")
        if not header.startswith("Bearer "):
            s.fail("Sign in with the invited email before accepting this invitation")
        current=get_current_user(request,HTTPAuthorizationCredentials(scheme="Bearer",credentials=header[7:]),db)
        if current["id"]!=user["id"] or s.live_roles(db,user["id"],None):
            s.fail("Sign in with the invited organization account",403)
    else:
        if not data.password or not data.full_name:
            s.fail("Full name and password are required for a new account",422)
        user=db.execute(text("""INSERT INTO users(email,password_hash,full_name,status,email_verified_at,created_via)
        VALUES(:email,:hash,:name,'ACTIVE',now(),'INVITE') RETURNING *"""),dict(email=invitation["email"],hash=s.hash_password(data.password),name=data.full_name.strip())).mappings().one()
    existing=db.execute(text("SELECT status FROM organization_users WHERE organization_id=:org AND user_id=:uid"),dict(org=org["id"],uid=user["id"])).scalar()
    if existing and existing!="ACTIVE":
        s.fail("This account is suspended in the organization",403)
    db.execute(text("INSERT INTO organization_users(organization_id,user_id,joined_via) VALUES(:org,:uid,'INVITE') ON CONFLICT(organization_id,user_id) DO NOTHING"),dict(org=org["id"],uid=user["id"]))
    db.execute(text("INSERT INTO user_roles(user_id,organization_id,role_id,term_id,assigned_by) VALUES(:uid,:org,:role,:term,:actor) ON CONFLICT DO NOTHING"),dict(uid=user["id"],org=org["id"],role=invitation["role_id"],term=term,actor=invitation["invited_by"]))
    db.execute(text("UPDATE invitations SET accepted_at=now() WHERE id=:id"),dict(id=invitation["id"]))
    s.audit(db,"ORG_ADMIN_CREATED" if role=="ORG_ADMIN" else "INVITATION_ACCEPTED",dict(user),org["id"],user["id"])
    db.commit()
    return {"message":"Invitation accepted. Sign in to continue."}
