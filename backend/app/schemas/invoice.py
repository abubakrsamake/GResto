from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class InvoiceItemResponse(BaseModel):
    product_name: str
    quantity: int
    unit_price: float
    total: float
    notes: Optional[str] = ""

    class Config:
        from_attributes = True


class InvoiceResponse(BaseModel):
    id: str
    order_number: str
    status: str
    total_ht: float
    total_tax: float
    total_ttc: float
    created_at: Optional[str] = None
    pos_id: Optional[str] = None
    items: list[InvoiceItemResponse]

    class Config:
        from_attributes = True