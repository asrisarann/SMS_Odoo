import os

import jwt
from fastapi import Depends, HTTPException, Request, status
from jwt import InvalidTokenError
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import AuthenticatedUser


def get_bearer_or_cookie_token(request: Request) -> str | None:
    cookie_token = request.cookies.get("token")
    if cookie_token:
        return cookie_token

    authorization = request.headers.get("Authorization")
    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip() or None

    return None


def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
) -> AuthenticatedUser:
    token = get_bearer_or_cookie_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    jwt_secret = os.getenv("JWT_SECRET")
    if not jwt_secret:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication is not configured",
        )

    try:
        payload = jwt.decode(
            token,
            jwt_secret,
            algorithms=["HS256"],
            options={"require": ["exp", "iat", "id"]},
        )
    except InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
        )

    user_id = payload.get("id")
    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )

    user_row = db.execute(
        text(
            "SELECT id, name, email, phone, membership "
            'FROM "User" '
            "WHERE id = :user_id"
        ),
        {"user_id": user_id},
    ).mappings().first()

    if user_row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or token invalid",
        )

    staff_row = db.execute(
        text(
            "SELECT role, designation "
            'FROM "Staff" '
            "WHERE email = :email"
        ),
        {"email": user_row["email"]},
    ).mappings().first()

    if staff_row is not None:
        role = staff_row["role"]
        module = staff_row["designation"]
    else:
        role = payload.get("role") or "MEMBER"
        module = payload.get("module")

    return AuthenticatedUser(
        id=user_row["id"],
        name=user_row["name"],
        email=user_row["email"],
        phone=user_row["phone"],
        membership=str(user_row["membership"]),
        role=role,
        module=module,
    )


def require_main_admin(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    if user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Main Admin access required",
        )
    return user


def require_cafe_admin(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    if user.role == "ADMIN":
        return user

    cafe_designation = (
        os.getenv("CAFE_MODULE_DESIGNATION", "cafe").strip().lower()
    )
    if (
        user.role == "SUBADMIN"
        and (user.module or "").strip().lower() == cafe_designation
    ):
        return user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Cafe administrative access required",
    )


def require_customer(
    user: AuthenticatedUser = Depends(get_current_user),
) -> AuthenticatedUser:
    if user.role != "MEMBER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Customer access required",
        )
    return user
