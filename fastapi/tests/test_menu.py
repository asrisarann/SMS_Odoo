from datetime import datetime
from decimal import Decimal

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.auth.dependencies import require_cafe_admin
from app.models.cafe_menu import CafeMenuItem
from app.routers.menu import (
    create_menu_item,
    list_available_menu,
    remove_menu_item,
    update_menu_item,
)
from app.schemas.auth import AuthenticatedUser
from app.schemas.menu import MenuItemCreate, MenuItemUpdate


class FakeScalars:
    def __init__(self, items):
        self.items = items

    def all(self):
        return self.items


class FakeDb:
    def __init__(self, items=None):
        self.items = items or []
        self.commits = 0

    def scalars(self, statement):
        return FakeScalars(
            [item for item in self.items if item.isAvailable]
        )

    def scalar(self, statement):
        if not self.items:
            return None
        return self.items[0]

    def add(self, item):
        self.items.append(item)

    def commit(self):
        self.commits += 1

    def refresh(self, item):
        return None


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


def member_user():
    return AuthenticatedUser(
        id="member-1",
        name="Test Member",
        email="member@example.test",
        phone="0000000000",
        membership="GOLD",
        role="MEMBER",
        module=None,
    )


def menu_item(available=True):
    now = datetime.now()
    return CafeMenuItem(
        id="item-1",
        name="Tea",
        description="Fresh tea",
        category="Drinks",
        price=Decimal("5.00"),
        isAvailable=available,
        createdAt=now,
        updatedAt=now,
    )


def test_create_menu_item():
    db = FakeDb()
    payload = MenuItemCreate(
        name="Tea",
        description="Fresh tea",
        category="Drinks",
        price=Decimal("5.00"),
        is_available=True,
    )

    response = create_menu_item(payload, db, admin_user())

    assert response.name == "Tea"
    assert response.price == Decimal("5.00")
    assert db.commits == 1


def test_view_available_menu_items():
    db = FakeDb([menu_item(True), menu_item(False)])
    db.items[1].id = "item-2"

    response = list_available_menu(db, member_user())

    assert len(response) == 1
    assert response[0].is_available is True


def test_update_menu_item():
    item = menu_item()
    db = FakeDb([item])
    payload = MenuItemUpdate(
        name="Green Tea",
        price=Decimal("6.25"),
    )

    response = update_menu_item("item-1", payload, db, admin_user())

    assert response.name == "Green Tea"
    assert response.price == Decimal("6.25")
    assert db.commits == 1


def test_invalid_price_is_rejected():
    with pytest.raises(ValidationError):
        MenuItemCreate(
            name="Tea",
            category="Drinks",
            price=Decimal("0"),
        )


def test_other_module_subadmin_is_rejected():
    user = admin_user(role="SUBADMIN", module="sports")

    with pytest.raises(HTTPException) as exc:
        require_cafe_admin(user)

    assert exc.value.status_code == 403


def test_customer_cannot_modify_menu():
    with pytest.raises(HTTPException) as exc:
        require_cafe_admin(member_user())

    assert exc.value.status_code == 403


def test_delete_soft_marks_item_unavailable():
    item = menu_item()
    db = FakeDb([item])

    response = remove_menu_item("item-1", db, admin_user())

    assert response.is_available is False
    assert item.isAvailable is False
