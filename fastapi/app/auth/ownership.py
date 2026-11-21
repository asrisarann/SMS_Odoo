import os

from fastapi import HTTPException, status

from app.schemas.auth import AuthenticatedUser


def require_record_owner_or_cafe_admin(
    record_user_id: str,
    user: AuthenticatedUser,
) -> None:
    if user.role == "ADMIN":
        return

    cafe_designation = os.getenv("CAFE_MODULE_DESIGNATION", "cafe").strip().lower()
    if (
        user.role == "SUBADMIN"
        and (user.module or "").strip().lower() == cafe_designation
    ):
        return

    if user.role == "MEMBER" and user.id == record_user_id:
        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You cannot access this customer's records",
    )
