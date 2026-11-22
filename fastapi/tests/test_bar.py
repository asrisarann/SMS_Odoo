from datetime import datetime, timedelta, timezone
from decimal import Decimal

import jwt
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import Column, String, Table, create_engine, event, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.auth.dependencies import get_current_user
from app.database import Base, get_db
from app.main import app
from app.models.bar_menu import BarMenuItem
from app.models.bar_order import BarOrder, BarOrderItem
from app.schemas.auth import AuthenticatedUser
from app.services.membership_discount import MEMBERSHIP_DISCOUNT_PERCENTAGES
from app.services.bar_order_number import generate_bar_order_number


USER_TABLE = Table(
    "User",
    Base.metadata,
    Column("id", String, primary_key=True),
    Column("name", String, nullable=False),
    Column("phone", String, nullable=False),
    Column("email", String, nullable=False),
    Column("membership", String, nullable=False),
    Column("renewalDate", String, nullable=True),
    Column("password", String, nullable=True),
)

TEST_SECRET = "bar-tests-only-secret-not-for-real-authentication"


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    event.listen(
        engine,
        "connect",
        lambda connection, _: connection.execute("PRAGMA foreign_keys=ON"),
    )
    tables = [
        USER_TABLE,
        BarMenuItem.__table__,
        BarOrder.__table__,
        BarOrderItem.__table__,
    ]
    Base.metadata.create_all(engine, tables=tables)
    with Session(engine) as session:
        yield session
    engine.dispose()


@pytest.fixture(autouse=True)
def isolate_discount_configuration():
    original = MEMBERSHIP_DISCOUNT_PERCENTAGES.copy()
    MEMBERSHIP_DISCOUNT_PERCENTAGES.clear()
    yield
    MEMBERSHIP_DISCOUNT_PERCENTAGES.clear()
    MEMBERSHIP_DISCOUNT_PERCENTAGES.update(original)


@pytest.fixture(autouse=True)
def clear_dependency_overrides():
    yield
    app.dependency_overrides.clear()


def make_user(
    role: str = "MEMBER",
    user_id: str = "member-1",
    module: str | None = None,
    membership: str = "GOLD",
) -> AuthenticatedUser:
    return AuthenticatedUser(
        id=user_id,
        name="Test User",
        email=f"{user_id}@example.test",
        phone="0000000000",
        membership=membership,
        role=role,
        module=module,
    )


def add_customer(db: Session, user_id: str = "member-1") -> None:
    db.execute(
        USER_TABLE.insert().values(
            id=user_id,
            name="Test Customer",
            phone="0000000000",
            email=f"{user_id}@example.test",
            membership="GOLD",
            password="must-not-be-returned",
        )
    )
    db.commit()


def add_menu_item(
    db: Session,
    item_id: str = "bar-item-1",
    name: str = "Draft Ale",
    price: str = "8.50",
    available: bool = True,
) -> BarMenuItem:
    now = datetime(2026, 11, 22, 10)
    item = BarMenuItem(
        id=item_id,
        name=name,
        description="Test description",
        category="Beer",
        price=Decimal(price),
        isAvailable=available,
        createdAt=now,
        updatedAt=now,
    )
    db.add(item)
    db.commit()
    return item


def add_order(
    db: Session,
    order_id: str,
    order_number: str,
    customer_id: str = "member-1",
    ordered_at: datetime = datetime(2026, 11, 22, 10),
    total: str = "8.50",
) -> BarOrder:
    item = db.scalar(
        select(BarMenuItem).where(BarMenuItem.id == "bar-item-1")
    )
    order = BarOrder(
        id=order_id,
        userID=customer_id,
        tableNumber=3,
        orderNumber=order_number,
        dateTime=ordered_at,
        subtotal=Decimal(total),
        discountAmount=Decimal("0.00"),
        totalAmount=Decimal(total),
        items=[
            BarOrderItem(
                id=f"{order_id}-line",
                menuItemID=item.id,
                position=0,
                name=item.name,
                quantity=1,
                unitPrice=Decimal(total),
                lineTotal=Decimal(total),
            )
        ],
    )
    db.add(order)
    db.commit()
    return order


