from collections import defaultdict
from decimal import Decimal

from app.schemas.bar_order import BarOrderItemRequest, BarOrderItemResponse
from app.services.membership_discount import (
    MembershipDiscountNotConfiguredError,
    calculate_membership_discount,
)


MONEY = Decimal("0.01")


def calculate_bar_order_totals(
    menu_items,
    requested_items: list[BarOrderItemRequest],
    membership: str,
) -> tuple[Decimal, Decimal, Decimal, list[BarOrderItemResponse]]:
    quantities: dict[str, int] = defaultdict(int)
    for requested in requested_items:
        quantities[requested.item_id] += requested.quantity

    line_items: list[BarOrderItemResponse] = []
    subtotal = Decimal("0.00")
    for menu_item in menu_items:
        quantity = quantities.get(menu_item.id, 0)
        if quantity == 0:
            continue
        unit_price = Decimal(str(menu_item.price)).quantize(MONEY)
        line_total = (unit_price * quantity).quantize(MONEY)
        subtotal += line_total
        line_items.append(
            BarOrderItemResponse(
                menu_item_id=menu_item.id,
                name=menu_item.name,
                quantity=quantity,
                unit_price=unit_price,
                line_total=line_total,
            )
        )

    subtotal = subtotal.quantize(MONEY)
    normalized_membership = membership.strip().title()
    try:
        discount = calculate_membership_discount(
            subtotal,
            normalized_membership,
        )
    except MembershipDiscountNotConfiguredError:
        discount = Decimal("0.00")

    discount = discount.quantize(MONEY)
    total = (subtotal - discount).quantize(MONEY)
    return subtotal, discount, total, line_items
