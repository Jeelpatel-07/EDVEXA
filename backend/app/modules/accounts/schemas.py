from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr, field_validator


class AccountInput(BaseModel):
    model_config = ConfigDict(extra="forbid")


class EmailRequest(AccountInput):
    email: EmailStr

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.casefold()


class RegisterRequest(EmailRequest):
    full_name: str = Field(min_length=2, max_length=120)
    password: SecretStr = Field(min_length=15, max_length=128)
    join_code: str | None = Field(default=None, min_length=1, max_length=32)
    student_id: str | None = Field(default=None, min_length=1, max_length=80)

    @field_validator("full_name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        value = " ".join(value.split())
        if len(value) < 2:
            raise ValueError("Full name must contain at least two characters")
        return value


class TokenRequest(AccountInput):
    token: SecretStr = Field(min_length=40, max_length=128)


class ResetPasswordRequest(TokenRequest):
    new_password: SecretStr = Field(min_length=15, max_length=128)


class MessageResponse(BaseModel):
    message: str


class UserRead(BaseModel):
    """Safe schema for Part 3; passwords and token data must never be returned."""

    model_config = ConfigDict(from_attributes=True)
    id: UUID
    full_name: str
    email: EmailStr
    status: Literal["PENDING_VERIFICATION", "ACTIVE", "SUSPENDED", "DEACTIVATED"]
    email_verified_at: datetime | None
    created_at: datetime
