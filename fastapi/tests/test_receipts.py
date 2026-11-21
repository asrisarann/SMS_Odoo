from datetime import datetime
from decimal import Decimal

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.main import app
from app.models.cafe_order import CafeOrder
from app.schemas.auth import AuthenticatedUser
from app.services.receipt_generator import generate_receipt_pdf


class FakeMappings:
    def first(self):
        return {"id": "customer-1", "name": "Receipt Customer", "email": "customer@example.test"}


class FakeResult:
    def mappings(self):
        return FakeMappings()


class FakeDb:
    def __init__(self, order):
        self.order = order

    def scalar(self, statement):
        if self.order is None:
            return None
        where = statement._where_criteria
        requested_id = where[0].right.value
        return self.order if self.order.id == requested_id else None

    def execute(self, statement, params):
        return FakeResult()


def make_user(role="MEMBER", user_id="customer-1", module=None):
    return AuthenticatedUser(
        id=user_id,
        name="Receipt Customer",
        email="customer@example.test",
        phone="0000000000",
        membership="GOLD",
        role=role,
        module=module,
    )


def make_order(user_id="customer-1"):
    return CafeOrder(
        id="order-1",
        userID=user_id,
        tableNumber=4,
        orderItems=["Latte x2 @ 4.50"],
        orderNumber="CAFE-20261122-ABC123",
        dateTime=datetime(2026, 11, 22, 10, 30),
        totalAmount=Decimal("9.00"),
    )


def setup_client(order, user):
    app.dependency_overrides[get_db] = lambda: FakeDb(order)
    app.dependency_overrides[get_current_user] = lambda: user
    return TestClient(app)


def teardown_function():
    app.dependency_overrides.clear()


def test_json_receipt_for_customer_contains_stored_order_details():
    client = setup_client(make_order(), make_user())

    response = client.get("/orders/order-1/receipt")

    assert response.status_code == 200
    data = response.json()
    assert data["receipt_id"] == "order-1"
    assert data["order_number"] == "CAFE-20261122-ABC123"
    assert data["customer_id"] == "customer-1"
    assert data["customer_name"] == "Receipt Customer"
    assert data["customer_email"] == "customer@example.test"
    assert data["items"] == ["Latte x2 @ 4.50"]
    assert data["total_amount"] == "9.00"
    assert data["table_number"] == 4
    assert data["generated_at"]


def test_pdf_receipt_is_downloadable_pdf():
    client = setup_client(make_order(), make_user())

    response = client.get("/orders/order-1/receipt/pdf")

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert "attachment; filename=" in response.headers["content-disposition"]
    assert response.content.startswith(b"%PDF-")
    assert len(response.content) > 500


def test_receipt_generator_handles_unavailable_table_number():
    from app.schemas.receipt import ReceiptResponse

    receipt = ReceiptResponse(
        receipt_id="order-1",
        order_id="order-1",
        order_number="CAFE-1",
        customer_id="customer-1",
        customer_name="Customer",
        customer_email="customer@example.test",
        order_datetime=datetime(2026, 11, 22, 10, 30),
        table_number=None,
        items=[],
        total_amount=Decimal("9.00"),
        generated_at=datetime.now(),
    )

    assert generate_receipt_pdf(receipt).startswith(b"%PDF-")


def test_customer_cannot_read_another_customers_receipt():
    client = setup_client(make_order(user_id="customer-2"), make_user())

    response = client.get("/orders/order-1/receipt")

    assert response.status_code == 403


@pytest.mark.parametrize("role,module", [("ADMIN", None), ("SUBADMIN", "cafe")])
def test_admin_and_cafe_subadmin_can_read_receipt(role, module):
    client = setup_client(make_order(), make_user(role=role, module=module))

    assert client.get("/orders/order-1/receipt").status_code == 200


def test_other_module_subadmin_is_denied():
    client = setup_client(
        make_order(),
        make_user(role="SUBADMIN", module="sports"),
    )

    assert client.get("/orders/order-1/receipt").status_code == 403


@pytest.mark.parametrize("order_id", ["not-a-uuid", "missing-order"])
def test_invalid_or_nonexistent_order_returns_404(order_id):
    client = setup_client(make_order(), make_user())

    assert client.get(f"/orders/{order_id}/receipt").status_code == 404


def test_missing_order_returns_404():
    client = setup_client(None, make_user())

    assert client.get("/orders/order-1/receipt").status_code == 404
