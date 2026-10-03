from typing import Optional
from pydantic import BaseModel, Field

class VariantCreate(BaseModel):
    sku: str = Field(..., max_length=100)
    size: str = Field("Standard", max_length=50)
    color: str = Field("Standard", max_length=50)
    stock_quantity: int = Field(0, ge=0)
    low_stock_threshold: int = Field(5, ge=0)

class VariantUpdate(BaseModel):
    sku: Optional[str] = None
    size: Optional[str] = None
    color: Optional[str] = None
    stock_quantity: Optional[int] = None
    low_stock_threshold: Optional[int] = None

class ProductCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: Optional[str] = None
    base_price: float = Field(..., ge=0.0)
    member_price: float = Field(..., ge=0.0)
    is_active: bool = True
    image_url: Optional[str] = None
    variants: list[VariantCreate] = []

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    base_price: Optional[float] = None
    member_price: Optional[float] = None
    is_active: Optional[bool] = None
    image_url: Optional[str] = None

class StockAdjustRequest(BaseModel):
    movement_type: str # RESTOCK, SALE, RETURN, ADJUSTMENT
    quantity_change: int
    notes: Optional[str] = None

class FulfillmentUpdateRequest(BaseModel):
    fulfillment_status: str # NONE, READY, PICKED_UP
