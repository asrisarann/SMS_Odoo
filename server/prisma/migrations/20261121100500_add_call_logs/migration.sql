-- CreateEnum
CREATE TYPE "CallType" AS ENUM ('INCOMING', 'OUTGOING');

-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "callerName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "callType" "CallType" NOT NULL,
    "purpose" TEXT NOT NULL,
    "notes" TEXT,
    "callTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);
