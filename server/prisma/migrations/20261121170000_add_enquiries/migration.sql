-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'QUOTE_SENT', 'CONVERTED', 'CLOSED_LOST');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Enquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "sportOfInterest" "CourtType",
    "membershipOfInterest" "Membership",
    "message" TEXT,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "isTrialRequested" BOOLEAN NOT NULL DEFAULT false,
    "preferredTrialDate" TIMESTAMP(3),
    "preferredTrialTime" TEXT,
    "notes" TEXT,
    "quoteAmount" DECIMAL(10,2),
    "quoteDetails" TEXT,
    "quoteSentAt" TIMESTAMP(3),
    "convertedUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Enquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Enquiry_status_createdAt_idx" ON "Enquiry"("status", "createdAt");
CREATE INDEX IF NOT EXISTS "Enquiry_email_idx" ON "Enquiry"("email");
CREATE INDEX IF NOT EXISTS "Enquiry_phone_idx" ON "Enquiry"("phone");
