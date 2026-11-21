import os

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.auth.dependencies import get_current_user
from app.database import get_db
from app.schemas.auth import AuthenticatedUser
from app.schemas.customer import CustomerResponse


router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(
    customer_id: str,
    db: Session = Depends(get_db),
    current_user: AuthenticatedUser = Depends(get_current_user),
) -> CustomerResponse:
    if current_user.role == "MEMBER":
        if current_user.id != customer_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot access another customer's information",
            )
    elif current_user.role == "ADMIN":
        pass
    elif current_user.role == "SUBADMIN":
        cafe_designation = (
            os.getenv("CAFE_MODULE_DESIGNATION", "cafe").strip().lower()
        )
        if (current_user.module or "").strip().lower() != cafe_designation:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You cannot access Cafe customer information",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )

    row = db.execute(
        text(
            'SELECT id, name, phone, email, membership, "renewalDate" '
            'FROM "User" '
            "WHERE id = :customer_id"
        ),
        {"customer_id": customer_id},
    ).mappings().first()

    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found",
        )

    return CustomerResponse(
        id=row["id"],
        name=row["name"],
        phone=row["phone"],
        email=row["email"],
        membership=str(row["membership"]),
        renewal_date=row["renewalDate"],
    )
