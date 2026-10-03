import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

class Settings:
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+psycopg://postgres:pgsql%4021@localhost:5432/edvexa_db"
    )
    JWT_SECRET: str = os.getenv("JWT_SECRET", "super_secret_edvexa_jwt_key_2026_secure_random_change_in_prod")
    JWT_ISSUER: str = os.getenv("JWT_ISSUER", "edvexa")
    ACCESS_TOKEN_MINUTES: int = int(os.getenv("ACCESS_TOKEN_MINUTES", "15"))
    REFRESH_TOKEN_DAYS: int = int(os.getenv("REFRESH_TOKEN_DAYS", "7"))
    CORS_ORIGINS: list[str] = [
        origin.strip() for origin in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if origin.strip()
    ]
    COOKIE_SECURE: bool = os.getenv("COOKIE_SECURE", "false").lower() in ("true", "1", "yes")
    EMAIL_MODE: str = os.getenv("EMAIL_MODE", "console")
    APP_BASE_URL: str = os.getenv("APP_BASE_URL", "http://localhost:5173")
    PAYMENT_MODE: str = os.getenv("PAYMENT_MODE", "mock")
    UPLOAD_DIR: Path = BASE_DIR / "uploads"

settings = Settings()
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
(settings.UPLOAD_DIR / "receipts").mkdir(parents=True, exist_ok=True)
(settings.UPLOAD_DIR / "products").mkdir(parents=True, exist_ok=True)
