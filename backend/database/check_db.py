import psycopg
import sys

db_url = "postgresql://postgres:pgsql%4021@localhost:5432/edvexa_db"

def inspect_db():
    with psycopg.connect(db_url) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
                ORDER BY table_name;
            """)
            tables = [row[0] for row in cur.fetchall()]
            print(f"Total tables in edvexa_db: {len(tables)}")
            if tables:
                print("Tables:", ", ".join(tables[:10]), f"... (+{len(tables)-10} more)" if len(tables) > 10 else "")
            
            if 'platform_settings' in tables:
                cur.execute("SELECT key, value FROM platform_settings;")
                for k, v in cur.fetchall():
                    print(f"Setting: {k} = {v}")

if __name__ == '__main__':
    inspect_db()
