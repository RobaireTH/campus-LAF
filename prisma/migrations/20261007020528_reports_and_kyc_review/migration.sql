-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('OPEN', 'DISMISSED', 'ACTIONED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "kycReviewedAt" TIMESTAMP(3),
ADD COLUMN     "kycReviewedById" TEXT;

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "itemId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "decidedById" TEXT,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Report_status_createdAt_idx" ON "Report"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Report_itemId_reporterId_key" ON "Report"("itemId", "reporterId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_kycReviewedById_fkey" FOREIGN KEY ("kycReviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
