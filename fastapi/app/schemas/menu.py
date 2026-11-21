from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, StrictBool, field_validator


class MenuItemCreate(BaseModel):
    name: str = Field(min_length=1)
    description: str | None = None
    category: str = Field(min_length=1)
    price: Decimal = Field(gt=0, decimal_places=2)
    is_available: StrictBool = True

    @field_validator("name", "category")
    @classmethod
    def cannot_be_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Cannot be empty")
        return value


class MenuItemUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = Field(default=None, min_length=1)
    description: str | None = None
    category: str | None = Field(default=None, min_length=1)
    price: Decimal | None = Field(default=None, gt=0, decimal_places=2)
    is_available: StrictBool | None = None

    @field_validator("name", "category")
    @classmethod
    def cannot_be_blank(cls, value: str | None) -> str | None:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("Cannot be empty")
        return value


class MenuItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    description: str | None
    category: str
    price: Decimal
    is_available: bool
    created_at: datetime
    updated_at: datetime
