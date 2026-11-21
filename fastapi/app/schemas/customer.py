from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CustomerResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    phone: str
    email: str
    membership: str
    renewal_date: datetime | None = None
