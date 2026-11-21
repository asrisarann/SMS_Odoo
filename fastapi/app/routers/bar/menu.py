from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.bar_access import require_bar_admin
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.bar_menu import BarMenuItem
from app.schemas.auth import AuthenticatedUser
from app.schemas.bar_menu import (
    BarMenuItemCreate,
    BarMenuItemResponse,
    BarMenuItemUpdate,
)


router = APIRouter(prefix="/bar", tags=["Bar Menu"])


def serialize_bar_menu_item(item: BarMenuItem) -> BarMenuItemResponse:
    return BarMenuItemResponse(
        id=item.id,
        name=item.name,
        description=item.description,
        category=item.category,
        price=item.price,
        is_available=item.isAvailable,
        created_at=item.createdAt,
        updated_at=item.updatedAt,
    )


@router.get("/menu", response_model=list[BarMenuItemResponse])
def list_available_bar_menu(
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(get_current_user),
):
    items = db.scalars(
        select(BarMenuItem)
        .where(BarMenuItem.isAvailable.is_(True))
        .order_by(BarMenuItem.category, BarMenuItem.name)
    ).all()
    return [serialize_bar_menu_item(item) for item in items]


@router.get("/menu/{item_id}", response_model=BarMenuItemResponse)
def get_available_bar_menu_item(
    item_id: str,
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(get_current_user),
):
    item = db.scalar(
        select(BarMenuItem).where(
            BarMenuItem.id == item_id,
            BarMenuItem.isAvailable.is_(True),
        )
    )
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Available Bar menu item not found",
        )
    return serialize_bar_menu_item(item)


@router.get("/admin/menu", response_model=list[BarMenuItemResponse])
def list_all_bar_menu_items(
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_bar_admin),
):
    items = db.scalars(
        select(BarMenuItem).order_by(BarMenuItem.category, BarMenuItem.name)
    ).all()
    return [serialize_bar_menu_item(item) for item in items]


@router.post(
    "/admin/menu",
    response_model=BarMenuItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_bar_menu_item(
    payload: BarMenuItemCreate,
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_bar_admin),
):
    now = datetime.now()
    item = BarMenuItem(
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
    return serialize_bar_menu_item(item)


@router.put(
    "/admin/menu/{item_id}",
    response_model=BarMenuItemResponse,
)
def update_bar_menu_item(
    item_id: str,
    payload: BarMenuItemUpdate,
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_bar_admin),
):
    item = db.scalar(select(BarMenuItem).where(BarMenuItem.id == item_id))
    if item is None:
        raise HTTPException(status_code=404, detail="Bar menu item not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(item, "isAvailable" if field == "is_available" else field, value)
    item.updatedAt = datetime.now()
    db.commit()
    db.refresh(item)
    return serialize_bar_menu_item(item)


@router.delete(
    "/admin/menu/{item_id}",
    response_model=BarMenuItemResponse,
)
def remove_bar_menu_item(
    item_id: str,
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_bar_admin),
):
    item = db.scalar(select(BarMenuItem).where(BarMenuItem.id == item_id))
    if item is None:
        raise HTTPException(status_code=404, detail="Bar menu item not found")

    item.isAvailable = False
    item.updatedAt = datetime.now()
    db.commit()
    db.refresh(item)
    return serialize_bar_menu_item(item)
