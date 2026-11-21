from datetime import date, datetime
from decimal import Decimal

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy.sql import operators

from app.auth.dependencies import (
    get_current_user,
    require_cafe_admin,
    require_customer,
)
from app.database import get_db
from app.main import app
from app.models.cafe_menu import CafeMenuItem
from app.models.cafe_order import CafeOrder
from app.routers.orders import (
    create_order,
    get_all_orders,
    get_customer_order,
    get_order_summary,
)
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


class FakeOrderQueryDb:
    def __init__(self, orders=None):
        self.orders = orders or []

    def _matches(self, statement, order):
        for clause in statement._where_criteria:
            column_name = clause.left.key
            actual = getattr(order, column_name)
            expected = clause.right.value
            operator = clause.operator
            if operator is operators.ilike_op:
                if expected.strip("%").casefold() not in actual.casefold():
                    return False
            elif operator is operators.eq and actual != expected:
                return False
            elif operator is operators.ge and actual < expected:
                return False
            elif operator is operators.lt and actual >= expected:
                return False
        return True

    def _filtered(self, statement):
        return [
            order
            for order in self.orders
            if self._matches(statement, order)
        ]

    def scalar(self, statement):
        expression = statement.selected_columns[0]
        name = expression.name
        matches = self._filtered(statement)
        if name == "count":
            return len(matches)
        if name == "sum":
            return sum(
                (Decimal(str(order.totalAmount)) for order in matches),
                Decimal("0"),
            )
        if name == "avg":
            if not matches:
                return None
            return sum(
                (Decimal(str(order.totalAmount)) for order in matches),
                Decimal("0"),
            ) / len(matches)
        return matches[0] if matches else None

    def scalars(self, statement):
        matches = self._filtered(statement)
        order_by = statement._order_by_clauses
        if order_by:
            descending = order_by[0].modifier is operators.desc_op
            matches.sort(
                key=lambda order: (
                    order.dateTime,
                    order.id,
                ),
                reverse=descending,
            )
        offset = statement._offset_clause
        limit = statement._limit_clause
        if offset is not None:
            matches = matches[offset.value :]
        if limit is not None:
            matches = matches[: limit.value]
        return FakeScalars(matches)


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


def cafe_order(
    order_id,
    customer_id,
    order_number,
    order_date,
    total_amount,
):
    return CafeOrder(
        id=order_id,
        userID=customer_id,
        tableNumber=2,
        orderItems=["Tea x1 @ 5.00"],
        orderNumber=order_number,
        dateTime=order_date,
        totalAmount=Decimal(total_amount),
    )


def sample_orders():
    return [
        cafe_order(
            "order-1",
            "customer-1",
            "CAFE-ALPHA",
            datetime(2026, 11, 20, 10),
            "5.00",
        ),
        cafe_order(
            "order-2",
            "customer-2",
            "CAFE-BETA",
            datetime(2026, 11, 21, 12),
            "15.00",
        ),
        cafe_order(
            "order-3",
            "customer-1",
            "CAFE-GAMMA",
            datetime(2026, 11, 22, 14),
            "10.00",
        ),
    ]


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
    response = get_all_orders(
        FakeOrderQueryDb(sample_orders()),
        admin_user(),
        page_size=100,
    )

    assert response.total_count == 3
    assert response.orders[0].order_number == "CAFE-GAMMA"


def test_admin_order_number_search_and_customer_filter():
    db = FakeOrderQueryDb(sample_orders())

    by_number = get_all_orders(
        db, admin_user(), order_number="beta", page_size=100
    )
    by_customer = get_all_orders(
        db, admin_user(), customer_id="customer-1", page_size=100
    )

    assert [order.order_number for order in by_number.orders] == ["CAFE-BETA"]
    assert {order.user_id for order in by_customer.orders} == {"customer-1"}


def test_admin_order_date_and_date_range_filters():
    db = FakeOrderQueryDb(sample_orders())

    one_day = get_all_orders(
        db,
        admin_user(),
        order_date=date(2026, 11, 21),
        page_size=100,
    )
    date_range = get_all_orders(
        db,
        admin_user(),
        start_date=date(2026, 11, 20),
        end_date=date(2026, 11, 21),
        page_size=100,
    )

    assert [order.order_number for order in one_day.orders] == ["CAFE-BETA"]
    assert {order.order_number for order in date_range.orders} == {
        "CAFE-ALPHA",
        "CAFE-BETA",
    }


