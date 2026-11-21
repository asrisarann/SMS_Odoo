import re
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user, require_cafe_admin
from app.database import get_db
from app.models.cafe_order import CafeOrder
from app.schemas.auth import AuthenticatedUser
from app.schemas.receipt import ReceiptResponse
from app.services.receipt_generator import generate_receipt_pdf


router = APIRouter(tags=["Cafe Receipts"])


def get_receipt(
    order_id: str,
    db: Session,
    user: AuthenticatedUser,
) -> ReceiptResponse:
    order = db.scalar(select(CafeOrder).where(CafeOrder.id == order_id))
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")

    if user.role == "MEMBER":
        if order.userID != user.id:
            raise HTTPException(
                status_code=403,
                detail="You cannot access another customer's receipt",
            )
    elif user.role == "SUBADMIN":
        require_cafe_admin(user)
    elif user.role != "ADMIN":
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    customer = db.execute(
        text('SELECT id, name, email FROM "User" WHERE id = :user_id'),
        {"user_id": order.userID},
    ).mappings().first()
    if customer is None:
        raise HTTPException(status_code=404, detail="Order customer not found")

    return ReceiptResponse(
        receipt_id=order.id,
        order_id=order.id,
        order_number=order.orderNumber,
        customer_id=customer["id"],
        customer_name=customer["name"],
        customer_email=customer["email"],
        order_datetime=order.dateTime,
        table_number=order.tableNumber,
        items=list(order.orderItems or []),
        total_amount=order.totalAmount,
        generated_at=datetime.now(),
    )


@router.get("/orders/{order_id}/receipt", response_model=ReceiptResponse)
def get_order_receipt(
    order_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
) -> ReceiptResponse:
    return get_receipt(order_id, db, user)


@router.get(
    "/orders/{order_id}/receipt/pdf",
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
def download_order_receipt_pdf(
    order_id: str,
    db: Session = Depends(get_db),
    user: AuthenticatedUser = Depends(get_current_user),
) -> Response:
    receipt = get_receipt(order_id, db, user)
    pdf_content = generate_receipt_pdf(receipt)
    filename_part = re.sub(r"[^A-Za-z0-9._-]", "_", receipt.order_number)
    return Response(
        content=pdf_content,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="receipt-{filename_part}.pdf"'
        },
    )
