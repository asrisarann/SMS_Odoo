from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.schemas.bar_order import BarOrderItemResponse


class BarReceiptResponse(BaseModel):
    receipt_id: str
    order_id: str
    order_number: str
    customer_id: str
    customer_name: str
    customer_email: str
    order_datetime: datetime
    table_number: int | None
    items: list[BarOrderItemResponse]
    subtotal: Decimal
    discount_amount: Decimal
    total_amount: Decimal
    generated_at: datetime
