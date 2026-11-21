from datetime import datetime
from decimal import Decimal

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.auth.dependencies import require_cafe_admin, require_customer
from app.models.cafe_menu import CafeMenuItem
from app.models.cafe_order import CafeOrder
from app.routers.orders import create_order, get_customer_order, get_all_orders
from app.schemas.auth import AuthenticatedUser
from app.schemas.order import CreateOrderRequest
from app.services.order_calculation import calculate_order_totals
from app.services.order_number import generate_order_number
from app.services.membership_discount import configure_membership_discounts


class FakeScalars:
    def __init__(self, values):
        self.values = values

    def all(self):
        return self.values


class FakeDb:
    def __init__(self, menu_items=None, orders=None):
        self.menu_items = menu_items or []
        self.orders = orders or []
        self.committed = False

    def scalars(self, statement):
        if self.orders:
            return FakeScalars(self.orders)
        return FakeScalars(self.menu_items)

    def scalar(self, statement):
        if self.menu_items:
            return self.menu_items[0]
        if self.orders:
            return self.orders[0]
        return None

    def add(self, item):
        self.orders.append(item)

    def commit(self):
        self.committed = True

    def refresh(self, item):
        return None

    def rollback(self):
        return None


def member_user(user_id="member-1", membership="GOLD"):
    return AuthenticatedUser(
        id=user_id,
        name="Test Member",
        email=f"{user_id}@example.test",
        phone="0000000000",
        membership=membership,
        role="MEMBER",
        module=None,
    )


def admin_user(role="ADMIN", module=None):
    return AuthenticatedUser(
        id="admin-1",
        name="Test Admin",
        email="admin@example.test",
        phone="0000000000",
        membership="GOLD",
        role=role,
        module=module,
    )


def menu_item(item_id="item-1", name="Tea", price="5.00", available=True):
    now = datetime.now()
    return CafeMenuItem(
        id=item_id,
        name=name,
        description=None,
        category="Drinks",
        price=Decimal(price),
        isAvailable=available,
        createdAt=now,
        updatedAt=now,
    )


def test_successful_order_creation():
    db = FakeDb(menu_items=[menu_item()])
    payload = CreateOrderRequest(
        items=[{"item_id": "item-1", "quantity": 2}],
        table_number=5,
    )

    response = create_order(payload, db, member_user())

    assert response.user_id == "member-1"
    assert response.table_number == 5
    assert response.subtotal == Decimal("10.00")
    assert response.total_amount == Decimal("10.00")
    assert db.committed is True


def test_invalid_customer_authentication():
    with pytest.raises(HTTPException) as exc:
        require_customer(admin_user())

    assert exc.value.status_code == 403


def test_nonexistent_menu_item():
    db = FakeDb(menu_items=[])
    payload = CreateOrderRequest(
        items=[{"item_id": "missing", "quantity": 1}],
    )

    with pytest.raises(HTTPException) as exc:
        create_order(payload, db, member_user())

    assert exc.value.status_code == 404


def test_unavailable_menu_item():
    db = FakeDb(menu_items=[menu_item(available=False)])
    payload = CreateOrderRequest(
        items=[{"item_id": "item-1", "quantity": 1}],
    )

    with pytest.raises(HTTPException) as exc:
        create_order(payload, db, member_user())

    assert exc.value.status_code == 400


def test_invalid_quantity():
    with pytest.raises(ValidationError):
        CreateOrderRequest(
            items=[{"item_id": "item-1", "quantity": 0}],
        )


def test_correct_total_calculation():
    subtotal, discount, total, descriptions = calculate_order_totals(
        [menu_item(price="12.50")],
        CreateOrderRequest(
            items=[{"item_id": "item-1", "quantity": 3}],
        ).items,
        "GOLD",
    )

    assert subtotal == Decimal("37.50")
    assert discount == Decimal("0.00")
    assert total == Decimal("37.50")
    assert descriptions == ["Tea x3 @ 12.50"]


def test_membership_discount_when_configured():
    configure_membership_discounts({"Gold": "10"})
    subtotal, discount, total, _ = calculate_order_totals(
        [menu_item(price="20.00")],
        CreateOrderRequest(
            items=[{"item_id": "item-1", "quantity": 1}],
        ).items,
        "GOLD",
    )

    assert subtotal == Decimal("20.00")
    assert discount == Decimal("2.00")
    assert total == Decimal("18.00")


def test_customer_accessing_another_order():
    order = CafeOrder(
        id="order-1",
        userID="member-2",
        tableNumber=2,
        orderItems=["Tea x1 @ 5.00"],
        orderNumber="CAFE-TEST",
        dateTime=datetime.now(),
        totalAmount=Decimal("5.00"),
    )
    db = FakeDb(orders=[order])

    with pytest.raises(HTTPException) as exc:
        get_customer_order("order-1", db, member_user("member-1"))

    assert exc.value.status_code == 403


def test_admin_viewing_all_orders():
    order = CafeOrder(
        id="order-1",
        userID="member-2",
        tableNumber=2,
        orderItems=["Tea x1 @ 5.00"],
        orderNumber="CAFE-TEST",
        dateTime=datetime.now(),
        totalAmount=Decimal("5.00"),
    )
    db = FakeDb(orders=[order])

    response = get_all_orders(db, admin_user())

    assert len(response) == 1
    assert response[0].order_number == "CAFE-TEST"


def test_other_module_subadmin_is_denied():
    with pytest.raises(HTTPException) as exc:
        require_cafe_admin(admin_user(role="SUBADMIN", module="sports"))

    assert exc.value.status_code == 403


def test_unique_order_numbers():
    numbers = {generate_order_number() for _ in range(20)}

    assert len(numbers) == 20
