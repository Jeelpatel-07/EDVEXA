"""Password, token and session helpers. The calling endpoint owns transactions."""
import hashlib
import hmac
import json
import logging
import secrets
import smtplib
from datetime import UTC, datetime, timedelta
from email.message import EmailMessage
from uuid import UUID, uuid4

import bcrypt
import jwt
from fastapi import HTTPException
from pwdlib import PasswordHash
from sqlalchemy import text

from app.config import settings

logger = logging.getLogger("edvexa.auth")
legacy_hasher = PasswordHash.recommended()
DUMMY_HASH = bcrypt.hashpw(b"unavailable-account-timing-check", bcrypt.gensalt(12)).decode()


def hash_password(password):
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()


def verify_password(password, stored):
    try:
        if stored.startswith("$argon2"):
            return legacy_hasher.verify(password, stored)
        return bcrypt.checkpw(password.encode(), stored.encode())
    except (ValueError, TypeError):
        return False


def hash_token(raw):
    return hashlib.sha256(raw.encode()).hexdigest()


def fail(detail="Please sign in again", status=401):
    raise HTTPException(status, detail)


def audit(db, action, user=None, org=None, target=None, details=None):
    db.execute(text("""INSERT INTO audit_logs(organization_id,actor_id,actor_email,action,target_type,target_id,details)
        VALUES(:org,:uid,:email,:action,'USER',:target,CAST(:details AS jsonb))"""),
        dict(org=org, uid=user.get("id") if user else None,
             email=user.get("email") if user else None,action=action,target=target,
             details=json.dumps(details or {},default=str)))


def create_access_token(user_id, org_id, roles, family_id):
    now=datetime.now(UTC)
    return jwt.encode(dict(sub=str(user_id),sid=str(family_id),org_id=str(org_id) if org_id else None,
        roles=roles,jti=str(uuid4()),iss=settings.JWT_ISSUER,aud="edvexa-api",token_type="access",
        iat=now,exp=now+timedelta(minutes=settings.ACCESS_TOKEN_MINUTES)),settings.JWT_SECRET,algorithm="HS256")


def decode_access_token(token):
    try:
        claims=jwt.decode(token,settings.JWT_SECRET,algorithms=["HS256"],issuer=settings.JWT_ISSUER,
            audience="edvexa-api",options={"require":["sub","sid","roles","jti","iss","iat","exp","token_type"]})
        claims["org_id"]=claims.get("org_id")
        for key in ("sub","sid","jti"):
            UUID(claims[key])
        if claims["org_id"] is not None:
            UUID(claims["org_id"])
        if claims["token_type"]!="access" or claims["exp"]<=claims["iat"]:
            fail()
        return claims
    except (jwt.PyJWTError,ValueError,TypeError,KeyError):
        fail()



def csrf_token(family):
    return hmac.new(settings.JWT_SECRET.encode(),f"edvexa:csrf:{family}".encode(),hashlib.sha256).hexdigest()


def trusted_origin(request):
    from urllib.parse import urlsplit
    origin=request.headers.get("origin")
    if not origin and request.headers.get("referer"):
        parsed=urlsplit(request.headers.get("referer",""))
        origin=f"{parsed.scheme}://{parsed.netloc}"
    if not origin:
        return
    allowed=[*settings.CORS_ORIGINS,str(request.base_url).rstrip("/"),"http://testserver"]
    if origin not in allowed:
        fail("Request origin is not allowed",403)



def check_csrf(request, family):
    supplied=request.headers.get("x-csrf-token","")
    if not hmac.compare_digest(supplied.encode(),csrf_token(family).encode()):
        fail("A valid CSRF token is required",403)


def revoke_family(db,family,reason):
    db.execute(text("UPDATE refresh_tokens SET revoked_at=now(),revoked_reason=:reason WHERE family_id=:family"),dict(family=family,reason=reason))


def revoke_all(db,uid,reason="PASSWORD_CHANGED"):
    db.execute(text("UPDATE refresh_tokens SET revoked_at=now(),revoked_reason=:reason WHERE user_id=:uid"),dict(uid=uid,reason=reason))


def lock_refresh(db,raw):
    if not raw or len(raw)>128:
        return None
    ref=db.execute(text("SELECT user_id FROM refresh_tokens WHERE token_hash=:hash"),dict(hash=hash_token(raw))).scalar()
    if not ref:
        return None
    user=db.execute(text("SELECT * FROM users WHERE id=:uid FOR UPDATE"),dict(uid=ref)).mappings().first()
    row=db.execute(text("SELECT * FROM refresh_tokens WHERE token_hash=:hash FOR UPDATE"),dict(hash=hash_token(raw))).mappings().first()
    return (dict(user),dict(row)) if user and row else None


def new_refresh(db,user,org,family=None,expiry=None,request=None):
    raw=secrets.token_urlsafe(32)
    family=family or uuid4()
    expiry=expiry or datetime.now(UTC)+timedelta(days=settings.REFRESH_TOKEN_DAYS)
    db.execute(text("""INSERT INTO refresh_tokens(user_id,organization_id,token_hash,family_id,credential_version,expires_at,user_agent,ip)
    VALUES(:uid,:org,:hash,:family,:version,:expiry,:ua,:ip)"""),
        dict(uid=user["id"],org=org,hash=hash_token(raw),family=family,version=user["credential_version"],expiry=expiry,
            ua=request.headers.get("user-agent","")[:500] if request else "",
            ip=request.client.host if request and request.client else ""))
    return raw,family,expiry


