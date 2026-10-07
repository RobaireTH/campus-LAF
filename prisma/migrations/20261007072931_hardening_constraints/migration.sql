-- DropTable
DROP TABLE "VerificationToken";

-- CreateIndex
CREATE INDEX "RateLimit_resetAt_idx" ON "RateLimit"("resetAt");

ALTER TABLE "Claim" ADD CONSTRAINT "Claim_approved_has_handover_code" CHECK ("status" <> 'APPROVED' OR "handoverCode" IS NOT NULL);

ALTER TABLE "Report" ADD CONSTRAINT "Report_decided_has_decision_time" CHECK ("status" = 'OPEN' OR "decidedAt" IS NOT NULL);
