"""Revocable authentication sessions and rotating refresh tokens.

Revision ID: 0002_sessions
Revises: 0001_accounts
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0002_sessions"
down_revision: str | Sequence[str] | None = "0001_accounts"
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
        "auth_sessions",
        *common_columns(),
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("credential_version", sa.Integer(), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoke_reason", sa.String(32), nullable=True),
        sa.CheckConstraint(
            "credential_version >= 1", name=op.f("ck_auth_sessions_positive_credential_version")
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            ondelete="CASCADE",
            name=op.f("fk_auth_sessions_user_id_users"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_auth_sessions")),
    )
    op.create_index("ix_auth_sessions_user_id", "auth_sessions", ["user_id"])
    op.create_table(
        "refresh_tokens",
        *common_columns(),
        sa.Column("session_id", sa.Uuid(), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("parent_id", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(
            ["session_id"],
            ["auth_sessions.id"],
            ondelete="CASCADE",
            name=op.f("fk_refresh_tokens_session_id_auth_sessions"),
        ),
        sa.ForeignKeyConstraint(
            ["parent_id"],
            ["refresh_tokens.id"],
            name=op.f("fk_refresh_tokens_parent_id_refresh_tokens"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_refresh_tokens")),
        sa.UniqueConstraint("token_hash", name=op.f("uq_refresh_tokens_token_hash")),
        sa.UniqueConstraint("parent_id", name=op.f("uq_refresh_tokens_parent_id")),
    )
    op.create_index("ix_refresh_tokens_session_id", "refresh_tokens", ["session_id"])


def downgrade() -> None:
    op.drop_index("ix_refresh_tokens_session_id", table_name="refresh_tokens")
    op.drop_table("refresh_tokens")
    op.drop_index("ix_auth_sessions_user_id", table_name="auth_sessions")
    op.drop_table("auth_sessions")
