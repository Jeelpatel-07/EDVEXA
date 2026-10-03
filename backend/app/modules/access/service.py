from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.security import (
    generate_opaque_token,
    hash_opaque_token,
    hash_password,
    verify_password,
)
from app.modules.access.models import (
    AuditLog,
    Invitation,
    Organization,
    OrganizationRole,
    OrganizationTerm,
    OrganizationUser,
    PlatformAdmin,
    RolePermission,
    SessionOrganization,
)
from app.modules.access.permissions import BASE_PERMISSIONS
from app.modules.accounts.models import User
from app.modules.accounts.schemas import UserRead
from app.modules.accounts.service import utc
from app.modules.sessions.dependencies import AuthContext

STAFF = {"TREASURER", "EVENT_MANAGER", "GATE_STAFF", "VOLUNTEER"}


def fail(code="FORBIDDEN", message="You do not have access to this organization", status=403):
    raise AppError(status, code, message)


def audit(db, actor_id, action, entity_type, entity_id, org_id=None, details=None):
    db.add(
        AuditLog(
            actor_id=actor_id,
            organization_id=org_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details or {},
        )
    )


def platform_admin(db: Session, user_id: UUID) -> bool:
    return db.get(PlatformAdmin, user_id) is not None


def organization_dict(org):
    return {
        k: getattr(org, k)
        for k in ("id", "name", "slug", "status", "join_code", "member_number_prefix", "created_at")
    }


def participation(db, org_id, user_id, lock=False):
    query = select(OrganizationUser).where(
        OrganizationUser.organization_id == org_id, OrganizationUser.user_id == user_id
    )
    return db.scalar(query.with_for_update() if lock else query)


def current_term(db, org_id):
    today = datetime.now(UTC).date()
    return db.scalar(
        select(OrganizationTerm).where(
            OrganizationTerm.organization_id == org_id,
            OrganizationTerm.is_current.is_(True),
            OrganizationTerm.starts_on <= today,
            OrganizationTerm.ends_on >= today,
        )
    )


def live_roles(db, org_id, user_id):
    term = current_term(db, org_id)
    query = select(OrganizationRole).where(
        OrganizationRole.organization_id == org_id,
        OrganizationRole.user_id == user_id,
        OrganizationRole.revoked_at.is_(None),
    )
    rows = db.scalars(query).all()
    return sorted(
        {
            r.role_code
            for r in rows
            if (r.role_code == "ORG_ADMIN" and r.term_id is None)
            or (term is not None and r.term_id == term.id)
        }
    )


def permissions_for(db, roles):
    return sorted(
        set(
            db.scalars(
                select(RolePermission.permission_code).where(RolePermission.role_code.in_(roles))
            ).all()
        )
    )


def authorize(db, user_id, org_id, permission=None):
    org = db.get(Organization, org_id)
    relation = participation(db, org_id, user_id)
    if org is None or relation is None or relation.status != "ACTIVE":
        fail()
    if org.status != "ACTIVE":
        fail("ORG_SUSPENDED", "This organization is suspended")
    permissions = set(BASE_PERMISSIONS) | set(permissions_for(db, live_roles(db, org_id, user_id)))
    if permission and permission not in permissions:
        fail("FORBIDDEN", "You do not have the required permission")
    return org


def session_context(db: Session, context: AuthContext):
    user = context.user
    links = db.execute(
        select(Organization, OrganizationUser)
        .join(OrganizationUser, OrganizationUser.organization_id == Organization.id)
        .where(OrganizationUser.user_id == user.id, OrganizationUser.status == "ACTIVE")
        .order_by(Organization.name)
    ).all()
    choices = [organization_dict(org) for org, _ in links]
    selected = db.get(SessionOrganization, context.session.id)
    org = next((o for o, _ in links if selected and o.id == selected.organization_id), None)
    if org is None and len(links) == 1:
        org = links[0][0]
    roles = []
    if org is not None and org.status == "ACTIVE":
        roles = live_roles(db, org.id, user.id)
    if platform_admin(db, user.id):
        roles.append("PLATFORM_ADMIN")
    permissions = permissions_for(db, roles)
    if org is not None and org.status == "ACTIVE":
        permissions = sorted(set(permissions) | set(BASE_PERMISSIONS))
    relation = participation(db, org.id, user.id) if org else None
    safe = UserRead.model_validate(user).model_dump(mode="json")
    safe.update(name=user.full_name, studentId=relation.student_id if relation else None)
    # Paid memberships are supplied by the later membership module, never by staff roles.
    return dict(
        user=safe,
        organization=organization_dict(org) if org else None,
        organizations=choices,
        roles=roles,
        permissions=permissions,
        membership=None,
        is_member=False,
        persona_label=next(
            (
                r
                for r in (
                    "PLATFORM_ADMIN",
                    "ORG_ADMIN",
                    "TREASURER",
                    "EVENT_MANAGER",
                    "GATE_STAFF",
                    "VOLUNTEER",
                )
                if r in roles
            ),
            "GUEST",
        ),
    )