def make_client(db: Session, user: AuthenticatedUser | None = None) -> TestClient:
    app.dependency_overrides[get_db] = lambda: db
    if user is not None:
        app.dependency_overrides[get_current_user] = lambda: user
    return TestClient(app)


def test_bar_menu_lifecycle_and_soft_delete(db):
    client = make_client(db, make_user(role="ADMIN"))
    create = client.post(
        "/bar/admin/menu",
        json={
            "name": "  Draft Ale ",
            "description": "On tap",
            "category": "Beer",
            "price": "8.50",
        },
    )
    assert create.status_code == 201
    item_id = create.json()["id"]
    assert create.json()["name"] == "Draft Ale"
    assert client.get("/bar/menu").json()[0]["id"] == item_id
    assert client.get(f"/bar/menu/{item_id}").status_code == 200

    updated = client.put(
        f"/bar/admin/menu/{item_id}",
        json={"price": "9.25", "is_available": False},
    )
    assert updated.status_code == 200
    assert updated.json()["price"] == "9.25"
    assert updated.json()["is_available"] is False
    assert client.get("/bar/menu").json() == []
    assert client.get(f"/bar/menu/{item_id}").status_code == 404

    deleted = client.delete(f"/bar/admin/menu/{item_id}")
    assert deleted.status_code == 200
    assert deleted.json()["is_available"] is False
    assert db.get(BarMenuItem, item_id) is not None
    assert client.get("/bar/admin/menu").json()[0]["is_available"] is False


def test_bar_menu_validation_and_admin_module_isolation(db):
    admin = make_client(db, make_user(role="SUBADMIN", module="cafe"))
    response = admin.post(
        "/bar/admin/menu",
        json={"name": "Wine", "category": "Wine", "price": "12.00"},
    )
    assert response.status_code == 403

    bar_admin = make_client(db, make_user(role="SUBADMIN", module="bar"))
    response = bar_admin.post(
        "/bar/admin/menu",
        json={"name": "  ", "category": "Wine", "price": "12.00"},
    )
    assert response.status_code == 422
    response = bar_admin.post(
        "/bar/admin/menu",
        json={"name": "Wine", "category": "Wine", "price": "0"},
    )
    assert response.status_code == 422


def test_bar_customer_lookup_omits_password_and_checks_ownership(db):
    add_customer(db)
    client = make_client(db, make_user())

    response = client.get("/bar/customers/member-1")
    assert response.status_code == 200
    assert response.json()["membership"] == "GOLD"
    assert "password" not in response.json()

    assert client.get("/bar/customers/another-customer").status_code == 403
    assert client.get("/bar/customers/missing").status_code == 403


def test_bar_customer_lookup_missing_customer_and_bar_admin_access(db):
    admin = make_client(db, make_user(role="SUBADMIN", module="bar"))
    assert admin.get("/bar/customers/missing").status_code == 404

    add_customer(db)
    assert admin.get("/bar/customers/member-1").status_code == 200


