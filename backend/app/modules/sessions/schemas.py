from typing import Literal

from pydantic import BaseModel, Field, SecretStr

from app.modules.accounts.schemas import EmailRequest, UserRead


class LoginRequest(EmailRequest):
    # Allow legacy shorter passwords at login; registration/reset enforce the new policy.
    password: SecretStr = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    csrf_token: str
    user: UserRead


class CsrfResponse(BaseModel):
    csrf_token: str
