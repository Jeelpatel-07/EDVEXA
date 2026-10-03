from typing import Optional
from pydantic import BaseModel, Field

class ExpenseClaimCreate(BaseModel):
    category_id: str
    title: str = Field(..., max_length=255)
    description: Optional[str] = None
    amount: float = Field(..., gt=0.0)

class ExpenseReviewRequest(BaseModel):
    action: Optional[str] = "REJECT" # APPROVE, REJECT
    reject_reason: Optional[str] = None
    reason: Optional[str] = None

class ManualLedgerEntryRequest(BaseModel):
    category_id: str
    direction: str # IN, OUT
    amount: float = Field(..., gt=0.0)
    description: str = Field(..., min_length=2)
    reference_number: Optional[str] = None

class BudgetCategoryCreate(BaseModel):
    name: str = Field(..., max_length=100)
    type: str # INCOME, EXPENSE
    description: Optional[str] = None

class TermBudgetSetRequest(BaseModel):
    category_id: str
    allocated_amount: float = Field(..., ge=0.0)
