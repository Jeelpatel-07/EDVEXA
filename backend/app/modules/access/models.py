from datetime import UTC, date, datetime
from uuid import UUID

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    ForeignKeyConstraint,
    Index,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Organization(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "organizations"
    __table_args__ = (CheckConstraint("status IN ('ACTIVE', 'SUSPENDED')", name="valid_status"),)
    name: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(80), unique=True)
    join_code: Mapped[str] = mapped_column(String(32), unique=True)
    member_number_prefix: Mapped[str] = mapped_column(String(12), default="EDV")
    status: Mapped[str] = mapped_column(String(16), default="ACTIVE")


class PlatformAdmin(Base):
    __tablename__ = "platform_admins"
    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )


class OrganizationUser(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "organization_users"
    __table_args__ = (
        UniqueConstraint("organization_id", "user_id"),
        UniqueConstraint("organization_id", "student_id"),
        CheckConstraint("status IN ('ACTIVE', 'SUSPENDED')", name="valid_status"),
    )
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    student_id: Mapped[str | None] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(16), default="ACTIVE")


class OrganizationTerm(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "organization_terms"
    __table_args__ = (
        UniqueConstraint("organization_id", "id"),
        Index(
            "uq_organization_terms_current",
            "organization_id",
            unique=True,
            postgresql_where=text("is_current = true"),
            sqlite_where=text("is_current = 1"),
        ),
        CheckConstraint("ends_on >= starts_on", name="valid_dates"),
    )
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(120))
    starts_on: Mapped[date] = mapped_column(Date)
    ends_on: Mapped[date] = mapped_column(Date)
    is_current: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")


class Role(Base):
    __tablename__ = "roles"
    code: Mapped[str] = mapped_column(String(32), primary_key=True)


class Permission(Base):
    __tablename__ = "permissions"
    code: Mapped[str] = mapped_column(String(64), primary_key=True)


class RolePermission(Base):
    __tablename__ = "role_permissions"
    role_code: Mapped[str] = mapped_column(ForeignKey("roles.code"), primary_key=True)
    permission_code: Mapped[str] = mapped_column(ForeignKey("permissions.code"), primary_key=True)


class OrganizationRole(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "organization_roles"
    __table_args__ = (
        ForeignKeyConstraint(
            ["organization_id", "user_id"],
            ["organization_users.organization_id", "organization_users.user_id"],
            ondelete="CASCADE",
        ),
        ForeignKeyConstraint(
            ["organization_id", "term_id"],
            ["organization_terms.organization_id", "organization_terms.id"],
            ondelete="CASCADE",
        ),
        UniqueConstraint("organization_id", "user_id", "role_code", "term_id"),
        Index(
            "uq_organization_roles_admin",
            "organization_id",
            "user_id",
            unique=True,
            postgresql_where=text("term_id IS NULL"),
            sqlite_where=text("term_id IS NULL"),
        ),
        CheckConstraint(
            "role_code IN ('ORG_ADMIN', 'TREASURER', 'EVENT_MANAGER', 'GATE_STAFF', 'VOLUNTEER')",
            name="staff_only",
        ),
        CheckConstraint(
            "(role_code = 'ORG_ADMIN' AND term_id IS NULL) OR "
            "(role_code <> 'ORG_ADMIN' AND term_id IS NOT NULL)",
            name="term_scope",
        ),
    )
    organization_id: Mapped[UUID] = mapped_column(index=True)
    user_id: Mapped[UUID] = mapped_column(index=True)
    role_code: Mapped[str] = mapped_column(ForeignKey("roles.code"))
    term_id: Mapped[UUID | None] = mapped_column()
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SessionOrganization(Base):
    __tablename__ = "session_organizations"
    session_id: Mapped[UUID] = mapped_column(
        ForeignKey("auth_sessions.id", ondelete="CASCADE"), primary_key=True
    )
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE")
    )


class Invitation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "organization_invitations"
    __table_args__ = (
        ForeignKeyConstraint(
            ["organization_id", "term_id"],
            ["organization_terms.organization_id", "organization_terms.id"],
            ondelete="CASCADE",
        ),
        CheckConstraint(
            "role_code IN ('ORG_ADMIN', 'TREASURER', 'EVENT_MANAGER', 'GATE_STAFF', 'VOLUNTEER')",
            name="staff_only",
        ),
        CheckConstraint(
            "(role_code = 'ORG_ADMIN' AND term_id IS NULL) OR "
            "(role_code <> 'ORG_ADMIN' AND term_id IS NOT NULL)",
            name="term_scope",
        ),
    )
    organization_id: Mapped[UUID] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    email: Mapped[str] = mapped_column(String(320), index=True)
    role_code: Mapped[str] = mapped_column(ForeignKey("roles.code"))
    term_id: Mapped[UUID | None] = mapped_column()
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class AuditLog(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "audit_logs"
    organization_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"), index=True
    )
    actor_id: Mapped[UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(80))
    entity_type: Mapped[str] = mapped_column(String(40))
    entity_id: Mapped[UUID | None] = mapped_column()
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC)
    )
