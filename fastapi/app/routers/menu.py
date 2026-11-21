from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.dependencies import (
    get_current_user,
    require_cafe_admin,
)
from app.database import get_db
from app.models.cafe_menu import CafeMenuItem
from app.schemas.auth import AuthenticatedUser
from app.schemas.menu import (
    MenuItemCreate,
    MenuItemResponse,
    MenuItemUpdate,
)


router = APIRouter(tags=["Cafe Menu"])


def serialize_item(item: CafeMenuItem) -> MenuItemResponse:
    return MenuItemResponse(
        id=item.id,
        name=item.name,
        description=item.description,
        category=item.category,
        price=item.price,
        is_available=item.isAvailable,
        created_at=item.createdAt,
        updated_at=item.updatedAt,
    )


@router.get("/menu", response_model=list[MenuItemResponse])
def list_available_menu(
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(get_current_user),
):
    items = db.scalars(
        select(CafeMenuItem)
        .where(CafeMenuItem.isAvailable.is_(True))
        .order_by(CafeMenuItem.category, CafeMenuItem.name)
    ).all()
    return [serialize_item(item) for item in items]


@router.get("/menu/{item_id}", response_model=MenuItemResponse)
def get_available_menu_item(
    item_id: str,
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(get_current_user),
):
    item = db.scalar(
        select(CafeMenuItem).where(
            CafeMenuItem.id == item_id,
            CafeMenuItem.isAvailable.is_(True),
        )
    )
    if item is None:
        raise HTTPException(status_code=404, detail="Available menu item not found")
    return serialize_item(item)


@router.post("/admin/menu", response_model=MenuItemResponse, status_code=201)
def create_menu_item(
    payload: MenuItemCreate,
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_cafe_admin),
):
    now = datetime.now()
    item = CafeMenuItem(
        id=str(uuid4()),
        name=payload.name,
        description=payload.description,
        category=payload.category,
        price=payload.price,
        isAvailable=payload.is_available,  
        createdAt=now,
        updatedAt=now,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return serialize_item(item)


@router.get("/admin/menu", response_model=list[MenuItemResponse])
def list_all_menu_items(
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_cafe_admin),
):
    items = db.scalars(
        select(CafeMenuItem).order_by(CafeMenuItem.category, CafeMenuItem.name)
    ).all()
    return [serialize_item(item) for item in items]


@router.put("/admin/menu/{item_id}", response_model=MenuItemResponse)
def update_menu_item(
    item_id: str,
    payload: MenuItemUpdate,
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_cafe_admin),
):
    item = db.scalar(select(CafeMenuItem).where(CafeMenuItem.id == item_id))
    if item is None:
        raise HTTPException(status_code=404, detail="Menu item not found")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if field == "is_available":
            item.isAvailable = value
        else:
            setattr(item, field, value)
    item.updatedAt = datetime.now()
    db.commit()
    db.refresh(item)
    return serialize_item(item)




@router.delete("/admin/menu/{item_id}", response_model=MenuItemResponse)
def remove_menu_item(
    item_id: str,
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_cafe_admin),
):
    item = db.scalar(select(CafeMenuItem).where(CafeMenuItem.id == item_id))
    if item is None:
        raise HTTPException(status_code=404, detail="Menu item not found")

    item.isAvailable = False
    item.updatedAt = datetime.now()
    db.commit()
    db.refresh(item)
    return serialize_item(item)
