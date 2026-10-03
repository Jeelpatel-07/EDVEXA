import secrets
import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
import jwt
from passlib.context import CryptContext
from sqlalchemy import text
from sqlalchemy.orm import Session
from app.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()

def create_access_token(user_id: str, org_id: Optional[str], roles: list[str]) -> str:
    now = datetime.now(timezone.utc)
    expire = now + timedelta(minutes=settings.ACCESS_TOKEN_MINUTES)
    payload = {
        "sub": str(user_id),
        "org_id": str(org_id) if org_id else None,
        "roles": roles,
        "jti": str(uuid.uuid4()),
        "iss": settings.JWT_ISSUER,
        "iat": int(now.timestamp()),
        "exp": int(expire.timestamp())
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm="HS256")

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET,
            algorithms=["HS256"],
            issuer=settings.JWT_ISSUER
        )
        return payload
    except jwt.PyJWTError:
        return {}

def create_refresh_token(db: Session, user_id: str, org_id: Optional[str], family_id: Optional[str] = None, user_agent: str = None, ip: str = None) -> Tuple[str, str]:
    raw_token = secrets.token_hex(32)
    token_h = hash_token(raw_token)
    fam_id = family_id or str(uuid.uuid4())
    expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_DAYS)
    
    db.execute(
        text("""
            INSERT INTO refresh_tokens (user_id, token_hash, family_id, organization_id, user_agent, ip, expires_at)
            VALUES (:uid, :thash, :fam, :oid, :ua, :ip, :exp)
        """),
        {
            "uid": user_id,
            "thash": token_h,
            "fam": fam_id,
            "oid": org_id,
            "ua": user_agent,
            "ip": ip,
            "exp": expires
        }
    )
    db.commit()
    return raw_token, fam_id

def rotate_refresh_token(db: Session, raw_token: str, user_agent: str = None, ip: str = None) -> Tuple[Optional[str], Optional[dict]]:
    token_h = hash_token(raw_token)
    row = db.execute(
        text("SELECT * FROM refresh_tokens WHERE token_hash = :thash"),
        {"thash": token_h}
    ).mappings().first()

    if not row:
        return None, None

    now = datetime.now(timezone.utc)
    if row["revoked_at"] is not None:
        # Re-use detected! Revoke the entire family!
        db.execute(
            text("UPDATE refresh_tokens SET revoked_at = :now, revoked_reason = 'family_compromised' WHERE family_id = :fam"),
            {"now": now, "fam": row["family_id"]}
        )
        db.commit()
        return None, None

    if row["expires_at"] < now:
        db.execute(
            text("UPDATE refresh_tokens SET revoked_at = :now, revoked_reason = 'expired' WHERE id = :id"),
            {"now": now, "id": row["id"]}
        )
        db.commit()
        return None, None

    # Mark current token revoked as rotated
    db.execute(
        text("UPDATE refresh_tokens SET revoked_at = :now, revoked_reason = 'rotated', last_used_at = :now WHERE id = :id"),
        {"now": now, "id": row["id"]}
    )

    # Issue new refresh token in same family
    new_raw, _ = create_refresh_token(
        db,
        user_id=str(row["user_id"]),
        org_id=str(row["organization_id"]) if row["organization_id"] else None,
        family_id=str(row["family_id"]),
        user_agent=user_agent,
        ip=ip
    )
    return new_raw, row

def check_login_lockout(db: Session, email: str, ip: str) -> Tuple[bool, Optional[str]]:
    now = datetime.now(timezone.utc)
    user = db.execute(
        text("SELECT locked_until, failed_login_count FROM users WHERE email = :email"),
        {"email": email}
    ).mappings().first()

    if user and user["locked_until"] and user["locked_until"] > now:
        rem_mins = int((user["locked_until"] - now).total_seconds() / 60) + 1
        return True, f"Account is locked due to multiple failed login attempts. Please try again in {rem_mins} minutes."

    # Check IP failure rate: > 10 failed attempts in 15 mins
    ip_fails = db.execute(
        text("""
            SELECT COUNT(*) FROM login_attempts 
            WHERE ip = :ip AND successful = false AND created_at >= :since
        """),
        {"ip": ip, "since": now - timedelta(minutes=15)}
    ).scalar()

    if ip_fails and ip_fails >= 10:
        return True, "Too many login attempts from this IP address. Please try again in 15 minutes."

    return False, None

def record_login_attempt(db: Session, email: str, ip: str, user_agent: str, successful: bool, failure_reason: str = None):
    now = datetime.now(timezone.utc)
    db.execute(
        text("""
            INSERT INTO login_attempts (email, ip, user_agent, successful, failure_reason, created_at)
            VALUES (:email, :ip, :ua, :ok, :reason, :now)
        """),
        {"email": email, "ip": ip, "ua": user_agent, "ok": successful, "reason": failure_reason, "now": now}
    )

    if successful:
        db.execute(
            text("UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = :now WHERE email = :email"),
            {"now": now, "email": email}
        )
    else:
        # Check failed attempts in last 15 min for this user
        recent_fails = db.execute(
            text("""
                SELECT COUNT(*) FROM login_attempts 
                WHERE email = :email AND successful = false AND created_at >= :since
            """),
            {"email": email, "since": now - timedelta(minutes=15)}
        ).scalar() or 0

        if recent_fails >= 5:
            locked_until = now + timedelta(minutes=15)
            db.execute(
                text("UPDATE users SET failed_login_count = :cnt, locked_until = :lock WHERE email = :email"),
                {"cnt": recent_fails, "lock": locked_until, "email": email}
            )
        else:
            db.execute(
                text("UPDATE users SET failed_login_count = :cnt WHERE email = :email"),
                {"cnt": recent_fails, "email": email}
            )
    db.commit()

def send_email_notification(recipient: str, subject: str, message: str, link: Optional[str] = None):
    if settings.EMAIL_MODE == "console":
        print(f"\n==================== [EDVEXA EMAIL CONSOLE] ====================")
        print(f"TO: {recipient}")
        print(f"SUBJECT: {subject}")
        print(f"MESSAGE: {message}")
        if link:
            print(f"ACTION LINK: {link}")
        print(f"=================================================================\n")
    else:
        # SMTP fallback could be placed here if configured
        pass
