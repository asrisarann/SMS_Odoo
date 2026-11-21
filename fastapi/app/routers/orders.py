from datetime import date, datetime, time, timedelta
from decimal import Decimal
from math import ceil
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
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
from app.schemas.order import (
    AdminOrderPage,
    AdminOrderSummary,
    CafeOrderResponse,
    CreateOrderRequest,
)
from app.services.order_calculation import calculate_order_totals
from app.services.order_number import generate_order_number


router = APIRouter(tags=["Cafe Orders"])


def _validate_date_range(start_date: date | None, end_date: date | None) -> None:
    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail="start_date must be on or before end_date",
        )


def _order_filters(
    order_number: str | None = None,
    customer_id: str | None = None,
    order_date: date | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
):
    _validate_date_range(start_date, end_date)
    filters = []
    if order_number and order_number.strip():
        filters.append(CafeOrder.orderNumber.ilike(f"%{order_number.strip()}%"))
    if customer_id:
        filters.append(CafeOrder.userID == customer_id)
    if order_date:
        filters.extend(
            (
                CafeOrder.dateTime >= datetime.combine(order_date, time.min),
                CafeOrder.dateTime < datetime.combine(
                    order_date + timedelta(days=1), time.min
                ),
            )
        )
    if start_date:
        filters.append(
            CafeOrder.dateTime >= datetime.combine(start_date, time.min)
        )
    if end_date:
        filters.append(
            CafeOrder.dateTime < datetime.combine(
                end_date + timedelta(days=1), time.min
            )
        )
    return filters


def serialize_order(order: CafeOrder) -> CafeOrderResponse:
    subtotal = Decimal(str(order.totalAmount)).quantize(Decimal("0.01"))
    return CafeOrderResponse(
        id=order.id,
        user_id=order.userID,
        table_number=order.tableNumber,
        order_items=list(order.orderItems or []),
        order_number=order.orderNumber,
        date_time=order.dateTime,
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


@router.get("/admin/orders", response_model=AdminOrderPage)
def get_all_orders(
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_cafe_admin),
    order_number: str | None = None,
    customer_id: str | None = None,
    order_date: date | None = None,
    start_date: date | None = None,
    end_date: date | None = None,
    sort: Literal["newest", "oldest"] = "newest",
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
):
    filters = _order_filters(
        order_number,
        customer_id,
        order_date,
        start_date,
        end_date,
    )
    total_count = db.scalar(
        select(func.count(CafeOrder.id)).where(*filters)
    ) or 0
    sort_column = (
        CafeOrder.dateTime.desc()
        if sort == "newest"
        else CafeOrder.dateTime.asc()
    )
    id_column = (
        CafeOrder.id.desc()
        if sort == "newest"
        else CafeOrder.id.asc()
    )
    orders = db.scalars(
        select(CafeOrder)
        .where(*filters)
        .order_by(sort_column, id_column)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return AdminOrderPage(
        orders=[serialize_order(order) for order in orders],
        total_count=total_count,
        current_page=page,
        page_size=page_size,
        total_pages=ceil(total_count / page_size),
    )


@router.get("/admin/orders/summary", response_model=AdminOrderSummary)
def get_order_summary(
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_cafe_admin),
):
    _validate_date_range(start_date, end_date)
    total_orders = db.scalar(select(func.count(CafeOrder.id))) or 0
    total_sales = db.scalar(select(func.sum(CafeOrder.totalAmount)))
    average_order_value = db.scalar(select(func.avg(CafeOrder.totalAmount)))
    orders_in_range = db.scalar(
        select(func.count(CafeOrder.id)).where(
            *_order_filters(start_date=start_date, end_date=end_date)
        )
    ) or 0

    return AdminOrderSummary(
        total_orders=total_orders,
        total_sales_amount=Decimal(str(total_sales or 0)).quantize(
            Decimal("0.01")
        ),
        average_order_value=Decimal(str(average_order_value or 0)).quantize(
            Decimal("0.01")
        ),
        orders_in_date_range=orders_in_range,
    )


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
