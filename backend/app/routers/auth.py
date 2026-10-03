import secrets
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db import get_db
from app.config import settings
from app.deps import get_current_user
from app.schemas.auth import (
    RegisterRequest, LoginRequest, SelectOrgRequest, ForgotPasswordRequest,
    ResetPasswordRequest, ChangePasswordRequest, AcceptInviteRequest,
    TokenResponse, AuthSessionResponse
)
from app.services.auth_service import (
    hash_password, verify_password, hash_token, create_access_token,
    create_refresh_token, rotate_refresh_token, check_login_lockout,
    record_login_attempt, send_email_notification
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(req: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    # Check email duplicate
    existing = db.execute(
        text("SELECT id FROM users WHERE email = :email"),
        {"email": req.email.strip().lower()}
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # Hash password
    pw_hash = hash_password(req.password)
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    # Resolve join code if provided
    org_id = None
    if req.join_code:
        org_row = db.execute(
            text("SELECT id, status FROM organizations WHERE join_code = :jcode"),
            {"jcode": req.join_code.strip()}
        ).mappings().first()
        if not org_row:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid organization join code.")
        if org_row["status"] != "ACTIVE":
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Organization is currently inactive.")
        org_id = str(org_row["id"])

    # Create user as PENDING_EMAIL_VERIFICATION
    db.execute(
        text("""
            INSERT INTO users (id, email, password_hash, full_name, status, created_via, last_org_id, created_at)
            VALUES (:id, :email, :pw, :name, 'PENDING_EMAIL_VERIFICATION', 'SELF_SIGNUP', :last_org, :now)
        """),
        {
            "id": user_id,
            "email": req.email.strip().lower(),
            "pw": pw_hash,
            "name": req.name.strip(),
            "last_org": org_id,
            "now": now
        }
    )

    # Attach to organization if join_code provided
    if org_id:
        # Check student ID uniqueness per org if provided
        if req.student_id:
            stu_exists = db.execute(
                text("SELECT id FROM organization_users WHERE organization_id = :oid AND student_id = :sid"),
                {"oid": org_id, "sid": req.student_id.strip()}
            ).first()
            if stu_exists:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This Student ID is already registered in this organization.")

        db.execute(
            text("""
                INSERT INTO organization_users (organization_id, user_id, status, student_id, joined_via, created_at)
                VALUES (:oid, :uid, 'ACTIVE', :sid, 'JOIN_CODE', :now)
            """),
            {
                "oid": org_id,
                "uid": user_id,
                "sid": req.student_id.strip() if req.student_id else None,
                "now": now
            }
        )

    # Create email verification token
    raw_token = secrets.token_urlsafe(32)
    t_hash = hash_token(raw_token)
    expires = now + timedelta(hours=24)

    db.execute(
        text("""
            INSERT INTO auth_tokens (user_id, purpose, token_hash, expires_at, created_at)
            VALUES (:uid, 'EMAIL_VERIFY', :thash, :exp, :now)
        """),
        {"uid": user_id, "thash": t_hash, "exp": expires, "now": now}
    )
    db.commit()

    # Send verification link
    verify_link = f"{settings.APP_BASE_URL}/verify-email?token={raw_token}"
    send_email_notification(
        recipient=req.email,
        subject="Verify your EDVEXA Account",
        message="Welcome to EDVEXA! Please click the verification link below to verify your student email address.",
        link=verify_link
    )

    return {
        "message": "Account created successfully. Verification link has been dispatched to your email.",
        "email": req.email
    }

@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    t_hash = hash_token(token.strip())
    now = datetime.now(timezone.utc)

    tok = db.execute(
        text("""
            SELECT * FROM auth_tokens 
            WHERE token_hash = :thash AND purpose = 'EMAIL_VERIFY' AND used_at IS NULL
        """),
        {"thash": t_hash}
    ).mappings().first()

    if not tok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or already used verification token.")

    if tok["expires_at"] < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification link has expired. Please request a new one.")

    # Mark token used
    db.execute(
        text("UPDATE auth_tokens SET used_at = :now WHERE id = :id"),
        {"now": now, "id": tok["id"]}
    )

    # Activate user
    db.execute(
        text("UPDATE users SET status = 'ACTIVE', email_verified_at = :now WHERE id = :uid"),
        {"now": now, "uid": tok["user_id"]}
    )
    db.commit()

    return {"message": "Email address verified successfully. You may now log in to EDVEXA."}

@router.post("/resend-verification")
def resend_verification(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.execute(
        text("SELECT * FROM users WHERE email = :email"),
        {"email": req.email.strip().lower()}
    ).mappings().first()

    if user and user["status"] == "PENDING_EMAIL_VERIFICATION":
        now = datetime.now(timezone.utc)
        raw_token = secrets.token_urlsafe(32)
        t_hash = hash_token(raw_token)
        expires = now + timedelta(hours=24)

        db.execute(
            text("""
                INSERT INTO auth_tokens (user_id, purpose, token_hash, expires_at, created_at)
                VALUES (:uid, 'EMAIL_VERIFY', :thash, :exp, :now)
            """),
            {"uid": user["id"], "thash": t_hash, "exp": expires, "now": now}
        )
        db.commit()

        verify_link = f"{settings.APP_BASE_URL}/verify-email?token={raw_token}"
        send_email_notification(
            recipient=user["email"],
            subject="Verify your EDVEXA Account",
            message="Please verify your email address to access your EDVEXA account.",
            link=verify_link
        )

    return {"message": "If an unverified account exists for that email, a new verification link has been sent."}

@router.post("/login")
def login(req: LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "Unknown")

    # 1. Lockout check
    is_locked, lock_msg = check_login_lockout(db, req.email.strip().lower(), client_ip)
    if is_locked:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=lock_msg)

    # 2. Check user exists
    user = db.execute(
        text("SELECT * FROM users WHERE email = :email"),
        {"email": req.email.strip().lower()}
    ).mappings().first()

    if not user:
        record_login_attempt(db, req.email.strip().lower(), client_ip, user_agent, False, "user_not_found")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    # 3. Check password
    if not verify_password(req.password, user["password_hash"]):
        record_login_attempt(db, req.email.strip().lower(), client_ip, user_agent, False, "invalid_password")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    # 4. Check user status & verification
    if user["status"] == "PENDING_EMAIL_VERIFICATION":
        record_login_attempt(db, req.email.strip().lower(), client_ip, user_agent, False, "unverified_email")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Please verify your email address before signing in.")

    if user["status"] != "ACTIVE":
        record_login_attempt(db, req.email.strip().lower(), client_ip, user_agent, False, f"status_{user['status']}")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=f"Your account is {user['status'].lower().replace('_', ' ')}.")

    # Successful credentials check
    record_login_attempt(db, req.email.strip().lower(), client_ip, user_agent, True)

    # 5. Check Platform Admin Role
    is_platform_admin = db.execute(
        text("""
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = :uid AND ur.organization_id IS NULL AND ur.revoked_at IS NULL AND r.code = 'PLATFORM_ADMIN'
        """),
        {"uid": user["id"]}
    ).scalar()

    if is_platform_admin:
        # Platform Admin: no organization
        access_tok = create_access_token(user_id=str(user["id"]), org_id=None, roles=["PLATFORM_ADMIN"])
        refresh_tok, _ = create_refresh_token(db, user_id=str(user["id"]), org_id=None, user_agent=user_agent, ip=client_ip)

        response.set_cookie(
            key="edvexa_refresh_token",
            value=refresh_tok,
            httponly=True,
            secure=settings.COOKIE_SECURE,
            samesite="lax",
            max_age=settings.REFRESH_TOKEN_DAYS * 86400
        )

        perms = db.execute(text("SELECT permission_code FROM fn_user_permissions(:uid, NULL)"), {"uid": user["id"]}).scalars().all()

        return {
            "access_token": access_tok,
            "token_type": "bearer",
            "user": {
                "id": str(user["id"]),
                "email": user["email"],
                "full_name": user["full_name"],
                "status": user["status"]
            },
            "organization": None,
            "roles": ["PLATFORM_ADMIN"],
            "permissions": list(perms),
            "is_member": False,
            "membership": None,
            "persona_label": "PLATFORM_ADMIN"
        }

    # 6. Fetch Organizations user belongs to
    orgs = db.execute(
        text("""
            SELECT o.id, o.name, o.slug, o.status, ou.status as membership_status, ou.student_id
            FROM organization_users ou
            JOIN organizations o ON o.id = ou.organization_id
            WHERE ou.user_id = :uid AND ou.status = 'ACTIVE' AND o.status = 'ACTIVE'
        """),
        {"uid": user["id"]}
    ).mappings().all()

    if len(orgs) == 0:
        # User has no active organizations
        access_tok = create_access_token(user_id=str(user["id"]), org_id=None, roles=[])
        refresh_tok, _ = create_refresh_token(db, user_id=str(user["id"]), org_id=None, user_agent=user_agent, ip=client_ip)
        return {
            "access_token": access_tok,
            "token_type": "bearer",
            "user": {
                "id": str(user["id"]),
                "email": user["email"],
                "full_name": user["full_name"],
                "status": user["status"]
            },
            "organization": None,
            "roles": [],
            "permissions": [],
            "is_member": False,
            "membership": None,
            "persona_label": "GUEST"
        }

    if len(orgs) > 1:
        # Prompt selection
        return {
            "requires_org_selection": True,
            "organizations": [
                {"id": str(o["id"]), "name": o["name"], "slug": o["slug"]} for o in orgs
            ]
        }

    # Exactly 1 active organization: auto-select
    selected_org = orgs[0]
    org_id = str(selected_org["id"])

    # Load current academic term for org
    term_row = db.execute(
        text("SELECT id FROM academic_terms WHERE organization_id = :oid AND is_current = true"),
        {"oid": org_id}
    ).mappings().first()
    term_id = str(term_row["id"]) if term_row else None

    # Load roles
    roles = db.execute(
        text("""
            SELECT DISTINCT r.code
            FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = :uid AND ur.organization_id = :oid AND ur.revoked_at IS NULL
              AND (ur.term_id IS NULL OR CAST(:tid AS UUID) IS NULL OR ur.term_id = CAST(:tid AS UUID))
        """),
        {"uid": user["id"], "oid": org_id, "tid": term_id}
    ).scalars().all()

    # Load permissions
    perms = db.execute(
        text("SELECT permission_code FROM fn_user_permissions(:uid, :oid)"),
        {"uid": user["id"], "oid": org_id}
    ).scalars().all()

    # Derived is_member
    is_member = db.execute(
        text("SELECT fn_is_member(:uid, :oid)"),
        {"uid": user["id"], "oid": org_id}
    ).scalar() or False

    membership_row = db.execute(
        text("""
            SELECT m.*, mp.name as plan_name 
            FROM memberships m
            JOIN membership_plans mp ON mp.id = m.plan_id
            WHERE m.user_id = :uid AND m.organization_id = :oid AND m.status = 'ACTIVE'
            ORDER BY m.end_date DESC LIMIT 1
        """),
        {"uid": user["id"], "oid": org_id}
    ).mappings().first()

    persona_label = "MEMBER" if is_member else ("STAFF" if len(roles) > 0 else "GUEST")

    access_tok = create_access_token(user_id=str(user["id"]), org_id=org_id, roles=list(roles))
    refresh_tok, _ = create_refresh_token(db, user_id=str(user["id"]), org_id=org_id, user_agent=user_agent, ip=client_ip)

    response.set_cookie(
        key="edvexa_refresh_token",
        value=refresh_tok,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_DAYS * 86400
    )

    return {
        "access_token": access_tok,
        "token_type": "bearer",
        "user": {
            "id": str(user["id"]),
            "email": user["email"],
            "full_name": user["full_name"],
            "status": user["status"]
        },
        "organization": {
            "id": org_id,
            "name": selected_org["name"],
            "slug": selected_org["slug"]
        },
        "roles": list(roles),
        "permissions": list(perms),
        "is_member": bool(is_member),
        "membership": dict(membership_row) if membership_row else None,
        "persona_label": persona_label
    }

@router.post("/select-org")
def select_org(req: SelectOrgRequest, request: Request, response: Response, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "Unknown")

    # Verify user belongs to org
    org = db.execute(
        text("""
            SELECT o.id, o.name, o.slug, o.status
            FROM organization_users ou
            JOIN organizations o ON o.id = ou.organization_id
            WHERE ou.user_id = :uid AND o.id = :oid AND ou.status = 'ACTIVE' AND o.status = 'ACTIVE'
        """),
        {"uid": current_user["id"], "oid": req.organization_id}
    ).mappings().first()

    if not org:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this organization.")

    org_id = str(org["id"])

    # Load current academic term for org
    term_row = db.execute(
        text("SELECT id FROM academic_terms WHERE organization_id = :oid AND is_current = true"),
        {"oid": org_id}
    ).mappings().first()
    term_id = str(term_row["id"]) if term_row else None

    # Load roles
    roles = db.execute(
        text("""
            SELECT DISTINCT r.code
            FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = :uid AND ur.organization_id = :oid AND ur.revoked_at IS NULL
              AND (ur.term_id IS NULL OR CAST(:tid AS UUID) IS NULL OR ur.term_id = CAST(:tid AS UUID))
        """),
        {"uid": current_user["id"], "oid": org_id, "tid": term_id}
    ).scalars().all()

    # Load permissions
    perms = db.execute(
        text("SELECT permission_code FROM fn_user_permissions(:uid, :oid)"),
        {"uid": current_user["id"], "oid": org_id}
    ).scalars().all()

    # Derived is_member
    is_member = db.execute(
        text("SELECT fn_is_member(:uid, :oid)"),
        {"uid": current_user["id"], "oid": org_id}
    ).scalar() or False

    membership_row = db.execute(
        text("""
            SELECT m.*, mp.name as plan_name 
            FROM memberships m
            JOIN membership_plans mp ON mp.id = m.plan_id
            WHERE m.user_id = :uid AND m.organization_id = :oid AND m.status = 'ACTIVE'
            ORDER BY m.end_date DESC LIMIT 1
        """),
        {"uid": current_user["id"], "oid": org_id}
    ).mappings().first()

    persona_label = "MEMBER" if is_member else ("STAFF" if len(roles) > 0 else "GUEST")

    access_tok = create_access_token(user_id=str(current_user["id"]), org_id=org_id, roles=list(roles))
    refresh_tok, _ = create_refresh_token(db, user_id=str(current_user["id"]), org_id=org_id, user_agent=user_agent, ip=client_ip)

    response.set_cookie(
        key="edvexa_refresh_token",
        value=refresh_tok,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_DAYS * 86400
    )

    return {
        "access_token": access_tok,
        "token_type": "bearer",
        "user": {
            "id": str(current_user["id"]),
            "email": current_user["email"],
            "full_name": current_user["full_name"],
            "status": current_user["status"]
        },
        "organization": {
            "id": org_id,
            "name": org["name"],
            "slug": org["slug"]
        },
        "roles": list(roles),
        "permissions": list(perms),
        "is_member": bool(is_member),
        "membership": dict(membership_row) if membership_row else None,
        "persona_label": persona_label
    }

@router.post("/refresh")
def refresh(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_token = request.cookies.get("edvexa_refresh_token")
    if not raw_token:
        # Check authorization header or body if needed
        auth_hdr = request.headers.get("x-refresh-token")
        if auth_hdr:
            raw_token = auth_hdr

    if not raw_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token required.")

    client_ip = request.client.host if request.client else "127.0.0.1"
    user_agent = request.headers.get("user-agent", "Unknown")

    new_raw_token, old_token_row = rotate_refresh_token(db, raw_token, user_agent=user_agent, ip=client_ip)

    if not new_raw_token or not old_token_row:
        response.delete_cookie("edvexa_refresh_token")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired. Please sign in again.")

    user_id = str(old_token_row["user_id"])
    org_id = str(old_token_row["organization_id"]) if old_token_row["organization_id"] else None

    # Load user
    user = db.execute(text("SELECT * FROM users WHERE id = :id"), {"id": user_id}).mappings().first()
    if not user or user["status"] != "ACTIVE":
        response.delete_cookie("edvexa_refresh_token")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Account is no longer active.")

    # Load roles
    term_id = None
    if org_id:
        term_row = db.execute(
            text("SELECT id FROM academic_terms WHERE organization_id = :oid AND is_current = true"),
            {"oid": org_id}
        ).mappings().first()
        term_id = str(term_row["id"]) if term_row else None

    roles = db.execute(
        text("""
            SELECT DISTINCT r.code
            FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = :uid 
              AND ((:oid IS NULL AND ur.organization_id IS NULL) OR (ur.organization_id = :oid))
              AND ur.revoked_at IS NULL
              AND (ur.term_id IS NULL OR CAST(:tid AS UUID) IS NULL OR ur.term_id = CAST(:tid AS UUID))
        """),
        {"uid": user_id, "oid": org_id, "tid": term_id}
    ).scalars().all()

    access_tok = create_access_token(user_id=user_id, org_id=org_id, roles=list(roles))

    response.set_cookie(
        key="edvexa_refresh_token",
        value=new_raw_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_DAYS * 86400
    )

    return {
        "access_token": access_tok,
        "token_type": "bearer"
    }

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user_id = str(current_user["id"])
    payload = current_user.get("token_payload", {})
    org_id = payload.get("org_id")

    # Check if Platform Admin
    is_platform = db.execute(
        text("""
            SELECT 1 FROM user_roles ur
            JOIN roles r ON r.id = ur.role_id
            WHERE ur.user_id = :uid AND ur.organization_id IS NULL AND ur.revoked_at IS NULL AND r.code = 'PLATFORM_ADMIN'
        """),
        {"uid": user_id}
    ).scalar()

    if is_platform and not org_id:
        perms = db.execute(text("SELECT permission_code FROM fn_user_permissions(:uid, NULL)"), {"uid": user_id}).scalars().all()
        return {
            "user": {
                "id": user_id,
                "email": current_user["email"],
                "full_name": current_user["full_name"],
                "status": current_user["status"]
            },
            "organization": None,
            "roles": ["PLATFORM_ADMIN"],
            "permissions": list(perms),
            "is_member": False,
            "membership": None,
            "persona_label": "PLATFORM_ADMIN"
        }

    organization = None
    roles = []
    permissions = []
    is_member = False
    membership = None
    persona_label = "GUEST"

    if org_id:
        org_row = db.execute(text("SELECT id, name, slug, status FROM organizations WHERE id = :oid"), {"oid": org_id}).mappings().first()
        if org_row:
            organization = {"id": str(org_row["id"]), "name": org_row["name"], "slug": org_row["slug"]}

            term_row = db.execute(
                text("SELECT id FROM academic_terms WHERE organization_id = :oid AND is_current = true"),
                {"oid": org_id}
            ).mappings().first()
            term_id = str(term_row["id"]) if term_row else None

            # Roles live from DB
            roles_rows = db.execute(
                text("""
                    SELECT DISTINCT r.code
                    FROM user_roles ur
                    JOIN roles r ON r.id = ur.role_id
                    WHERE ur.user_id = :uid AND ur.organization_id = :oid AND ur.revoked_at IS NULL
                      AND (ur.term_id IS NULL OR CAST(:tid AS UUID) IS NULL OR ur.term_id = CAST(:tid AS UUID))
                """),
                {"uid": user_id, "oid": org_id, "tid": term_id}
            ).scalars().all()
            roles = list(roles_rows)

            # Permissions live from DB
            perms_rows = db.execute(
                text("SELECT permission_code FROM fn_user_permissions(:uid, :oid)"),
                {"uid": user_id, "oid": org_id}
            ).scalars().all()
            permissions = list(perms_rows)

            # Derived member check
            is_member = bool(db.execute(
                text("SELECT fn_is_member(:uid, :oid)"),
                {"uid": user_id, "oid": org_id}
            ).scalar() or False)

            m_row = db.execute(
                text("""
                    SELECT m.*, mp.name as plan_name 
                    FROM memberships m
                    JOIN membership_plans mp ON mp.id = m.plan_id
                    WHERE m.user_id = :uid AND m.organization_id = :oid AND m.status = 'ACTIVE'
                    ORDER BY m.end_date DESC LIMIT 1
                """),
                {"uid": user_id, "oid": org_id}
            ).mappings().first()
            membership = dict(m_row) if m_row else None
            persona_label = "MEMBER" if is_member else ("STAFF" if len(roles) > 0 else "GUEST")

    return {
        "user": {
            "id": user_id,
            "email": current_user["email"],
            "full_name": current_user["full_name"],
            "status": current_user["status"]
        },
        "organization": organization,
        "roles": roles,
        "permissions": permissions,
        "is_member": is_member,
        "membership": membership,
        "persona_label": persona_label
    }

@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    raw_token = request.cookies.get("edvexa_refresh_token")
    if raw_token:
        t_hash = hash_token(raw_token)
        now = datetime.now(timezone.utc)
        db.execute(
            text("UPDATE refresh_tokens SET revoked_at = :now, revoked_reason = 'user_logout' WHERE token_hash = :thash"),
            {"now": now, "thash": t_hash}
        )
        db.commit()

    response.delete_cookie("edvexa_refresh_token")
    return {"message": "Logged out successfully."}

@router.post("/logout-all")
def logout_all(response: Response, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    db.execute(
        text("UPDATE refresh_tokens SET revoked_at = :now, revoked_reason = 'logout_all' WHERE user_id = :uid"),
        {"now": now, "uid": current_user["id"]}
    )
    db.commit()

    response.delete_cookie("edvexa_refresh_token")
    return {"message": "All sessions terminated."}

@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.execute(
        text("SELECT * FROM users WHERE email = :email"),
        {"email": req.email.strip().lower()}
    ).mappings().first()

    if user and user["status"] == "ACTIVE":
        now = datetime.now(timezone.utc)
        raw_token = secrets.token_urlsafe(32)
        t_hash = hash_token(raw_token)
        expires = now + timedelta(hours=1)

        db.execute(
            text("""
                INSERT INTO auth_tokens (user_id, purpose, token_hash, expires_at, created_at)
                VALUES (:uid, 'PASSWORD_RESET', :thash, :exp, :now)
            """),
            {"uid": user["id"], "thash": t_hash, "exp": expires, "now": now}
        )
        db.commit()

        reset_link = f"{settings.APP_BASE_URL}/reset-password?token={raw_token}"
        send_email_notification(
            recipient=user["email"],
            subject="EDVEXA Password Reset",
            message="You requested a password reset. This single-use link is valid for 1 hour.",
            link=reset_link
        )

    return {"message": "If that email address exists in our system, password reset instructions have been sent."}

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    t_hash = hash_token(req.token.strip())
    now = datetime.now(timezone.utc)

    tok = db.execute(
        text("""
            SELECT * FROM auth_tokens 
            WHERE token_hash = :thash AND purpose = 'PASSWORD_RESET' AND used_at IS NULL
        """),
        {"thash": t_hash}
    ).mappings().first()

    if not tok:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset token.")

    if tok["expires_at"] < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password reset token has expired.")

    # Update password and revoke all sessions
    new_hash = hash_password(req.new_password)
    db.execute(
        text("UPDATE users SET password_hash = :pw, must_change_password = false WHERE id = :uid"),
        {"pw": new_hash, "uid": tok["user_id"]}
    )
    db.execute(
        text("UPDATE auth_tokens SET used_at = :now WHERE id = :id"),
        {"now": now, "id": tok["id"]}
    )
    db.execute(
        text("UPDATE refresh_tokens SET revoked_at = :now, revoked_reason = 'password_reset' WHERE user_id = :uid"),
        {"now": now, "uid": tok["user_id"]}
    )
    db.commit()

    return {"message": "Password updated successfully. Please log in with your new credentials."}

@router.post("/change-password")
def change_password(req: ChangePasswordRequest, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(req.old_password, current_user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Incorrect existing password.")

    new_hash = hash_password(req.new_password)
    now = datetime.now(timezone.utc)

    db.execute(
        text("UPDATE users SET password_hash = :pw, must_change_password = false WHERE id = :uid"),
        {"pw": new_hash, "uid": current_user["id"]}
    )
    db.execute(
        text("UPDATE refresh_tokens SET revoked_at = :now, revoked_reason = 'password_changed' WHERE user_id = :uid"),
        {"now": now, "uid": current_user["id"]}
    )
    db.commit()

    return {"message": "Password changed successfully. Active sessions revoked."}

@router.get("/sessions", response_model=list[AuthSessionResponse])
def get_sessions(request: Request, current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    current_token = request.cookies.get("edvexa_refresh_token")
    current_hash = hash_token(current_token) if current_token else None

    rows = db.execute(
        text("""
            SELECT id, user_agent, ip, last_used_at, token_hash
            FROM refresh_tokens
            WHERE user_id = :uid AND revoked_at IS NULL AND expires_at > now()
            ORDER BY last_used_at DESC
        """),
        {"uid": current_user["id"]}
    ).mappings().all()

    sessions = []
    for r in rows:
        sessions.append({
            "id": str(r["id"]),
            "user_agent": r["user_agent"],
            "ip": r["ip"],
            "last_used_at": r["last_used_at"],
            "is_current": (r["token_hash"] == current_hash)
        })

    return sessions

@router.post("/accept-invite")
def accept_invite(req: AcceptInviteRequest, db: Session = Depends(get_db)):
    t_hash = hash_token(req.token.strip())
    now = datetime.now(timezone.utc)

    inv = db.execute(
        text("SELECT * FROM invitations WHERE token_hash = :thash AND accepted_at IS NULL AND revoked_at IS NULL"),
        {"thash": t_hash}
    ).mappings().first()

    if not inv:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid invitation token.")

    if inv["expires_at"] < now:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invitation has expired.")

    # Check if user already exists
    user = db.execute(
        text("SELECT * FROM users WHERE email = :email"),
        {"email": inv["email"]}
    ).mappings().first()

    pw_hash = hash_password(req.password)

    if not user:
        user_id = str(uuid.uuid4())
        full_name = req.full_name or inv["email"].split("@")[0].title()
        db.execute(
            text("""
                INSERT INTO users (id, email, password_hash, full_name, status, email_verified_at, created_via, created_at)
                VALUES (:id, :email, :pw, :name, 'ACTIVE', :now, 'INVITE', :now)
            """),
            {
                "id": user_id,
                "email": inv["email"],
                "pw": pw_hash,
                "name": full_name,
                "now": now
            }
        )
    else:
        user_id = str(user["id"])
        db.execute(
            text("UPDATE users SET password_hash = :pw, status = 'ACTIVE', email_verified_at = :now WHERE id = :id"),
            {"pw": pw_hash, "now": now, "id": user_id}
        )

    # Attach to organization
    org_id = inv["organization_id"]
    if org_id:
        db.execute(
            text("""
                INSERT INTO organization_users (organization_id, user_id, status, joined_via, created_at)
                VALUES (:oid, :uid, 'ACTIVE', 'INVITE', :now)
                ON CONFLICT (organization_id, user_id) DO UPDATE SET status = 'ACTIVE'
            """),
            {"oid": org_id, "uid": user_id, "now": now}
        )

        # Assign role
        db.execute(
            text("""
                INSERT INTO user_roles (user_id, role_id, organization_id, assigned_by, valid_from, created_at)
                VALUES (:uid, :rid, :oid, :aby, :now, :now)
            """),
            {
                "uid": user_id,
                "rid": inv["role_id"],
                "oid": org_id,
                "aby": inv["invited_by"],
                "now": now
            }
        )

    # Mark invitation accepted
    db.execute(
        text("UPDATE invitations SET accepted_at = :now WHERE id = :id"),
        {"now": now, "id": inv["id"]}
    )
    db.commit()

    return {"message": "Invitation accepted successfully. You may now sign in."}
