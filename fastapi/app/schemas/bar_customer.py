from datetime import datetime

from pydantic import BaseModel


class BarCustomerResponse(BaseModel):
    id: str
    name: str
    phone: str
    email: str
    membership: str
    renewal_date: datetime | None = None
