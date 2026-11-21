from decimal import Decimal
from collections import defaultdict

from app.services.membership_discount import (
    MembershipDiscountNotConfiguredError,
    calculate_membership_discount,
)


MONEY = Decimal("0.01")


def normalize_membership(membership: str) -> str:
    return membership.strip().title()


def calculate_order_totals(
    menu_items,
    requested_items,
    membership: str,
) -> tuple[Decimal, Decimal, Decimal, list[str]]:
    quantities = defaultdict(int)
    for requested in requested_items:
        quantities[requested.item_id] += requested.quantity

    subtotal = Decimal("0.00")
    item_descriptions = []

    for item in menu_items:
        quantity = quantities.get(item.id, 0)
        if quantity == 0:
            continue
        unit_price = Decimal(str(item.price)).quantize(MONEY)
        line_total = (unit_price * quantity).quantize(MONEY)
        subtotal += line_total
        item_descriptions.append(
            f"{item.name} x{quantity} @ {unit_price}"
        )

    subtotal = subtotal.quantize(MONEY)

    try:
        discount = calculate_membership_discount(
            subtotal,
            normalize_membership(membership),
        )
    except MembershipDiscountNotConfiguredError:
        discount = Decimal("0.00")

    discount = discount.quantize(MONEY)
    total = (subtotal - discount).quantize(MONEY)
    return subtotal, discount, total, item_descriptions
