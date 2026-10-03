from typing import Optional
from pydantic import BaseModel, Field

class OrderItemRequest(BaseModel):
    ticket_type_id: Optional[str] = None
    variant_id: Optional[str] = None
    plan_id: Optional[str] = None
    quantity: int = Field(1, gt=0)

class OrderCreateRequest(BaseModel):
    order_type: str # TICKET, MERCH, MEMBERSHIP
    items: list[OrderItemRequest]

class PaymentPayRequest(BaseModel):
    method: str = "ONLINE" # ONLINE, CASH, UPI, CARD
    idempotency_key: Optional[str] = None
    provider_ref: Optional[str] = None

class OrderResponse(BaseModel):
    id: str
    organization_id: str
    order_number: str
    order_type: str
    status: str
    subtotal: float
    discount_total: float
    total: float
    expires_at: str
    created_at: str
    items: list[dict] = []
    payments: list[dict] = []
