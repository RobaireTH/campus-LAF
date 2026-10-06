const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
const response = await fetch(`${baseUrl}/api/items`);
const bodyText = await response.text();

let body;
try {
  body = JSON.parse(bodyText);
} catch {
  throw new Error(`Expected JSON response, got: ${bodyText}`);
}

if (response.status === 200) {
  if (!Array.isArray(body.items)) {
    throw new Error("Expected successful response body to include items array");
  }

  console.log("GET /api/items returned items successfully");
} else if (response.status === 503) {
  if (body.error !== "Database unavailable") {
    throw new Error("Expected database outage response to explain availability");
  }

  console.log("GET /api/items handled database outage with 503");
} else {
  throw new Error(
    `Expected 200 or 503 from /api/items, got ${response.status}: ${bodyText}`,
  );
}
