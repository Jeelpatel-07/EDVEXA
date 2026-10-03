import psycopg
import sys

db_url = "postgresql://postgres:pgsql%4021@localhost:5432/edvexa_db"

def run_migration():
    print("Connecting to edvexa_db...")
    with psycopg.connect(db_url, autocommit=True) as conn:
        with conn.cursor() as cur:
            print("Clearing public schema to ensure clean slate for complete initialization...")
            cur.execute("DROP SCHEMA public CASCADE; CREATE SCHEMA public;")
            cur.execute("GRANT ALL ON SCHEMA public TO postgres; GRANT ALL ON SCHEMA public TO public;")
    
    print("Reading edvexa_complete.sql...")
    with open('edvexa_complete.sql', 'r', encoding='utf-8') as f:
        sql = f.read()

    print("Executing edvexa_complete.sql...")
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
            conn.commit()
    print("edvexa_complete.sql executed successfully!")

    # Verify
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
            t_count = cur.fetchone()[0]
            cur.execute("SELECT count(*) FROM users;")
            u_count = cur.fetchone()[0]
            cur.execute("SELECT count(*) FROM organizations;")
            o_count = cur.fetchone()[0]
            cur.execute("SELECT count(*) FROM events;")
            e_count = cur.fetchone()[0]
            print(f"Verification Results:")
            print(f"  - Total Tables: {t_count}")
            print(f"  - Total Users Seeded: {u_count}")
            print(f"  - Total Organizations Seeded: {o_count}")
            print(f"  - Total Events Seeded: {e_count}")

if __name__ == '__main__':
    try:
        run_migration()
    except Exception as e:
        print("ERROR:", type(e), e)
        sys.exit(1)
