-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "ServiceUrgency" AS ENUM ('STANDARD', 'EMERGENCY_EXPRESS');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "ServiceStatus" AS ENUM ('RECEIVED', 'IN_PROGRESS', 'READY_FOR_PICKUP', 'COLLECTED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable SportShopPurchase
ALTER TABLE "SportShopPurchase" ADD COLUMN IF NOT EXISTS "pickupCode" TEXT;
ALTER TABLE "SportShopPurchase" ADD COLUMN IF NOT EXISTS "deliveryAddress" TEXT;
ALTER TABLE "SportShopPurchase" ADD COLUMN IF NOT EXISTS "trackingNotes" TEXT;
ALTER TABLE "SportShopPurchase" ADD COLUMN IF NOT EXISTS "fulfilledAt" TIMESTAMP(3);

-- AlterTable Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "minStockThreshold" INTEGER NOT NULL DEFAULT 5;

-- CreateTable RacketStringing
CREATE TABLE IF NOT EXISTS "RacketStringing" (
    "id" TEXT NOT NULL,
    "userID" TEXT NOT NULL,
    "racketModel" TEXT NOT NULL,
    "sport" "CourtType" NOT NULL DEFAULT 'BADMINTON',
    "stringName" TEXT NOT NULL,
    "tensionLbs" DECIMAL(4,1) NOT NULL,
    "urgency" "ServiceUrgency" NOT NULL DEFAULT 'STANDARD',
    "price" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'VIRTUAL_CARD',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PAID',
    "status" "ServiceStatus" NOT NULL DEFAULT 'RECEIVED',
    "notes" TEXT,
    "stringerStaffId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estimatedReady" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "collectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RacketStringing_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "RacketStringing_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "RacketStringing_stringerStaffId_fkey" FOREIGN KEY ("stringerStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RacketStringing_userID_status_idx" ON "RacketStringing"("userID", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "RacketStringing_status_urgency_idx" ON "RacketStringing"("status", "urgency");
