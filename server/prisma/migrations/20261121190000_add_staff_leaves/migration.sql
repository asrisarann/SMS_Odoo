-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "LeaveType" AS ENUM ('CASUAL', 'SICK', 'ANNUAL', 'EMERGENCY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "LeaveStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "annualLeaveQuota" INTEGER NOT NULL DEFAULT 18;
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "sickLeaveQuota" INTEGER NOT NULL DEFAULT 12;

-- CreateTable
CREATE TABLE IF NOT EXISTS "StaffLeave" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "leaveType" "LeaveType" NOT NULL DEFAULT 'CASUAL',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "daysCount" INTEGER NOT NULL DEFAULT 1,
    "reason" TEXT NOT NULL,
    "status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "coverStaffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffLeave_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "StaffLeave_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StaffLeave_coverStaffId_fkey" FOREIGN KEY ("coverStaffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StaffLeave_staffId_status_idx" ON "StaffLeave"("staffId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "StaffLeave_startDate_endDate_idx" ON "StaffLeave"("startDate", "endDate");
