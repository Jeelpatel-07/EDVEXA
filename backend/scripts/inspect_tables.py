from sqlalchemy import create_engine, text
from app.config import settings

engine = create_engine(settings.DATABASE_URL.get_secret_value())
with engine.connect() as conn:
    row = conn.execute(text("SELECT type, channel, status, metadata FROM notifications LIMIT 1")).mappings().first()
    print("Sample notification:", dict(row) if row else "None")