def join(db, user, code, student_id=None):
    org = db.scalar(
        select(Organization).where(Organization.join_code == code.strip().upper()).with_for_update()
    )
    if org is None or org.status != "ACTIVE":
        fail("INVALID_JOIN_CODE", "This organization join code is invalid or unavailable", 400)
    relation = participation(db, org.id, user.id)
    if relation is not None:
        if relation.status != "ACTIVE":
            fail()
        return org
    if student_id:
        student_id = student_id.strip()
        if not student_id:
            fail("INVALID_STUDENT_ID", "Student ID cannot be blank", 400)
        if db.scalar(
            select(OrganizationUser.id).where(
                OrganizationUser.organization_id == org.id,
                OrganizationUser.student_id == student_id,
            )
        ):
            fail(
                "STUDENT_ID_IN_USE",
                "This student ID is already registered in the organization",
                409,
            )
    db.add(
        OrganizationUser(
            organization_id=org.id,
            user_id=user.id,
            student_id=student_id.strip() if student_id else None,
        )
    )
    db.flush()
    audit(db, user.id, "ORGANIZATION_JOINED", "organization", org.id, org.id)
    return org


def validate_registration(db, data):
    if data.student_id and not data.join_code:
        fail("ORGANIZATION_REQUIRED", "A join code is required with a student ID", 400)
    if not data.join_code:
        return
    org = db.scalar(
        select(Organization)
        .where(Organization.join_code == data.join_code.strip().upper())
        .with_for_update()
    )
    if org is None or org.status != "ACTIVE":
        fail("INVALID_JOIN_CODE", "This organization join code is invalid or unavailable", 400)
    if data.student_id and db.scalar(
        select(OrganizationUser.id).where(
            OrganizationUser.organization_id == org.id,
            OrganizationUser.student_id == data.student_id.strip(),
        )
    ):
        fail("STUDENT_ID_IN_USE", "This student ID is already registered in the organization", 409)


def registration_join(db, user, data):
    if data.join_code:
        join(db, user, data.join_code, data.student_id)
    elif data.student_id:
        fail("ORGANIZATION_REQUIRED", "A join code is required with a student ID", 400)


def require_term(db, org_id):
    term = current_term(db, org_id)
    if term is None:
        fail(
            "TERM_REQUIRED",
            "Create and activate a current academic term before assigning staff",
            409,
        )
    return term


def assign(db, actor_id, org_id, user_id, role_code, term_id=None):
    if role_code not in STAFF | {"ORG_ADMIN"}:
        fail("INVALID_ROLE", "Only explicit staff roles may be assigned", 400)
    if participation(db, org_id, user_id, lock=True) is None:
        fail("USER_NOT_FOUND", "User does not belong to this organization", 404)
    if role_code != "ORG_ADMIN":
        term_id = term_id or require_term(db, org_id).id
        term = db.get(OrganizationTerm, term_id)
        if term is None or term.organization_id != org_id:
            fail()
    query = select(OrganizationRole).where(
        OrganizationRole.organization_id == org_id,
        OrganizationRole.user_id == user_id,
        OrganizationRole.role_code == role_code,
        OrganizationRole.term_id == term_id,
    )
    row = db.scalar(query.with_for_update())
    if row is None:
        row = OrganizationRole(
            organization_id=org_id, user_id=user_id, role_code=role_code, term_id=term_id
        )
        db.add(row)
    else:
        row.revoked_at = None
    db.flush()
    audit(db, actor_id, "ROLE_ASSIGNED", "user", user_id, org_id, {"role": role_code})
    return row


def replace_staff_roles(db, actor_id, org_id, user_id, roles):
    # Serialize all role changes for the tenant before reading the current term.
    db.scalar(select(Organization).where(Organization.id == org_id).with_for_update())
    term = require_term(db, org_id)
    if participation(db, org_id, user_id, lock=True) is None:
        fail("USER_NOT_FOUND", "User does not belong to this organization", 404)
    rows = db.scalars(
        select(OrganizationRole).where(
            OrganizationRole.organization_id == org_id,
            OrganizationRole.user_id == user_id,
            OrganizationRole.term_id == term.id,
            OrganizationRole.revoked_at.is_(None),
        )
    ).all()
    for row in rows:
        if row.role_code in STAFF and row.role_code not in roles:
            row.revoked_at = datetime.now(UTC)
    for code in set(roles):
        assign(db, actor_id, org_id, user_id, code, term.id)
    audit(
        db, actor_id, "STAFF_ROLES_UPDATED", "user", user_id, org_id, {"roles": sorted(set(roles))}
    )


def directory(db, org_id):
    rows = db.execute(
        select(User, OrganizationUser)
        .join(OrganizationUser, OrganizationUser.user_id == User.id)
        .where(OrganizationUser.organization_id == org_id)
        .order_by(User.full_name)
    ).all()
    return [
        dict(
            id=u.id,
            name=u.full_name,
            email=u.email,
            studentId=p.student_id,
            status=p.status,
            roles=live_roles(db, org_id, u.id),
            membership=None,
        )
        for u, p in rows
    ]


