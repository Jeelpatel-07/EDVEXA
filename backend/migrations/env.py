from logging.config import fileConfig

from alembic import context

from app.core.config import get_settings
from app.db.base import Base
from app.db.model_registry import load_models
from app.db.session import build_engine

config = context.config

if config.config_file_name:
    fileConfig(
        config.config_file_name,
        disable_existing_loggers=False,
    )

load_models()

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Generate migration SQL without connecting to PostgreSQL."""
    settings = get_settings()

    context.configure(
        url=settings.database_url.get_secret_value(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={
            "paramstyle": "named",
        },
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations using a live PostgreSQL connection."""
    settings = get_settings()
    engine = build_engine(settings)

    try:
        with engine.connect() as connection:
            context.configure(
                connection=connection,
                target_metadata=target_metadata,
                compare_type=True,
            )

            with context.begin_transaction():
                context.run_migrations()
    finally:
        engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()