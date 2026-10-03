"""Explicit model registry shared by application startup and Alembic."""

from app.db.base import Base

__all__ = ["Base", "load_models"]


def load_models() -> None:
    """Import account/session models; Part 4 adds organization models here."""
    from app.modules.access import models as access_models  # noqa: F401
    from app.modules.accounts import models as account_models  # noqa: F401
    from app.modules.sessions import models as session_models  # noqa: F401
