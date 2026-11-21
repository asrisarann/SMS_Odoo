from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth.bar_access import require_bar_customer_access
from app.auth.dependencies import get_current_user
from app.database import get_db
from app.schemas.auth import AuthenticatedUser
from app.schemas.bar_customer import BarCustomerResponse


router = APIRouter(prefix="/bar/customers", tags=["Bar Customers"])


@router.get("/{customer_id}", response_model=BarCustomerResponse)
def get_bar_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    require_bar_customer_access(customer_id, current_user)
    row = db.execute(
        text(
            'SELECT id, name, phone, email, membership, "renewalDate" '
            'FROM "User" WHERE id = :customer_id'
        ),
        {"customer_id": customer_id},
    ).mappings().first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    return BarCustomerResponse(
        id=row["id"],
        name=row["name"],
        phone=row["phone"],
        email=row["email"],
        membership=str(row["membership"]),
        renewal_date=row["renewalDate"],
    )
