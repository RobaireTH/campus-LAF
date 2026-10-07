import { db } from "@/lib/db";
import { logError } from "@/lib/http/log";

export async function databaseIsUp() {
  try {
    await db.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logError("Health check failed", error);
    return false;
  }
}
