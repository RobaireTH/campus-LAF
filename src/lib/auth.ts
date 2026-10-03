import "server-only";

export interface CurrentUser {
  id: string;
  name: string | null;
  role: "STUDENT" | "STAFF" | "LECTURER" | "ADMIN";
  kycStatus: "NOT_SUBMITTED" | "PENDING" | "VERIFIED" | "REJECTED";
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  return null;
}
