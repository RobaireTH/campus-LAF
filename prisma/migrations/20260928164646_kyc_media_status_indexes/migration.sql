/*
  Warnings:

  - You are about to drop the column `proofImage` on the `Claim` table. All the data in the column will be lost.
  - You are about to drop the column `proofVideo` on the `Claim` table. All the data in the column will be lost.
  - You are about to drop the column `imageUrl` on the `Item` table. All the data in the column will be lost.
  - You are about to drop the column `videoUrl` on the `Item` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_SUBMITTED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'VIDEO');

-- AlterEnum
ALTER TYPE "ItemStatus" ADD VALUE 'REMOVED';

-- DropIndex
DROP INDEX "Item_type_status_categoryId_idx";

-- AlterTable
ALTER TABLE "Claim" DROP COLUMN "proofImage",
DROP COLUMN "proofVideo",
ADD COLUMN     "decidedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Item" DROP COLUMN "imageUrl",
DROP COLUMN "videoUrl";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "kycIdImageKey" TEXT,
ADD COLUMN     "kycStatus" "KycStatus" NOT NULL DEFAULT 'NOT_SUBMITTED';

-- CreateTable
CREATE TABLE "ItemMedia" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "itemId" TEXT NOT NULL,

    CONSTRAINT "ItemMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClaimMedia" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" "MediaType" NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimId" TEXT NOT NULL,

    CONSTRAINT "ClaimMedia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ItemMedia_key_key" ON "ItemMedia"("key");

-- CreateIndex
CREATE INDEX "ItemMedia_itemId_idx" ON "ItemMedia"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "ClaimMedia_key_key" ON "ClaimMedia"("key");

-- CreateIndex
CREATE INDEX "ClaimMedia_claimId_idx" ON "ClaimMedia"("claimId");

-- CreateIndex
CREATE INDEX "Claim_itemId_idx" ON "Claim"("itemId");

-- CreateIndex
CREATE INDEX "Claim_claimantId_idx" ON "Claim"("claimantId");

-- CreateIndex
CREATE INDEX "Item_status_idx" ON "Item"("status");

-- CreateIndex
CREATE INDEX "Item_type_idx" ON "Item"("type");

-- CreateIndex
CREATE INDEX "Item_categoryId_idx" ON "Item"("categoryId");

-- CreateIndex
CREATE INDEX "Item_locationId_idx" ON "Item"("locationId");

-- CreateIndex
CREATE INDEX "Item_createdAt_idx" ON "Item"("createdAt");

-- CreateIndex
CREATE INDEX "User_kycStatus_idx" ON "User"("kycStatus");

-- AddForeignKey
ALTER TABLE "ItemMedia" ADD CONSTRAINT "ItemMedia_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClaimMedia" ADD CONSTRAINT "ClaimMedia_claimId_fkey" FOREIGN KEY ("claimId") REFERENCES "Claim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Claim_one_approved_per_item"
ON "Claim"("itemId")
WHERE "status" = 'APPROVED';