from sqlalchemy import Boolean, Column, DateTime, Numeric, String, text

from app.database import Base


class BarMenuItem(Base):
    __tablename__ = "BarMenuItem"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    category = Column(String, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    isAvailable = Column(Boolean, nullable=False, server_default=text("true"))
    createdAt = Column(
        DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    updatedAt = Column(
        DateTime, nullable=False
    )
