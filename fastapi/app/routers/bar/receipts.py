import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy import select, text
from sqlalchemy.orm import Session, selectinload

from app.auth.bar_access import require_bar_order_access
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.models.bar_order import BarOrder
from app.schemas.auth import AuthenticatedUser
from app.schemas.bar_order import BarOrderItemResponse
from app.schemas.bar_receipt import BarReceiptResponse
from app.services.bar_order_calculation import MONEY
from app.services.bar_receipt_generator import generate_bar_receipt_pdf


router = APIRouter(prefix="/bar/orders", tags=["Bar Receipts"])


def get_bar_receipt(
    order_id: str,
    db: Session,
    user: AuthenticatedUser,
) -> BarReceiptResponse:
    order = db.scalar(
        select(BarOrder)
        .options(selectinload(BarOrder.items))
        .where(BarOrder.id == order_id)
    )
    if order is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bar order not found",
        )
    require_bar_order_access(order.userID, user)

    customer = db.execute(
        text('SELECT id, name, email FROM "User" WHERE id = :user_id'),
        {"user_id": order.userID},
    ).mappings().first()
    if customer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Order customer not found",
        )

    return BarReceiptResponse(
        receipt_id=order.id,
        order_id=order.id,
        order_number=order.orderNumber,
        customer_id=customer["id"],
        customer_name=customer["name"],
        customer_email=customer["email"],
        order_datetime=order.dateTime,
        table_number=order.tableNumber,
        items=[
            BarOrderItemResponse(
                menu_item_id=item.menuItemID,
                name=item.name,
                quantity=item.quantity,
                unit_price=item.unitPrice.quantize(MONEY),
                line_total=item.lineTotal.quantize(MONEY),
            )
            for item in order.items
        ],
        subtotal=order.subtotal.quantize(MONEY),
        discount_amount=order.discountAmount.quantize(MONEY),
        total_amount=order.totalAmount.quantize(MONEY),
        generated_at=datetime.now(),
    )


@router.get("/{order_id}/receipt", response_model=BarReceiptResponse)
def get_bar_order_receipt(
    order_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
) -> BarReceiptResponse:
    return get_bar_receipt(order_id, db, user)


@router.get(
    "/{order_id}/receipt/pdf",
    response_class=Response,
    responses={
        200: {
            "content": {
                "application/pdf": {
                    "schema": {"type": "string", "format": "binary"}
                }
            }
        }
    },
)
def download_bar_order_receipt_pdf(
    order_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
) -> Response:
    receipt = get_bar_receipt(order_id, db, user)
    pdf_content = generate_bar_receipt_pdf(receipt)
    filename = re.sub(r"[^A-Za-z0-9._-]", "_", receipt.order_number)
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="bar-receipt-{filename}.pdf"'
        },
    )
