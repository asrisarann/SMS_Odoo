from sqlalchemy import Column, DateTime, Numeric, String, Integer, text
from sqlalchemy.dialects.postgresql import ARRAY

from app.database import Base


class CafeOrder(Base):
    __tablename__ = "CafeOrder"

    id = Column(String, primary_key=True)
    userID = Column(String, nullable=False)
    tableNumber = Column(Integer, nullable=True)
    orderItems = Column(ARRAY(String), nullable=True)
    orderNumber = Column(String, nullable=False, unique=True)
    dateTime = Column(DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP"))
    totalAmount = Column(Numeric(10, 2), nullable=False)