def test_bar_order_uses_authoritative_price_and_decimal_membership_discount(
    db, monkeypatch
):
    add_menu_item(db, price="12.50")
    add_customer(db)
    monkeypatch.setitem(MEMBERSHIP_DISCOUNT_PERCENTAGES, "Gold", Decimal("10"))
    client = make_client(db, make_user())

    response = client.post(
        "/bar/orders",
        json={
            "items": [
                {"item_id": "bar-item-1", "quantity": 2},
                {"item_id": "bar-item-1", "quantity": 1},
            ],
            "table_number": 5,
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["user_id"] == "member-1"
    assert body["table_number"] == 5
    assert body["order_number"].startswith("BAR-")
    assert body["subtotal"] == "37.50"
    assert body["discount_amount"] == "3.75"
    assert body["total_amount"] == "33.75"
    assert body["order_items"][0]["unit_price"] == "12.50"
    assert body["order_items"][0]["quantity"] == 3
    assert db.query(BarOrder).count() == 1


def test_bar_order_rejects_missing_unavailable_and_client_price(db):
    add_customer(db)
    client = make_client(db, make_user())
    assert client.post(
        "/bar/orders",
        json={"items": [{"item_id": "missing", "quantity": 1}]},
    ).status_code == 404

    add_menu_item(db, available=False)
    assert client.post(
        "/bar/orders",
        json={"items": [{"item_id": "bar-item-1", "quantity": 1}]},
    ).status_code == 400
    assert client.post(
        "/bar/orders",
        json={
            "items": [{"item_id": "bar-item-1", "quantity": 1, "price": "0.01"}]
        },
    ).status_code == 422
    assert client.post(
        "/bar/orders",
        json={"items": [{"item_id": "bar-item-1", "quantity": 0}]},
    ).status_code == 422


def test_bar_order_number_collision_retries(db, monkeypatch):
    add_customer(db)
    add_menu_item(db)
    add_order(db, "old-order", "BAR-20261122-DUP001")
    numbers = iter(["BAR-20261122-DUP001", "BAR-20261122-UNIQ01"])
    monkeypatch.setattr(
        "app.routers.bar.orders.generate_bar_order_number",
        lambda: next(numbers),
    )

    response = make_client(db, make_user()).post(
        "/bar/orders",
        json={"items": [{"item_id": "bar-item-1", "quantity": 1}]},
    )
    assert response.status_code == 201
    assert response.json()["order_number"] == "BAR-20261122-UNIQ01"
    assert db.query(BarOrder).count() == 2
    assert len({generate_bar_order_number() for _ in range(10)}) == 10


def test_bar_customer_order_ownership_and_history(db):
    add_customer(db)
    add_menu_item(db)
    add_order(db, "owned", "BAR-OWNED")
    client = make_client(db, make_user())
    assert client.get("/bar/orders/owned").status_code == 200
    assert len(client.get("/bar/customers/me/orders").json()) == 1

    another_member = make_client(db, make_user(user_id="member-2"))
    assert another_member.get("/bar/orders/owned").status_code == 403
    assert another_member.get("/bar/customers/me/orders").json() == []


def test_bar_admin_order_search_filters_sort_pagination_and_summary(db):
    add_customer(db)
    add_customer(db, "member-2")
    add_menu_item(db)
    add_order(db, "one", "BAR-ALPHA", ordered_at=datetime(2026, 11, 20, 10), total="5.00")
    add_order(db, "two", "BAR-BETA", customer_id="member-2", ordered_at=datetime(2026, 11, 21, 10), total="15.00")
    add_order(db, "three", "BAR-GAMMA", ordered_at=datetime(2026, 11, 22, 10), total="10.00")
    client = make_client(db, make_user(role="SUBADMIN", module="bar"))

    page = client.get("/bar/admin/orders?page=1&page_size=2&sort=newest")
    assert page.status_code == 200
    assert page.json()["total_count"] == 3
    assert page.json()["current_page"] == 1
    assert page.json()["total_pages"] == 2
    assert [item["order_number"] for item in page.json()["orders"]] == [
        "BAR-GAMMA",
        "BAR-BETA",
    ]
    assert [
        item["order_number"]
        for item in client.get("/bar/admin/orders?sort=oldest").json()["orders"]
    ] == ["BAR-ALPHA", "BAR-BETA", "BAR-GAMMA"]
    assert client.get(
        "/bar/admin/orders?order_number=beta"
    ).json()["total_count"] == 1
    assert client.get(
        "/bar/admin/orders?customer_id=member-2"
    ).json()["total_count"] == 1
    assert client.get(
        "/bar/admin/orders?order_date=2026-11-21"
    ).json()["total_count"] == 1
    assert client.get(
        "/bar/admin/orders?start_date=2026-11-20&end_date=2026-11-21"
    ).json()["total_count"] == 2
    assert client.get(
        "/bar/admin/orders?start_date=2026-11-22&end_date=2026-11-20"
    ).status_code == 422
    assert client.get("/bar/admin/orders/two").json()["order_number"] == "BAR-BETA"
    assert [
        order["order_number"]
        for order in client.get(
            "/bar/admin/orders/customer/member-2"
        ).json()
    ] == ["BAR-BETA"]
    assert client.get("/bar/admin/orders?customer_id=missing").json()["orders"] == []
    assert client.get("/bar/admin/orders?page=0").status_code == 422
    assert client.get("/bar/admin/orders?page_size=101").status_code == 422

    summary = client.get(
        "/bar/admin/orders/summary?start_date=2026-11-21&end_date=2026-11-22"
    )
    assert summary.status_code == 200
    assert summary.json() == {
        "total_orders": 3,
        "total_sales_amount": "30.00",
        "average_order_value": "10.00",
        "orders_in_date_range": 2,
    }


@pytest.mark.parametrize(
    ("role", "module", "expected"),
    [
        ("ADMIN", None, 200),
        ("SUBADMIN", "bar", 200),
        ("SUBADMIN", "cafe", 403),
        ("SUBADMIN", "sports", 403),
        ("MEMBER", None, 403),
    ],
)
def test_bar_admin_access_is_module_scoped(db, role, module, expected):
    response = make_client(db, make_user(role=role, module=module)).get(
        "/bar/admin/orders"
    )
    assert response.status_code == expected


def make_token(expiration: timedelta) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "id": "member-1",
            "iat": now - timedelta(minutes=5),
            "exp": now + expiration,
        },
        TEST_SECRET,
        algorithm="HS256",
    )


