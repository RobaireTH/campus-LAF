-- AlterTable
ALTER TABLE "User" ADD COLUMN     "kycRejectionReason" TEXT,
ADD COLUMN     "kycSubmittedAt" TIMESTAMP(3);
