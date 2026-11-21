from decimal import Decimal
from typing import Mapping


SUPPORTED_MEMBERSHIPS = frozenset({"Gold", "Silver", "Junior"})


class UnsupportedMembershipError(ValueError):
    pass


class MembershipDiscountNotConfiguredError(ValueError):
    pass


# Populate this mapping only after the team provides final discount percentages.
# Example: {"Gold": Decimal("10"), "Silver": Decimal("7"), "Junior": Decimal("5")}
MEMBERSHIP_DISCOUNT_PERCENTAGES: dict[str, Decimal] = {}


def configure_membership_discounts(
    discount_percentages: Mapping[str, Decimal | str | int | float],
) -> None:
    unknown_memberships = set(discount_percentages) - SUPPORTED_MEMBERSHIPS
    if unknown_memberships:
        unknown = ", ".join(sorted(unknown_memberships))
        raise UnsupportedMembershipError(
            f"Unsupported membership type(s): {unknown}"
        )

    for membership, percentage in discount_percentages.items():
        configured_percentage = Decimal(str(percentage))
        if configured_percentage < 0:
            raise ValueError("Discount percentages cannot be negative")
        MEMBERSHIP_DISCOUNT_PERCENTAGES[membership] = configured_percentage


def calculate_membership_discount(
    subtotal: Decimal | str | int | float,
    membership: str,
    discount_percentages: Mapping[str, Decimal | str | int | float] | None = None,
) -> Decimal:
    if membership not in SUPPORTED_MEMBERSHIPS:
        raise UnsupportedMembershipError(
            f"Unsupported membership type: {membership}"
        )

    configured = (
        discount_percentages
        if discount_percentages is not None
        else MEMBERSHIP_DISCOUNT_PERCENTAGES
    )

    if membership not in configured:
        raise MembershipDiscountNotConfiguredError(
            f"Discount percentage is not configured for {membership}"
        )

    percentage = Decimal(str(configured[membership]))
    if percentage < 0:
        raise ValueError("Discount percentages cannot be negative")

    subtotal_decimal = Decimal(str(subtotal))
    if subtotal_decimal < 0:
        raise ValueError("Subtotal cannot be negative")

    return (subtotal_decimal * percentage / Decimal("100")).quantize(
        Decimal("0.01")
    )