def test_admin_order_sorting_and_pagination():
    db = FakeOrderQueryDb(sample_orders())
    newest = get_all_orders(db, admin_user(), sort="newest", page_size=2)
    oldest_page_two = get_all_orders(
        db, admin_user(), sort="oldest", page=2, page_size=2
    )

    assert [order.order_number for order in newest.orders] == [
        "CAFE-GAMMA",
        "CAFE-BETA",
    ]
    assert newest.total_count == 3
    assert newest.current_page == 1
    assert newest.total_pages == 2
    assert [order.order_number for order in oldest_page_two.orders] == [
        "CAFE-GAMMA",
    ]


def test_admin_orders_empty_results_and_date_validation():
    empty = get_all_orders(
        FakeOrderQueryDb(sample_orders()),
        admin_user(),
        customer_id="missing",
    )
    assert empty.orders == []
    assert empty.total_count == 0
    assert empty.total_pages == 0

    with pytest.raises(HTTPException) as exc:
        get_all_orders(
            FakeOrderQueryDb(sample_orders()),
            admin_user(),
            start_date=date(2026, 11, 22),
            end_date=date(2026, 11, 20),
        )
    assert exc.value.status_code == 422


def test_admin_order_summary_uses_persisted_amounts():
    response = get_order_summary(
        start_date=date(2026, 11, 21),
        end_date=date(2026, 11, 22),
        db=FakeOrderQueryDb(sample_orders()),
        _user=admin_user(),
    )

    assert response.total_orders == 3
    assert response.total_sales_amount == Decimal("30.00")
    assert response.average_order_value == Decimal("10.00")
    assert response.orders_in_date_range == 2


def test_admin_order_summary_http_endpoint():
    app.dependency_overrides[get_current_user] = lambda: admin_user()
    app.dependency_overrides[get_db] = lambda: FakeOrderQueryDb(sample_orders())
    try:
        response = TestClient(app).get(
            "/admin/orders/summary?start_date=2026-11-21&end_date=2026-11-22"
        )
        assert response.status_code == 200
        assert response.json()["total_orders"] == 3
        assert response.json()["orders_in_date_range"] == 2
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize(
    "user,expected_status",
    [
        (admin_user(), 200),
        (admin_user(role="SUBADMIN", module="cafe"), 200),
        (admin_user(role="SUBADMIN", module="sports"), 403),
        (member_user(), 403),
    ],
)
def test_admin_order_tracking_role_permissions(user, expected_status):
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: FakeOrderQueryDb(sample_orders())
    try:
        response = TestClient(app).get("/admin/orders")
        assert response.status_code == expected_status
        if expected_status == 200:
            assert set(response.json()) == {
                "orders",
                "total_count",
                "current_page",
                "page_size",
                "total_pages",
            }
    finally:
        app.dependency_overrides.clear()


def test_admin_order_tracking_requires_authentication():
    app.dependency_overrides[get_db] = lambda: FakeOrderQueryDb(sample_orders())
    try:
        response = TestClient(app).get("/admin/orders")
        assert response.status_code == 401
    finally:
        app.dependency_overrides.clear()


def test_admin_order_tracking_validates_pagination():
    app.dependency_overrides[get_current_user] = lambda: admin_user()
    app.dependency_overrides[get_db] = lambda: FakeOrderQueryDb(sample_orders())
    try:
        client = TestClient(app)
        assert client.get("/admin/orders?page=0").status_code == 422
        assert client.get("/admin/orders?page_size=101").status_code == 422
    finally:
        app.dependency_overrides.clear()


@pytest.mark.parametrize(
    "user,expected_status",
    [
        (admin_user(), 200),
        (admin_user(role="SUBADMIN", module="cafe"), 200),
        (admin_user(role="SUBADMIN", module="sports"), 403),
        (member_user(), 403),
    ],
)
def test_admin_can_access_customer_order_history_by_role(
    user, expected_status
):
    app.dependency_overrides[get_current_user] = lambda: user
    app.dependency_overrides[get_db] = lambda: FakeOrderQueryDb(sample_orders())
    try:
        response = TestClient(app).get(
            "/admin/orders/customer/customer-1"
        )
        assert response.status_code == expected_status
        if expected_status == 200:
            assert {order["user_id"] for order in response.json()} == {
                "customer-1"
            }
    finally:
        app.dependency_overrides.clear()


def test_other_module_subadmin_is_denied():
    with pytest.raises(HTTPException) as exc:
        require_cafe_admin(admin_user(role="SUBADMIN", module="sports"))

    assert exc.value.status_code == 403


def test_unique_order_numbers():
    numbers = {generate_order_number() for _ in range(20)}

    assert len(numbers) == 20
