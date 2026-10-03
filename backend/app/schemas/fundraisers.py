from typing import Optional
from pydantic import BaseModel, Field
from datetime import date

class FundraiserCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    goal_amount: float = Field(..., ge=0.0)
    budget_amount: float = Field(0.0, ge=0.0)
    lead_user_id: Optional[str] = None

class FundraiserUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    goal_amount: Optional[float] = None
    budget_amount: Optional[float] = None
    status: Optional[str] = None # PLANNING, ACTIVE, COMPLETED, CANCELLED
    lead_user_id: Optional[str] = None

class TaskCreate(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    priority: str = "MEDIUM" # LOW, MEDIUM, HIGH, URGENT
    due_date: Optional[date] = None
    fundraiser_id: Optional[str] = None
    event_id: Optional[str] = None
    assigned_user_ids: list[str] = []

class TaskStatusUpdate(BaseModel):
    status: str # TODO, IN_PROGRESS, DONE, BLOCKED

class TaskCommentCreate(BaseModel):
    comment: str = Field(..., min_length=1)
