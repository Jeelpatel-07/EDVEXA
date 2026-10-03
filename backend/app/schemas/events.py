from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime

class TicketTypeCreate(BaseModel):
    name: str = Field(..., max_length=100)
    member_price: float = Field(..., ge=0.0)
    non_member_price: float = Field(..., ge=0.0)
    quantity_total: int = Field(..., gt=0)
    max_per_order: int = Field(5, gt=0)

class TicketTypeUpdate(BaseModel):
    name: Optional[str] = None
    member_price: Optional[float] = None
    non_member_price: Optional[float] = None
    quantity_total: Optional[int] = None
    max_per_order: Optional[int] = None

class EventCreate(BaseModel):
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: datetime
    end_time: datetime
    visibility: str = "PUBLIC" # PUBLIC, MEMBERS_ONLY
    total_capacity: int = Field(100, gt=0)
    sales_open_at: Optional[datetime] = None
    sales_close_at: Optional[datetime] = None
    budget_amount: float = Field(0.0, ge=0.0)
    fundraiser_id: Optional[str] = None
    term_id: Optional[str] = None
    banner_url: Optional[str] = None
    ticket_types: list[TicketTypeCreate] = []

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    status: Optional[str] = None # DRAFT, PUBLISHED, CLOSED, CANCELLED, COMPLETED
    visibility: Optional[str] = None
    total_capacity: Optional[int] = None
    sales_open_at: Optional[datetime] = None
    sales_close_at: Optional[datetime] = None
    budget_amount: Optional[float] = None
    fundraiser_id: Optional[str] = None
    banner_url: Optional[str] = None

class TicketScanRequest(BaseModel):
    code: str

class TicketScanResponse(BaseModel):
    status: str # VALID, ALREADY_USED, INVALID, CANCELLED, WRONG_ORGANIZATION
    message: str
    ticket_code: Optional[str] = None
    holder_name: Optional[str] = None
    event_title: Optional[str] = None
    ticket_type: Optional[str] = None
    is_member: bool = False
    checked_in_at: Optional[datetime] = None
    ticket_id: Optional[str] = None
