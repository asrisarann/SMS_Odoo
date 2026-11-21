import os
from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.auth.dependencies import (
    get_bearer_or_cookie_token,
    get_current_user,
    require_cafe_admin,
    require_main_admin,
)
from app.auth.ownership import require_record_owner_or_cafe_admin
from app.schemas.auth import AuthenticatedUser


SECRET = "test-only-secret-with-at-least-32-bytes"


def make_request(
    authorization: str | None = None,
    cookie_token: str | None = None,
) -> Request:
    headers = []
    if authorization:
        headers.append((b"authorization", authorization.encode()))
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": headers,
        "query_string": b"",
        "server": ("testserver", 80),
        "client": ("testclient", 50000),
        "scheme": "http",
        "cookies": (
            {"token": cookie_token} if cookie_token is not None else {}
        ),
    }
    request = Request(scope)
    if cookie_token is not None:
        request._cookies = {"token": cookie_token}
    return request


def make_token(
    user_id: str,
    role: str,
    module: str | None = None,
    expires_delta: timedelta = timedelta(minutes=5),
) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode(
        {
            "id": user_id,
            "email": f"{user_id}@example.test",
            "role": role,
            "module": module,
            "iat": now,
            "exp": now + expires_delta,
        },
        SECRET,
        algorithm="HS256",
    )


class FakeMappings:
    def __init__(self, row):
        self.row = row

    def first(self):
        return self.row


class FakeResult:
    def __init__(self, row):
        self.row = row

    def mappings(self):
        return FakeMappings(self.row)


class FakeDb:
    def __init__(self, staff_row=None):
        self.staff_row = staff_row
        self.call_count = 0

    def execute(self, statement, parameters):
        self.call_count += 1
        if self.call_count == 1:
            return FakeResult(
                {
                    "id": parameters["user_id"],
                    "name": "Test User",
                    "email": f"{parameters['user_id']}@example.test",
                    "phone": "0000000000",
                    "membership": "GOLD",
                }
            )
        return FakeResult(self.staff_row)


def member_user(user_id: str = "member-1") -> AuthenticatedUser:
    return AuthenticatedUser(
        id=user_id,
        name="Test Member",
        email=f"{user_id}@example.test",
        phone="0000000000",
        membership="GOLD",
        role="MEMBER",
        module=None,
    )


def test_missing_token():
    os.environ["JWT_SECRET"] = SECRET
    request = make_request()

    with pytest.raises(HTTPException) as exc:
        get_current_user(request, FakeDb())

    assert exc.value.status_code == 401


def test_invalid_token():
    os.environ["JWT_SECRET"] = SECRET
    request = make_request(authorization="Bearer invalid-token")

    with pytest.raises(HTTPException) as exc:
        get_current_user(request, FakeDb())

    assert exc.value.status_code == 401


def test_expired_token():
    os.environ["JWT_SECRET"] = SECRET
    token = make_token("member-1", "MEMBER", expires_delta=timedelta(seconds=-1))
    request = make_request(authorization=f"Bearer {token}")

    with pytest.raises(HTTPException) as exc:
        get_current_user(request, FakeDb())

    assert exc.value.status_code == 401


def test_valid_member_token():
    os.environ["JWT_SECRET"] = SECRET
    token = make_token("member-1", "MEMBER")
    request = make_request(cookie_token=token)
    user = get_current_user(request, FakeDb())

    assert user.role == "MEMBER"
    assert get_bearer_or_cookie_token(request) == token


def test_valid_admin_token():
    os.environ["JWT_SECRET"] = SECRET
    token = make_token("admin-1", "ADMIN")
    request = make_request(authorization=f"Bearer {token}")
    user = get_current_user(request, FakeDb({"role": "ADMIN", "designation": None}))

    assert require_main_admin(user).role == "ADMIN"
    assert require_cafe_admin(user).role == "ADMIN"


def test_cafe_subadmin_token():
    os.environ["JWT_SECRET"] = SECRET
    os.environ["CAFE_MODULE_DESIGNATION"] = "cafe"
    token = make_token("cafe-admin-1", "SUBADMIN", "cafe")
    request = make_request(authorization=f"Bearer {token}")
    user = get_current_user(
        request,
        FakeDb({"role": "SUBADMIN", "designation": "cafe"}),
    )

    assert require_cafe_admin(user).module == "cafe"


def test_other_module_subadmin_is_rejected():
    os.environ["CAFE_MODULE_DESIGNATION"] = "cafe"
    user = AuthenticatedUser(
        id="sports-admin-1",
        name="Sports Admin",
        email="sports-admin-1@example.test",
        phone="0000000000",
        membership="GOLD",
        role="SUBADMIN",
        module="sports",
    )

    with pytest.raises(HTTPException) as exc:
        require_cafe_admin(user)

    assert exc.value.status_code == 403


def test_customer_cannot_access_another_customer():
    user = member_user("member-1")

    with pytest.raises(HTTPException) as exc:
        require_record_owner_or_cafe_admin("member-2", user)

    assert exc.value.status_code == 403