def live_roles(db,uid,org):
    return list(db.execute(text("""SELECT DISTINCT r.code FROM user_roles ur JOIN roles r ON r.id=ur.role_id
    LEFT JOIN academic_terms t ON t.id=ur.term_id AND t.organization_id=ur.organization_id
    WHERE ur.user_id=:uid AND ur.revoked_at IS NULL AND ur.valid_from<=now()
    AND (ur.valid_to IS NULL OR ur.valid_to>now()) AND
    ((CAST(:org AS uuid) IS NULL AND ur.organization_id IS NULL AND r.code='PLATFORM_ADMIN') OR
    (ur.organization_id=CAST(:org AS uuid) AND t.is_current AND CURRENT_DATE BETWEEN t.start_date AND t.end_date))
    ORDER BY r.code"""),dict(uid=uid,org=org)).scalars())


def session_context(db,user,org=None):
    uid=user["id"]
    platform=bool(live_roles(db,uid,None))
    organizations=[] if platform else [dict(o) for o in db.execute(text("""SELECT o.id,o.name,o.slug,o.status,ou.student_id
        FROM organizations o JOIN organization_users ou ON ou.organization_id=o.id
        WHERE ou.user_id=:uid AND ou.status='ACTIVE' ORDER BY o.name"""),dict(uid=uid)).mappings()]
    organization=next((o for o in organizations if str(o["id"])==str(org)),None)
    if org and (not organization or organization["status"]!="ACTIVE"):
        fail("Organization access is unavailable",403)
    roles=live_roles(db,uid,None if platform else org) if platform or org else []
    permissions=list(db.execute(text("SELECT permission_code FROM fn_user_permissions(:uid,:org)"),dict(uid=uid,org=org)).scalars()) if platform or org else []
    member=bool(db.execute(text("SELECT fn_is_member(:uid,:org)"),dict(uid=uid,org=org)).scalar()) if org else False
    membership=None
    if member:
        row=db.execute(text("""SELECT m.*,p.name AS plan_name FROM memberships m JOIN membership_plans p ON p.id=m.plan_id
        WHERE m.user_id=:uid AND m.organization_id=:org AND m.status='ACTIVE' AND m.payment_status='PAID' AND m.end_date>=CURRENT_DATE"""),dict(uid=uid,org=org)).mappings().first()
        membership=dict(row) if row else None
    label=next((r for r in ["PLATFORM_ADMIN","ORG_ADMIN","TREASURER","EVENT_MANAGER","GATE_STAFF","VOLUNTEER"] if r in roles),"MEMBER" if member else "GUEST")
    redirect="/platform" if platform else "/scanner" if label=="GATE_STAFF" else "/my-tasks" if label=="VOLUNTEER" else "/dashboard"
    if not platform and not organization:
        redirect="/organizations"
    return dict(user={k:user.get(k) for k in ["id","email","full_name","phone","status","must_change_password"]},
        organization=organization,organizations=organizations,roles=roles,permissions=permissions,membership=membership,
        is_member=member,persona_label=label,redirect_to=redirect)


def send_email_notification(recipient,subject,message,link=None):
    if settings.EMAIL_MODE=="console":
        logger.warning("Local email to %s: %s\n%s\n%s",recipient,subject,message,link or "")
        return
    email=EmailMessage()
    email["From"]=settings.SMTP_FROM
    email["To"]=recipient
    email["Subject"]=subject
    email.set_content(message+"\n"+(link or ""))
    with smtplib.SMTP(settings.SMTP_HOST,settings.SMTP_PORT,timeout=10) as smtp:
        smtp.starttls()
        if settings.SMTP_USERNAME:
            smtp.login(settings.SMTP_USERNAME,settings.SMTP_PASSWORD.get_secret_value())
        smtp.send_message(email)


def issue_auth_token(db,user,purpose):
    raw=secrets.token_urlsafe(32)
    db.execute(text("UPDATE auth_tokens SET used_at=now() WHERE user_id=:uid AND purpose=:purpose AND used_at IS NULL"),dict(uid=user["id"],purpose=purpose))
    db.execute(text("INSERT INTO auth_tokens(user_id,purpose,token_hash,expires_at) VALUES(:uid,:purpose,:hash,:expiry)"),
        dict(uid=user["id"],purpose=purpose,hash=hash_token(raw),expiry=datetime.now(UTC)+timedelta(hours=1 if purpose=="PASSWORD_RESET" else 24)))
    return raw


def lock_auth_token(db,raw,purpose):
    uid=db.execute(text("SELECT user_id FROM auth_tokens WHERE token_hash=:hash AND purpose=:purpose"),dict(hash=hash_token(raw),purpose=purpose)).scalar()
    if not uid:
        fail("Invalid or expired link",400)
    user=db.execute(text("SELECT * FROM users WHERE id=:uid FOR UPDATE"),dict(uid=uid)).mappings().first()
    tok=db.execute(text("SELECT * FROM auth_tokens WHERE token_hash=:hash AND purpose=:purpose FOR UPDATE"),dict(hash=hash_token(raw),purpose=purpose)).mappings().first()
    if not user or not tok or tok["used_at"] or tok["expires_at"]<=datetime.now(UTC):
        fail("Invalid or expired link",400)
    return dict(user),dict(tok)
