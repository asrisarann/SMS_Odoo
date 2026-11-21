from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, StrictInt


class OrderItemRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    item_id: str = Field(min_length=1)
    quantity: StrictInt = Field(gt=0)


class CreateOrderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[OrderItemRequest] = Field(min_length=1)
    table_number: StrictInt | None = Field(default=None, gt=0)


class CafeOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    table_number: int | None
    order_items: list[str]
    order_number: str
    date_time: datetime
    subtotal: Decimal | None = None
    discount_amount: Decimal | None = None
    total_amount: Decimal


class AdminOrderPage(BaseModel):
    orders: list[CafeOrderResponse]
    total_count: int
    current_page: int
    page_size: int
    total_pages: int


class AdminOrderSummary(BaseModel):
    total_orders: int
    total_sales_amount: Decimal
    average_order_value: Decimal
    orders_in_date_range: int
