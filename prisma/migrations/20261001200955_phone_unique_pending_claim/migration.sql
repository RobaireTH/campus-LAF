/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

CREATE UNIQUE INDEX "Claim_one_pending_per_user_per_item"
ON "Claim"("itemId", "claimantId")
WHERE "status" = 'PENDING';