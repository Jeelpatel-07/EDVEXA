from collections.abc import Generator

from fastapi import Request
from sqlalchemy import Engine, create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import Settings


def build_engine(settings: Settings) -> Engine:
    """Create an engine. The first database operation opens a connection."""
    return create_engine(
        settings.database_url.get_secret_value(),
        pool_pre_ping=True,
        pool_size=settings.db_pool_size,
        max_overflow=settings.db_max_overflow,
        connect_args={
            "connect_timeout": settings.db_connect_timeout_seconds,
        },
    )


def build_session_factory(
    engine: Engine,
) -> sessionmaker[Session]:
    """Create a factory that produces independent database sessions."""
    return sessionmaker(
        bind=engine,
        class_=Session,
        autoflush=False,
        expire_on_commit=False,
    )


def get_db(
    request: Request,
) -> Generator[Session, None, None]:
    """Provide one session per request without committing automatically."""
    session_factory = request.app.state.session_factory

    with session_factory() as session:
        try:
            yield session
        except Exception:
            session.rollback()
            raise

        # Closing the session rolls back any uncommitted transaction.