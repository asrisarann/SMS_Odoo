-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT', 'REFUND');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "PaymentMethod" AS ENUM ('VIRTUAL_CARD', 'CASH', 'CARD', 'UPI', 'ONLINE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TransactionModule" AS ENUM ('COURT', 'SHOP', 'CAFE', 'WALLET_TOPUP', 'MEMBERSHIP');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "WalletTransaction" (
    "id" TEXT NOT NULL,
    "userID" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "balanceAfter" DECIMAL(10,2) NOT NULL,
    "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'VIRTUAL_CARD',
    "module" "TransactionModule" NOT NULL DEFAULT 'WALLET_TOPUP',
    "referenceId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "WalletTransaction_userID_fkey" FOREIGN KEY ("userID") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "WalletTransaction_userID_createdAt_idx" ON "WalletTransaction"("userID", "createdAt");
CREATE INDEX IF NOT EXISTS "WalletTransaction_phone_idx" ON "WalletTransaction"("phone");
CREATE INDEX IF NOT EXISTS "WalletTransaction_paymentMethod_createdAt_idx" ON "WalletTransaction"("paymentMethod", "createdAt");
CREATE INDEX IF NOT EXISTS "WalletTransaction_module_createdAt_idx" ON "WalletTransaction"("module", "createdAt");
