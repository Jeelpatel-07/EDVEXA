from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.config import settings

engine=create_engine(settings.DATABASE_URL.get_secret_value(),pool_pre_ping=True,hide_parameters=True,connect_args={"connect_timeout":5})
SessionLocal=sessionmaker(bind=engine,autoflush=False,expire_on_commit=False)

def get_db():
    with SessionLocal() as db:
        try:
            yield db
        except Exception:
            db.rollback()
            raise
