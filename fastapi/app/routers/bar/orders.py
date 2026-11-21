from datetime import date, datetime, time, timedelta
from decimal import Decimal
from math import ceil
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session, selectinload

from app.auth.bar_access import (
    require_bar_admin,
    require_bar_customer,
    require_bar_order_access,
)
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.bar_menu import BarMenuItem
from app.models.bar_order import BarOrder, BarOrderItem
from app.schemas.auth import AuthenticatedUser
from app.schemas.bar_order import (
    BarAdminOrderPage,
    BarAdminOrderSummary,
    BarOrderItemResponse,
    BarOrderResponse,
    CreateBarOrderRequest,
)
from app.services.bar_order_calculation import calculate_bar_order_totals
from app.services.bar_order_number import generate_bar_order_number


router = APIRouter(prefix="/bar", tags=["Bar Orders"])


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
        filters.append(BarOrder.orderNumber.ilike(f"%{order_number.strip()}%"))
    if customer_id:
        filters.append(BarOrder.userID == customer_id)
    if order_date:
        filters.extend(
            (
                BarOrder.dateTime >= datetime.combine(order_date, time.min),
                BarOrder.dateTime < datetime.combine(
                    order_date + timedelta(days=1), time.min
                ),
            )
        )
    if start_date:
        filters.append(
            BarOrder.dateTime >= datetime.combine(start_date, time.min)
        )
    if end_date:
        filters.append(
            BarOrder.dateTime < datetime.combine(
                end_date + timedelta(days=1), time.min
            )
        )
    return filters


def serialize_bar_order(order: BarOrder) -> BarOrderResponse:
    return BarOrderResponse(
        id=order.id,
        user_id=order.userID,
        table_number=order.tableNumber,
        order_items=[
            BarOrderItemResponse(
                menu_item_id=item.menuItemID,
                name=item.name,
                quantity=item.quantity,
                unit_price=Decimal(str(item.unitPrice)).quantize(Decimal("0.01")),
                line_total=Decimal(str(item.lineTotal)).quantize(Decimal("0.01")),
            )
            for item in order.items
        ],
        order_number=order.orderNumber,
        date_time=order.dateTime,
        subtotal=Decimal(str(order.subtotal)).quantize(Decimal("0.01")),
        discount_amount=Decimal(str(order.discountAmount)).quantize(
            Decimal("0.01")
        ),
        total_amount=Decimal(str(order.totalAmount)).quantize(Decimal("0.01")),
    )


def _order_query(order_id: str):
    return (
        select(BarOrder)
        .options(selectinload(BarOrder.items))
        .where(BarOrder.id == order_id)
    )


@router.post(
    "/orders",
    response_model=BarOrderResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_bar_order(
    payload: CreateBarOrderRequest,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_bar_customer),
):
    item_ids = list(dict.fromkeys(item.item_id for item in payload.items))
    menu_items = db.scalars(
        select(BarMenuItem).where(BarMenuItem.id.in_(item_ids))
    ).all()
    menu_items_by_id = {item.id: item for item in menu_items}
    if any(item_id not in menu_items_by_id for item_id in item_ids):
        raise HTTPException(status_code=404, detail="One or more Bar menu items not found")
    ordered_menu_items = [menu_items_by_id[item_id] for item_id in item_ids]
    if any(not item.isAvailable for item in ordered_menu_items):
        raise HTTPException(
            status_code=400,
            detail="One or more Bar menu items are unavailable",
        )

    subtotal, discount, total, calculated_items = calculate_bar_order_totals(
        ordered_menu_items,
        payload.items,
        user.membership,
    )
    now = datetime.now()
    for attempt in range(5):
        order = BarOrder(
            id=str(uuid4()),
            userID=user.id,
            tableNumber=payload.table_number,
            orderNumber=generate_bar_order_number(),
            dateTime=now,
            subtotal=subtotal,
            discountAmount=discount,
            totalAmount=total,
            items=[
                BarOrderItem(
                    id=str(uuid4()),
                    menuItemID=item.menu_item_id,
                    position=position,
                    name=item.name,
                    quantity=item.quantity,
                    unitPrice=item.unit_price,
                    lineTotal=item.line_total,
                )
                for position, item in enumerate(calculated_items)
            ],
        )
        db.add(order)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            if attempt == 4:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Could not generate a unique Bar order number",
                )
            continue
        except SQLAlchemyError:
            db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Could not save the Bar order",
            )
        db.refresh(order)
        return serialize_bar_order(order)

    raise HTTPException(status_code=500, detail="Could not create Bar order")


