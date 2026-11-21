-- CreateTable
CREATE TABLE "BarMenuItem" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BarMenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarOrder" (
    "id" TEXT NOT NULL,
    "userID" TEXT NOT NULL,
    "tableNumber" INTEGER,
    "orderNumber" TEXT NOT NULL,
    "dateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "subtotal" DECIMAL(10,2) NOT NULL,
    "discountAmount" DECIMAL(10,2) NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "BarOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BarOrderItem" (
    "id" TEXT NOT NULL,
    "orderID" TEXT NOT NULL,
    "menuItemID" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "lineTotal" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "BarOrderItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "BarOrderItem_quantity_check" CHECK ("quantity" > 0)
);

-- CreateIndex
CREATE UNIQUE INDEX "BarOrder_orderNumber_key" ON "BarOrder"("orderNumber");

-- CreateIndex
CREATE INDEX "BarOrder_userID_dateTime_idx" ON "BarOrder"("userID", "dateTime");

-- CreateIndex
CREATE INDEX "BarOrderItem_orderID_position_idx" ON "BarOrderItem"("orderID", "position");

-- AddForeignKey
ALTER TABLE "BarOrder"
ADD CONSTRAINT "BarOrder_userID_fkey"
FOREIGN KEY ("userID") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarOrderItem"
ADD CONSTRAINT "BarOrderItem_orderID_fkey"
FOREIGN KEY ("orderID") REFERENCES "BarOrder"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BarOrderItem"
ADD CONSTRAINT "BarOrderItem_menuItemID_fkey"
FOREIGN KEY ("menuItemID") REFERENCES "BarMenuItem"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
