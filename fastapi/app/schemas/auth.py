from pydantic import BaseModel


class AuthenticatedUser(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    membership: str
    role: str
    module: str | None = None
