from pathlib import Path
from typing import Annotated, Literal
import json
from pydantic import AliasChoices, Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict, NoDecode

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore", populate_by_name=True)
    DATABASE_URL: SecretStr
    secret: SecretStr = Field(validation_alias=AliasChoices("JWT_SECRET", "JWT_SECRET_KEY"))
    JWT_ISSUER: str = "edvexa"
    ACCESS_TOKEN_MINUTES: int = Field(15, ge=1, le=60)
    REFRESH_TOKEN_DAYS: int = Field(7, ge=1, le=90)
    CORS_ORIGINS: Annotated[list[str], NoDecode] = [
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
        "http://localhost:5175", "http://127.0.0.1:5175"
    ]
    COOKIE_SECURE: bool = Field(False, validation_alias=AliasChoices("COOKIE_SECURE", "REFRESH_COOKIE_SECURE"))
    EMAIL_MODE: Literal["console", "smtp"] = "console"
    APP_BASE_URL: str = Field("http://localhost:5173", validation_alias=AliasChoices("APP_BASE_URL", "FRONTEND_BASE_URL"))
    PAYMENT_MODE: Literal["mock", "disabled"] = "mock"
    ENVIRONMENT: Literal["development", "test", "production"] = "development"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: SecretStr = SecretStr("")
    SMTP_FROM: str = "noreply@edvexa.app"
    JOBS_ENABLED: bool = True
    UPLOAD_DIR: Path = BASE_DIR / "uploads"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def origins(cls, value):
        if isinstance(value,str):
            return json.loads(value) if value.lstrip().startswith("[") else [v.strip() for v in value.split(",") if v.strip()]
        return value

    @model_validator(mode="after")
    def validate_settings(self):
        from sqlalchemy.engine import make_url
        url=make_url(self.DATABASE_URL.get_secret_value())
        if url.drivername != "postgresql+psycopg":
            raise ValueError("DATABASE_URL must use postgresql+psycopg")
        if len(self.secret.get_secret_value().encode())<32 or "replace-with" in self.secret.get_secret_value():
            raise ValueError("Generate JWT_SECRET with secrets.token_urlsafe(48)")
        if self.ENVIRONMENT=="production" and (not self.COOKIE_SECURE or self.EMAIL_MODE=="console" or not self.APP_BASE_URL.startswith("https://")):
            raise ValueError("Production needs HTTPS, secure cookies and SMTP delivery")
        return self

    @property
    def JWT_SECRET(self):
        return self.secret.get_secret_value()

settings=Settings()
settings.UPLOAD_DIR.mkdir(parents=True,exist_ok=True)
(settings.UPLOAD_DIR / "receipts").mkdir(exist_ok=True)
(settings.UPLOAD_DIR / "products").mkdir(exist_ok=True)
