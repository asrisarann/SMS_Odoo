import os

from fastapi import Depends, HTTPException, status

from app.auth.dependencies import get_current_user
from app.schemas.auth import AuthenticatedUser


def is_bar_admin(user: AuthenticatedUser) -> bool:
    if user.role == "ADMIN":
        return True

    designation = os.getenv("BAR_MODULE_DESIGNATION", "bar").strip().casefold()
    return (
        user.role == "SUBADMIN"
        and (user.module or "").strip().casefold() == designation
    )


def require_bar_admin(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    if not is_bar_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bar administrative access required",
        )
    return user


def require_bar_customer(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    if user.role != "MEMBER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer access required",
        )
    return user


def require_bar_customer_access(
    customer_id: str,
    user: AuthenticatedUser,
) -> None:
    if is_bar_admin(user) or (user.role == "MEMBER" and user.id == customer_id):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You cannot access this customer's Bar records",
    )


def require_bar_order_access(
    customer_id: str,
    user: AuthenticatedUser,
) -> None:
    if is_bar_admin(user) or (user.role == "MEMBER" and user.id == customer_id):
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You cannot access this Bar order",
    )
