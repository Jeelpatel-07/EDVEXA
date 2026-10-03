"""Global accounts, verification/reset tokens and encrypted email outbox.

Revision ID: 0001_accounts
Revises: None
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_accounts"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def common_columns():
    return [
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    ]


def upgrade() -> None:
    op.create_table(
        "users",
        *common_columns(),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("credential_version", sa.Integer(), server_default="1", nullable=False),
        sa.CheckConstraint(
            "status IN ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED')",
            name=op.f("ck_users_valid_status"),
        ),
        sa.CheckConstraint(
            "credential_version >= 1", name=op.f("ck_users_positive_credential_version")
        ),
        sa.CheckConstraint("email = lower(email)", name=op.f("ck_users_normalized_email")),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_users")),
        sa.UniqueConstraint("email", name=op.f("uq_users_email")),
    )
    for table in ("email_verification_tokens", "password_reset_tokens"):
        op.create_table(
            table,
            *common_columns(),
            sa.Column("user_id", sa.Uuid(), nullable=False),
            sa.Column("token_hash", sa.String(64), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(
                ["user_id"],
                ["users.id"],
                ondelete="CASCADE",
                name=op.f(f"fk_{table}_user_id_users"),
            ),
            sa.PrimaryKeyConstraint("id", name=op.f(f"pk_{table}")),
            sa.UniqueConstraint("token_hash", name=op.f(f"uq_{table}_token_hash")),
        )
        op.create_index(f"ix_{table}_user_id", table, ["user_id"])
    op.create_table(
        "auth_emails",
        *common_columns(),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("kind", sa.String(24), nullable=False),
        sa.Column("encrypted_payload", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("next_attempt_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_error", sa.String(80), nullable=True),
        sa.CheckConstraint(
            "kind IN ('VERIFY_EMAIL', 'RESET_PASSWORD')", name=op.f("ck_auth_emails_valid_kind")
        ),
        sa.CheckConstraint("attempts >= 0", name=op.f("ck_auth_emails_nonnegative_attempts")),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
            name=op.f("fk_auth_emails_user_id_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_auth_emails")),
    )
    op.create_index(
        "ix_auth_emails_delivery", "auth_emails", ["sent_at", "cancelled_at", "next_attempt_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_auth_emails_delivery", table_name="auth_emails")
    op.drop_table("auth_emails")
    for table in ("password_reset_tokens", "email_verification_tokens"):
        op.drop_index(f"ix_{table}_user_id", table_name=table)
        op.drop_table(table)
    op.drop_table("users")