@pytest.mark.parametrize("authorization", [None, "Bearer invalid-token"])
def test_bar_admin_requires_authentication(db, monkeypatch, authorization):
    monkeypatch.setenv("JWT_SECRET", TEST_SECRET)
    client = make_client(db)
    headers = {"Authorization": authorization} if authorization else {}
    response = client.get("/bar/admin/orders", headers=headers)
    assert response.status_code == 401


def test_bar_admin_rejects_expired_jwt(db, monkeypatch):
    monkeypatch.setenv("JWT_SECRET", TEST_SECRET)
    client = make_client(db)
    response = client.get(
        "/bar/admin/orders",
        headers={"Authorization": f"Bearer {make_token(timedelta(seconds=-1))}"},
    )
    assert response.status_code == 401


def test_bar_json_and_pdf_receipts_enforce_owner_and_admin_access(db):
    add_customer(db)
    add_menu_item(db)
    add_order(db, "receipt-order", "BAR-RECEIPT")
    client = make_client(db, make_user())

    receipt = client.get("/bar/orders/receipt-order/receipt")
    assert receipt.status_code == 200
    assert receipt.json()["customer_email"] == "member-1@example.test"
    assert receipt.json()["items"][0]["name"] == "Draft Ale"
    pdf = client.get("/bar/orders/receipt-order/receipt/pdf")
    assert pdf.status_code == 200
    assert pdf.headers["content-type"] == "application/pdf"
    assert pdf.content.startswith(b"%PDF-")

    other = make_client(db, make_user(user_id="member-2"))
    assert other.get("/bar/orders/receipt-order/receipt").status_code == 403
    bar_admin = make_client(db, make_user(role="SUBADMIN", module="bar"))
    assert bar_admin.get("/bar/orders/receipt-order/receipt").status_code == 200
    cafe_admin = make_client(db, make_user(role="SUBADMIN", module="cafe"))
    assert cafe_admin.get("/bar/orders/receipt-order/receipt").status_code == 403


def test_bar_routes_are_in_openapi_and_cafe_routes_remain_registered():
    paths = app.openapi()["paths"]
    assert "/bar/menu" in paths
    assert "/bar/admin/menu" in paths
    assert "/bar/orders" in paths
    assert "/bar/admin/orders" in paths
    assert "/bar/admin/orders/summary" in paths
    assert "/bar/orders/{order_id}/receipt/pdf" in paths
    assert "/menu" in paths
    assert "/admin/orders" in paths
