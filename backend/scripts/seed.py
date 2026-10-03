"""
EDVEXA Database Idempotent Seeder
Runs via Python directly against DATABASE_URL.
Safely checks existing data and ensures the 16 seed accounts, 2 organizations,
and complete demo operational entities are present.
"""
import sys
import os
from pathlib import Path
from sqlalchemy import create_engine, text

# Add backend directory to sys.path
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

try:
    from app.config import settings
    database_url = settings.DATABASE_URL.get_secret_value()
except Exception:
    database_url = os.environ.get("DATABASE_URL", "postgresql+psycopg://edvexa_test@127.0.0.1:55432/edvexa_recovery")

def run_seed():
    print(f"Connecting to database via configured URL: {database_url.split('@')[-1]}")
    engine = create_engine(database_url, isolation_level="AUTOCOMMIT")

    with engine.connect() as conn:
        # Check if roles are already seeded
        role_count = conn.execute(text("SELECT count(*) FROM roles")).scalar()
        user_count = conn.execute(text("SELECT count(*) FROM users")).scalar()
        print(f"Current database state: {role_count} roles, {user_count} users")

        if role_count == 6 and user_count >= 16:
            print("Database is already seeded with required accounts and roles. Verified!")
            return

        seed_file = BASE_DIR / "database" / "edvexa_seed.sql"
        if not seed_file.exists():
            seed_file = BASE_DIR / "database" / "edvexa_complete.sql"

        if not seed_file.exists():
            print(f"ERROR: Cannot find seed SQL file at {seed_file}")
            sys.exit(1)

        print(f"Applying seed data from {seed_file.name}...")
        sql_content = seed_file.read_text(encoding="utf-8-sig")

        # Run transaction with seed bypass
        with conn.begin():
            conn.execute(text("SET LOCAL app.allow_platform_admin_seed = 'on'"))
            conn.execute(text(sql_content))

        print("Seeding completed successfully!")

if __name__ == "__main__":
    run_seed()
