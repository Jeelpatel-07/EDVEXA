from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import date

class UserInviteRequest(BaseModel):
    email: EmailStr
    role_code: str # Must be one of TREASURER, EVENT_MANAGER, GATE_STAFF, VOLUNTEER
    full_name: Optional[str] = None

class RoleAssignRequest(BaseModel):
    role_code: str # TREASURER, EVENT_MANAGER, GATE_STAFF, VOLUNTEER

class UserStatusUpdateRequest(BaseModel):
    status: str # ACTIVE, SUSPENDED, LEFT

class AcademicTermCreate(BaseModel):
    name: str = Field(..., max_length=100)
    start_date: date
    end_date: date
    is_current: bool = False

class MembershipBenefitCreate(BaseModel):
    applies_to: str # TICKET, PRODUCT
    discount_type: str # PERCENT, FIXED
    discount_value: float

class MembershipPlanCreate(BaseModel):
    name: str = Field(..., max_length=100)
    description: Optional[str] = None
    price: float = Field(..., ge=0.0)
    duration_days: int = Field(365, gt=0)
    is_active: bool = True
    benefits: list[MembershipBenefitCreate] = []

class MembershipPlanUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    duration_days: Optional[int] = None
    is_active: Optional[bool] = None

class ManualMembershipRequest(BaseModel):
    user_id: str
    plan_id: str
    payment_method: str = "CASH"
    notes: Optional[str] = None
