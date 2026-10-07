export class AuthRequiredError extends Error {}

export async function uploadFile(file: File, purpose: "item" | "claim" | "kyc") {
  const response = await fetch("/api/uploads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose, contentType: file.type, size: file.size }),
  });
  if (response.status === 401) throw new AuthRequiredError("Sign in to upload files.");
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Could not prepare an upload.");
  const result = await response.json();
  const sent = await fetch(result.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file }).catch(
    () => null,
  );
  if (!sent) throw new Error("Could not reach the upload service. Check your connection and try again.");
  if (!sent.ok) throw new Error("A file could not be uploaded.");
  return result.key as string;
}
