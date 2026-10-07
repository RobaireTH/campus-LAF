import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { createItem, createSignedInUser, createUser } from "./support/factories";

describe("rate limit counters", () => {
  it("are stored in the schema the app runs on and count every request", async () => {
    const { user, client } = await createSignedInUser();
    const item = await createItem((await createUser()).id);
    const key = `report:create:${user.id}`;

    await client.post(`/api/items/${item.id}/reports`, { reason: "spam" });
    expect((await db.rateLimit.findUnique({ where: { key } }))?.count).toBe(1);

    await client.post(`/api/items/${item.id}/reports`, { reason: "spam" });
    expect((await db.rateLimit.findUnique({ where: { key } }))?.count).toBe(2);
  });
});