def invite(db, actor_id, org_id, email, role_code, settings):
    org = db.scalar(select(Organization).where(Organization.id == org_id).with_for_update())
    if org is None or org.status != "ACTIVE":
        fail("ORG_UNAVAILABLE", "Organization is unavailable", 409)
    term_id = None if role_code == "ORG_ADMIN" else require_term(db, org_id).id
    now = datetime.now(UTC)
    # Reissue revokes earlier links for this recipient and role.
    db.execute(
        update(Invitation)
        .where(
            Invitation.organization_id == org_id,
            Invitation.email == email.casefold(),
            Invitation.role_code == role_code,
            Invitation.consumed_at.is_(None),
        )
        .values(consumed_at=now)
    )
    token = generate_opaque_token()
    row = Invitation(
        organization_id=org_id,
        email=email.casefold(),
        role_code=role_code,
        term_id=term_id,
        token_hash=hash_opaque_token(token),
        expires_at=now + timedelta(days=7),
    )
    db.add(row)
    db.flush()
    audit(db, actor_id, "INVITATION_CREATED", "invitation", row.id, org_id, {"role": role_code})
    return {
        "invite_url": f"{settings.frontend_base_url.rstrip('/')}/accept-invite#token={token}",
        "message": "Invitation link created. Share it with the intended recipient.",
    }


def accept_invite(db, data, actor=None):
    digest = hash_opaque_token(data.token.get_secret_value())
    initial = db.scalar(select(Invitation).where(Invitation.token_hash == digest))
    if initial is None:
        fail("INVALID_TOKEN", "Invitation is invalid or expired", 400)
    org = db.scalar(
        select(Organization).where(Organization.id == initial.organization_id).with_for_update()
    )
    row = db.scalar(select(Invitation).where(Invitation.token_hash == digest).with_for_update())
    now = datetime.now(UTC)
    if row.consumed_at or utc(row.expires_at) <= now or org.status != "ACTIVE":
        fail("INVALID_TOKEN", "Invitation is invalid or expired", 400)
    if row.role_code != "ORG_ADMIN" and (
        not current_term(db, org.id) or current_term(db, org.id).id != row.term_id
    ):
        fail("INVALID_TOKEN", "Invitation academic term is no longer current", 400)
    user = db.scalar(select(User).where(User.email == row.email).with_for_update())
    if user is not None:
        if actor is None or actor.id != user.id:
            fail(
                "INVITE_LOGIN_REQUIRED",
                "Sign in with the invited email before accepting this link",
                401,
            )
        # Existing accounts keep their password and verification state.
        if user.status != "ACTIVE" or user.email_verified_at is None:
            fail()
    else:
        if not data.full_name or not data.password:
            fail(
                "ACCOUNT_DETAILS_REQUIRED",
                "Full name and a 15–128 character password are required",
                400,
            )
        user = User(
            full_name=" ".join(data.full_name.split()),
            email=row.email,
            password_hash=hash_password(data.password.get_secret_value()),
            status="ACTIVE",
            email_verified_at=now,
        )
        db.add(user)
        db.flush()
    relation = participation(db, org.id, user.id)
    if relation is None:
        db.add(OrganizationUser(organization_id=org.id, user_id=user.id))
        db.flush()
    elif relation.status != "ACTIVE":
        fail()
    assign(db, actor.id if actor else user.id, org.id, user.id, row.role_code, row.term_id)
    row.consumed_at = now
    audit(db, user.id, "INVITATION_ACCEPTED", "invitation", row.id, org.id)


def change_password(db, user_id, old_password, new_password):
    from app.modules.accounts.models import PasswordResetToken
    from app.modules.accounts.service import cancel_pending_emails, invalidate_tokens
    from app.modules.sessions.service import revoke_user_sessions

    user = db.scalar(select(User).where(User.id == user_id).with_for_update())
    if not verify_password(old_password, user.password_hash):
        fail("INVALID_PASSWORD", "Current password is incorrect", 400)
    user.password_hash = hash_password(new_password)
    user.credential_version += 1
    now = datetime.now(UTC)
    invalidate_tokens(db, PasswordResetToken, user.id, now)
    cancel_pending_emails(db, user.id, "RESET_PASSWORD", now)
    revoke_user_sessions(db, user.id)
    audit(db, user.id, "PASSWORD_CHANGED", "user", user.id)


def audit_list(db, org_id=None, limit=100, offset=0):
    query = select(AuditLog, User.email).outerjoin(User, User.id == AuditLog.actor_id)
    # Platform audit shows platform actions only; tenant logs require tenant permission.
    query = query.where(AuditLog.organization_id == org_id)
    rows = db.execute(
        query.order_by(AuditLog.created_at.desc(), AuditLog.id).limit(limit).offset(offset)
    ).all()
    return [
        dict(
            id=r.id,
            created_at=r.created_at,
            action=r.action,
            actor_email=email,
            entity_type=r.entity_type,
            entity_id=r.entity_id,
            details=r.details,
        )
        for r, email in rows
    ]
