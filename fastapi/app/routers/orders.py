from datetime import datetime
from decimal import Decimal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from app.auth.dependencies import (
    get_current_user,
    require_cafe_admin,
    require_customer,
)
from app.database import get_db
from app.models.cafe_menu import CafeMenuItem
from app.models.cafe_order import CafeOrder
from app.schemas.auth import AuthenticatedUser
from app.schemas.order import CafeOrderResponse, CreateOrderRequest
from app.services.order_calculation import calculate_order_totals
from app.services.order_number import generate_order_number


router = APIRouter(tags=["Cafe Orders"])


def serialize_order(order: CafeOrder) -> CafeOrderResponse:
    subtotal = Decimal(str(order.totalAmount)).quantize(Decimal("0.01"))
    return CafeOrderResponse(
        id=order.id,
        user_id=order.userID,
        table_number=order.tableNumber,
        order_items=list(order.orderItems or []),
        order_number=order.orderNumber,
        date_time=order.dateTime,
        subtotal=subtotal,
        discount_amount=Decimal("0.00"),
        total_amount=subtotal,
    )


@router.post("/orders", response_model=CafeOrderResponse, status_code=201)
def create_order(
    payload: CreateOrderRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_customer),
):
    item_ids = list(dict.fromkeys(item.item_id for item in payload.items))

    menu_items = db.scalars(
        select(CafeMenuItem).where(CafeMenuItem.id.in_(item_ids))
    ).all()

    found_ids = {item.id for item in menu_items}
    missing_ids = [item_id for item_id in item_ids if item_id not in found_ids]
    if missing_ids:
        raise HTTPException(status_code=404, detail="One or more menu items not found")

    unavailable_ids = [
        item.id for item in menu_items if not item.isAvailable
    ]
    if unavailable_ids:
        raise HTTPException(
            status_code=400,
            detail="One or more menu items are unavailable",
        )

    subtotal, discount, total, descriptions = calculate_order_totals(
        menu_items,
        payload.items,
        user.membership,
    )

    for attempt in range(5):
        order = CafeOrder(
            id=str(uuid4()),
            userID=user.id,
            tableNumber=payload.table_number,
            orderItems=descriptions,
            orderNumber=generate_order_number(),
            dateTime=datetime.now(),
            totalAmount=total,
        )
        db.add(order)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            if attempt == 4:
                raise HTTPException(
                    status_code=409,
                    detail="Could not generate a unique order number",
                )
            continue
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(
                status_code=500,
                detail="Could not save the Cafe order",
            )
        db.refresh(order)

        response = serialize_order(order)
        response.subtotal = subtotal
        response.discount_amount = discount
        response.total_amount = total
        return response

    raise HTTPException(status_code=500, detail="Could not create order")


@router.get("/orders/{order_id}", response_model=CafeOrderResponse)
def get_customer_order(
    order_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_customer),
):
    order = db.scalar(select(CafeOrder).where(CafeOrder.id == order_id))
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.userID != user.id:
        raise HTTPException(
            status_code=403,
            detail="You cannot access another customer's order",
        )
    return serialize_order(order)


@router.get("/customers/me/orders", response_model=list[CafeOrderResponse])
def get_my_orders(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_customer),
):
    orders = db.scalars(
        select(CafeOrder)
        .where(CafeOrder.userID == user.id)
        .order_by(CafeOrder.dateTime.desc())
    ).all()
    return [serialize_order(order) for order in orders]


@router.get("/admin/orders", response_model=list[CafeOrderResponse])
def get_all_orders(
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_cafe_admin),
):
    orders = db.scalars(
        select(CafeOrder).order_by(CafeOrder.dateTime.desc())
    ).all()
    return [serialize_order(order) for order in orders]


@router.get("/admin/orders/{order_id}", response_model=CafeOrderResponse)
def get_admin_order(
    order_id: str,
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_cafe_admin),
):
    order = db.scalar(select(CafeOrder).where(CafeOrder.id == order_id))
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return serialize_order(order)


@router.get("/admin/orders/customer/{customer_id}", response_model=list[CafeOrderResponse])
def get_customer_orders(
    customer_id: str,
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_cafe_admin),
):
    orders = db.scalars(
        select(CafeOrder)
        .where(CafeOrder.userID == customer_id)
        .order_by(CafeOrder.dateTime.desc())
    ).all()
    return [serialize_order(order) for order in orders]
