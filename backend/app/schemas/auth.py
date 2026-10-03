from typing import Optional, Any
from pydantic import BaseModel, EmailStr, Field, model_validator
from datetime import datetime

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=6)
    confirm_password: Optional[str] = None
    student_id: Optional[str] = None
    join_code: Optional[str] = None

    @model_validator(mode="before")
    @classmethod
    def check_no_role_fields(cls, values: Any) -> Any:
        if isinstance(values, dict):
            if "role" in values or "roles" in values:
                raise ValueError("Role assignment is forbidden during public registration.")
        return values

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class SelectOrgRequest(BaseModel):
    organization_id: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=6)

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=6)

class AcceptInviteRequest(BaseModel):
    token: str
    password: str = Field(..., min_length=6)
    full_name: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict
    organization: Optional[dict] = None
    roles: list[str] = []
    permissions: list[str] = []
    is_member: bool = False
    membership: Optional[dict] = None
    persona_label: str = "GUEST"

class AuthSessionResponse(BaseModel):
    id: str
    user_agent: Optional[str]
    ip: Optional[str]
    last_used_at: datetime
    is_current: bool = False
