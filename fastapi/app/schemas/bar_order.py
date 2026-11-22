from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, StrictInt


class BarOrderItemRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    item_id: str = Field(min_length=1)
    quantity: StrictInt = Field(gt=0)


class CreateBarOrderRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[BarOrderItemRequest] = Field(min_length=1)
    table_number: StrictInt | None = Field(default=None, gt=0)


class BarOrderItemResponse(BaseModel):
    menu_item_id: str
    name: str
    quantity: int
    unit_price: Decimal
    line_total: Decimal


class BarOrderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    table_number: int | None
    order_items: list[BarOrderItemResponse]
    order_number: str
    date_time: datetime
    subtotal: Decimal
    discount_amount: Decimal
    total_amount: Decimal


class BarAdminOrderPage(BaseModel):
    orders: list[BarOrderResponse]
    total_count: int
    current_page: int
    page_size: int
    total_pages: int


class BarAdminOrderSummary(BaseModel):
    total_orders: int
    total_sales_amount: Decimal
    average_order_value: Decimal
    orders_in_date_range: int
