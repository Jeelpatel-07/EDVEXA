from datetime import datetime
from uuid import UUID

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Global identity; organization participation belongs to Part 4."""

    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED')",
            name="valid_status",
        ),
        CheckConstraint("credential_version >= 1", name="positive_credential_version"),
        CheckConstraint("email = lower(email)", name="normalized_email"),
    )
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(320), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(24), default="PENDING_VERIFICATION")
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    # Part 3 snapshots this on sessions and rejects mismatches after password reset.
    credential_version: Mapped[int] = mapped_column(Integer, default=1, server_default="1")


class AccountTokenMixin(UUIDPrimaryKeyMixin):
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class EmailVerificationToken(AccountTokenMixin, TimestampMixin, Base):
    __tablename__ = "email_verification_tokens"


class PasswordResetToken(AccountTokenMixin, TimestampMixin, Base):
    __tablename__ = "password_reset_tokens"


class AuthEmail(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Transactional outbox. Encrypted secret payload is cleared after delivery."""

    __tablename__ = "auth_emails"
    __table_args__ = (
        CheckConstraint("kind IN ('VERIFY_EMAIL', 'RESET_PASSWORD')", name="valid_kind"),
        CheckConstraint("attempts >= 0", name="nonnegative_attempts"),
        Index("ix_auth_emails_delivery", "sent_at", "cancelled_at", "next_attempt_at"),
    )
    user_id: Mapped[UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    kind: Mapped[str] = mapped_column(String(24))
    encrypted_payload: Mapped[str | None] = mapped_column(Text)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    attempts: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    next_attempt_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    last_error: Mapped[str | None] = mapped_column(String(80))
