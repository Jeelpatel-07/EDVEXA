from sqlalchemy import inspect, text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import get_settings
from app.db.model_registry import Base, load_models
from app.db.session import build_engine


def main() -> int:
    """Check database connectivity without changing database contents."""
    settings = get_settings()
    load_models()

    engine = build_engine(settings)

    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

            existing_tables = inspect(
                connection
            ).get_table_names()

        print("Database connection: OK")
        print(
            "Registered application tables:",
            len(Base.metadata.tables),
        )
        print(
            "Existing database tables:",
            len(existing_tables),
        )

        return 0

    except SQLAlchemyError:
        # Do not print raw exceptions that could expose credentials.
        print(
            "Database connection failed. "
            "Check DATABASE_URL and PostgreSQL availability."
        )
        return 1

    finally:
        engine.dispose()


if __name__ == "__main__":
    raise SystemExit(main())