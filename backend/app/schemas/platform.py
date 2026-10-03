from typing import Optional, Any
from pydantic import BaseModel, EmailStr, Field

class OrganizationCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=255)
    slug: str = Field(..., min_length=2, max_length=100)
    join_code: str = Field(..., min_length=2, max_length=50)
    member_number_prefix: str = Field("EDV", max_length=20)
    currency: str = Field("INR", max_length=10)
    timezone: str = Field("Asia/Kolkata", max_length=50)
    settings: Optional[dict] = Field(default_factory=dict)
    admin_email: Optional[EmailStr] = None
    admin_name: Optional[str] = None

class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    join_code: Optional[str] = None
    member_number_prefix: Optional[str] = None
    currency: Optional[str] = None
    timezone: Optional[str] = None
    settings: Optional[dict] = None

class OrgSuspendRequest(BaseModel):
    reason: Optional[str] = "Administrative suspension"

class OrgAdminInvite(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None

class PlatformSettingsUpdate(BaseModel):
    settings: dict
