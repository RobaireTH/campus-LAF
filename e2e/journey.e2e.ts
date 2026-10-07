import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { ApiClient } from "./support/client";
import { createSignedInUser, newItemPayload } from "./support/factories";

interface Detail {
  id: string;
  title: string;
  status: string;
  myClaim: { id: string; status: string } | null;
  claimCount: number;
}

interface ListBody {
  items: { id: string; status: string }[];
}

describe("the full return journey over HTTP", () => {
  it("takes a found item from report to returned", async () => {
    const { client: poster } = await createSignedInUser({ name: "Poster Person", kycStatus: "VERIFIED" });
    const { client: claimant } = await createSignedInUser({ name: "Claimant Person", kycStatus: "VERIFIED" });
    const visitor = new ApiClient();

    const created = await poster.post<{ item: Detail }>("/api/items", await newItemPayload({ title: "Journey flask" }), {
      headers: { "idempotency-key": `key-${randomUUID()}` },
    });
    expect(created.status).toBe(201);
    const itemId = created.body.item.id;

    expect((await visitor.get<{ items: { id: string }[] }>("/api/items?q=Journey%20flask")).body.items.map((i) => i.id)).toContain(itemId);
    expect((await claimant.get<{ item: Detail }>(`/api/items/${itemId}`)).body.item.myClaim).toBeNull();

    const submitted = await claimant.post<{ id: string; status: string }>(`/api/items/${itemId}/claims`, {
      description: "It has a dent near the lid and my initials scratched on the base",
    });
    expect(submitted.status).toBe(201);
    const claimId = submitted.body.id;

    expect((await poster.get<{ item: Detail }>(`/api/items/${itemId}`)).body.item.claimCount).toBe(1);
    const review = await poster.get<{ claims: { id: string; status: string }[] }>(`/api/items/${itemId}/claims`);
    expect(review.body.claims).toMatchObject([{ id: claimId, status: "PENDING" }]);

    expect((await poster.patch(`/api/claims/${claimId}`, { decision: "APPROVE" })).status).toBe(200);

    const afterApproval = await claimant.get<{ item: Detail }>(`/api/items/${itemId}`);
    expect(afterApproval.body.item).toMatchObject({ status: "CLAIMED", myClaim: { id: claimId, status: "APPROVED" } });
    expect((await visitor.get<ListBody>("/api/items?status=CLAIMED&q=Journey%20flask")).body.items.map((i) => i.id)).toContain(itemId);
    expect((await visitor.get<ListBody>("/api/items?q=Journey%20flask")).body.items.map((i) => i.id)).not.toContain(itemId);

    const posterView = await poster.get<{ handover: { code: string; contact: { name: string } } }>(`/api/claims/${claimId}/handover`);
    const claimantView = await claimant.get<{ handover: { code: string; contact: { name: string } } }>(`/api/claims/${claimId}/handover`);
    expect(posterView.body.handover.contact.name).toBe("Claimant Person");
    expect(claimantView.body.handover.contact.name).toBe("Poster Person");
    expect(posterView.body.handover.code).toBe(claimantView.body.handover.code);

    expect((await claimant.patch(`/api/claims/${claimId}/handover`, { action: "COMPLETE" })).status).toBe(200);

    expect((await visitor.get<ListBody>("/api/items?status=RESOLVED&q=Journey%20flask")).body.items.map((i) => i.id)).toContain(itemId);
    expect((await poster.get<ListBody>("/api/me/items")).body.items.find((item) => item.id === itemId)?.status).toBe("RESOLVED");
    expect((await claimant.get<{ claims: { id: string; status: string }[] }>("/api/me/claims")).body.claims[0]).toMatchObject({
      id: claimId,
      status: "APPROVED",
    });
  });
});
