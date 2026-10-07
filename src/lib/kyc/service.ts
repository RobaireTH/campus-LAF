import { db } from "@/lib/db";
import { badRequest, conflict } from "@/lib/http/errors";
import { mediaKind, ownsUpload } from "@/lib/uploads/keys";

export async function submitVerification(userId: string, key: string) {
  if (!ownsUpload(key, userId, "kyc") || mediaKind(key) !== "IMAGE") {
    throw badRequest("Upload a photo of your school ID first.", { key: ["This file can't be used as an ID photo."] });
  }

  const submittedAt = new Date();
  const submitted = await db.user.updateMany({
    where: { id: userId, kycStatus: { in: ["NOT_SUBMITTED", "REJECTED"] } },
    data: { kycStatus: "PENDING", kycIdImageKey: key, kycSubmittedAt: submittedAt, kycRejectionReason: null },
  });
  if (submitted.count === 1) return { status: "PENDING" as const, submittedAt };

  const current = await db.user.findUniqueOrThrow({
    where: { id: userId },
    select: { kycStatus: true, kycIdImageKey: true, kycSubmittedAt: true },
  });
  if (current.kycStatus === "PENDING" && current.kycIdImageKey === key) {
    return { status: "PENDING" as const, submittedAt: current.kycSubmittedAt };
  }
  throw conflict(current.kycStatus === "VERIFIED" ? "Your ID is already verified." : "Your ID is already under review.");
}