@router.get("/orders/{order_id}", response_model=BarOrderResponse)
def get_bar_order(
    order_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
):
    order = db.scalar(_order_query(order_id))
    if order is None:
        raise HTTPException(status_code=404, detail="Bar order not found")
    require_bar_order_access(order.userID, user)
    return serialize_bar_order(order)


@router.get("/customers/me/orders", response_model=list[BarOrderResponse])
def get_my_bar_orders(
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(require_bar_customer),
):
    orders = db.scalars(
        select(BarOrder)
        .options(selectinload(BarOrder.items))
        .where(BarOrder.userID == user.id)
        .order_by(BarOrder.dateTime.desc(), BarOrder.id.desc())
    ).all()
    return [serialize_bar_order(order) for order in orders]


@router.get("/admin/orders/summary", response_model=BarAdminOrderSummary)
def get_bar_order_summary(
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_bar_admin),
):
    _validate_date_range(start_date, end_date)
    total_orders = db.scalar(select(func.count(BarOrder.id))) or 0
    total_sales = db.scalar(select(func.sum(BarOrder.totalAmount)))
    average_order_value = db.scalar(select(func.avg(BarOrder.totalAmount)))
    orders_in_range = db.scalar(
        select(func.count(BarOrder.id)).where(
            *_order_filters(start_date=start_date, end_date=end_date)
        )
    ) or 0
    return BarAdminOrderSummary(
        total_orders=total_orders,
        total_sales_amount=Decimal(str(total_sales or 0)).quantize(
            Decimal("0.01")
        ),
        average_order_value=Decimal(str(average_order_value or 0)).quantize(
            Decimal("0.01")
        ),
        orders_in_date_range=orders_in_range,
    )


@router.get("/admin/orders", response_model=BarAdminOrderPage)
def get_all_bar_orders(
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_bar_admin),
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
        select(func.count(BarOrder.id)).where(*filters)
    ) or 0
    descending = sort == "newest"
    sort_column = BarOrder.dateTime.desc() if descending else BarOrder.dateTime.asc()
    id_column = BarOrder.id.desc() if descending else BarOrder.id.asc()
    orders = db.scalars(
        select(BarOrder)
        .options(selectinload(BarOrder.items))
        .where(*filters)
        .order_by(sort_column, id_column)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return BarAdminOrderPage(
        orders=[serialize_bar_order(order) for order in orders],
        total_count=total_count,
        current_page=page,
        page_size=page_size,
        total_pages=ceil(total_count / page_size),
    )


@router.get("/admin/orders/{order_id}", response_model=BarOrderResponse)
def get_admin_bar_order(
    order_id: str,
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_bar_admin),
):
    order = db.scalar(_order_query(order_id))
    if order is None:
        raise HTTPException(status_code=404, detail="Bar order not found")
    return serialize_bar_order(order)


@router.get(
    "/admin/orders/customer/{customer_id}",
    response_model=list[BarOrderResponse],
)
def get_bar_customer_orders(
    customer_id: str,
    db: Session = Depends(get_db),
    _user: AuthenticatedUser = Depends(require_bar_admin),
):
    orders = db.scalars(
        select(BarOrder)
        .options(selectinload(BarOrder.items))
        .where(BarOrder.userID == customer_id)
        .order_by(BarOrder.dateTime.desc(), BarOrder.id.desc())
    ).all()
    return [serialize_bar_order(order) for order in orders]
