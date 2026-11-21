from sqlalchemy import (
    Column,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import relationship

from app.database import Base


class BarOrder(Base):
    __tablename__ = "BarOrder"
    __table_args__ = (
        UniqueConstraint("orderNumber", name="BarOrder_orderNumber_key"),
        Index("BarOrder_userID_dateTime_idx", "userID", "dateTime"),
    )

    id = Column(String, primary_key=True)
    userID = Column(
        String,
        ForeignKey("User.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )
    tableNumber = Column(Integer, nullable=True)
    orderNumber = Column(String, nullable=False)
    dateTime = Column(
        DateTime, nullable=False, server_default=text("CURRENT_TIMESTAMP")
    )
    subtotal = Column(Numeric(10, 2), nullable=False)
    discountAmount = Column(Numeric(10, 2), nullable=False)
    totalAmount = Column(Numeric(10, 2), nullable=False)

    items = relationship(
        "BarOrderItem",
        back_populates="order",
        cascade="all, delete-orphan",
        order_by="BarOrderItem.position",
        lazy="selectin",
    )


class BarOrderItem(Base):
    __tablename__ = "BarOrderItem"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="BarOrderItem_quantity_check"),
        Index("BarOrderItem_orderID_position_idx", "orderID", "position"),
    )

    id = Column(String, primary_key=True)
    orderID = Column(
        String,
        ForeignKey("BarOrder.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
    )
    menuItemID = Column(
        String,
        ForeignKey("BarMenuItem.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )
    position = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    unitPrice = Column(Numeric(10, 2), nullable=False)
    lineTotal = Column(Numeric(10, 2), nullable=False)

    order = relationship("BarOrder", back_populates="items")
