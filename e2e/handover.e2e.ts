import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { ApiClient } from "./support/client";
import { createClaim, createClaimScenario, createSignedInUser, createUser } from "./support/factories";

interface Handover {
  claimId: string;
  status: string;
  item: { id: string; title: string };
  contact: { name: string; role: "POSTER" | "CLAIMANT"; phone: string; whatsappUrl: string } | null;
  code: string | null;
  canComplete: boolean;
  canCancel: boolean;
}

interface HandoverBody {
  handover: Handover;
}

interface ErrorBody {
  error: string;
}

const whatsapp = (phone: string | null) => `https://wa.me/${(phone ?? "").replace("+", "")}`;

async function approvedScenario() {
  const scenario = await createClaimScenario();
  const approved = await scenario.posterClient.patch(`/api/claims/${scenario.claim.id}`, { decision: "APPROVE" });
  expect(approved.status).toBe(200);
  return scenario;
}

const handoverOf = (client: ApiClient, claimId: string) => client.get<HandoverBody & ErrorBody>(`/api/claims/${claimId}/handover`);
const act = (client: ApiClient, claimId: string, action: string) =>
  client.patch<HandoverBody & ErrorBody>(`/api/claims/${claimId}/handover`, { action });

describe("GET /api/claims/:id/handover", () => {
  it("gives the poster the claimant's name, phone and WhatsApp link and the shared code", async () => {
    const { posterClient, claimant, item, claim } = await approvedScenario();

    const result = await handoverOf(posterClient, claim.id);

    expect(result.status).toBe(200);
    expect(result.body.handover).toEqual({
      claimId: claim.id,
      status: "APPROVED",
      item: { id: item.id, title: item.title },
      contact: { name: "Claimant Person", role: "CLAIMANT", phone: claimant.phone, whatsappUrl: whatsapp(claimant.phone) },
      code: (await db.claim.findUniqueOrThrow({ where: { id: claim.id } })).handoverCode,
      canComplete: true,
      canCancel: true,
    });
  });

  it("gives the claimant the poster's contact and the same code, but never anyone's email", async () => {
    const { posterClient, claimantClient, poster, claimant, claim } = await approvedScenario();

    const asClaimant = await handoverOf(claimantClient, claim.id);
    const asPoster = await handoverOf(posterClient, claim.id);

    expect(asClaimant.body.handover.contact).toEqual({
      name: "Poster Person",
      role: "POSTER",
      phone: poster.phone,
      whatsappUrl: whatsapp(poster.phone),
    });
    expect(asClaimant.body.handover.code).toBe(asPoster.body.handover.code);
    expect(asClaimant.body.handover.code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
    expect(JSON.stringify(asClaimant.body)).not.toContain(poster.email);
    expect(JSON.stringify(asPoster.body)).not.toContain(claimant.email);
  });

  it("is closed to everyone else", async () => {
    const { claim } = await approvedScenario();
    const { client: verifiedStranger } = await createSignedInUser({ kycStatus: "VERIFIED" });
    const { client: unverifiedStranger } = await createSignedInUser();
    const { client: admin } = await createSignedInUser({ role: "ADMIN", kycStatus: "VERIFIED" });

    for (const client of [verifiedStranger, unverifiedStranger, admin]) {
      const result = await handoverOf(client, claim.id);
      expect(result.status).toBe(403);
      expect(JSON.stringify(result.body)).not.toContain("wa.me");
    }
    expect((await handoverOf(new ApiClient(), claim.id)).status).toBe(401);
    expect((await handoverOf(verifiedStranger, "does-not-exist")).status).toBe(404);
  });

  it.each(["PENDING", "REJECTED"] as const)("has nothing to show for a %s claim", async (status) => {
    const { posterClient, claimantClient, claim } = await createClaimScenario();
    await db.claim.update({ where: { id: claim.id }, data: { status } });

    for (const client of [posterClient, claimantClient]) {
      const result = await handoverOf(client, claim.id);
      expect(result.status).toBe(409);
      expect(result.body.error).toBe("Contact details are shared once the poster approves a claim.");
    }
  });

  it("keeps contact details out of every other response before and after approval", async () => {
    const { posterClient, claimantClient, poster, claimant, item, claim } = await createClaimScenario();
    const responsesFor = async () => [
      await posterClient.get(`/api/items/${item.id}/claims`),
      await posterClient.get(`/api/items/${item.id}`),
      await claimantClient.get(`/api/items/${item.id}`),
      await claimantClient.get("/api/me/claims"),
      await posterClient.get("/api/me/items"),
      await new ApiClient().get(`/api/items?q=${encodeURIComponent(item.title)}`),
    ];
    const secrets = [poster.email, poster.phone, claimant.email, claimant.phone].filter(Boolean) as string[];
    const noLeaks = (responses: Awaited<ReturnType<typeof responsesFor>>) => {
      for (const response of responses) {
        expect(response.status).toBe(200);
        for (const secret of secrets) expect(JSON.stringify(response.body)).not.toContain(secret);
      }
    };

    noLeaks(await responsesFor());
    await posterClient.patch(`/api/claims/${claim.id}`, { decision: "APPROVE" });
    noLeaks(await responsesFor());
  });
});

describe("PATCH /api/claims/:id/handover completing", () => {
  it.each(["poster", "claimant"] as const)("lets the %s mark the item returned", async (who) => {
    const scenario = await approvedScenario();
    const client = who === "poster" ? scenario.posterClient : scenario.claimantClient;

    const result = await act(client, scenario.claim.id, "COMPLETE");

    expect(result.status).toBe(200);
    expect(result.body.handover).toMatchObject({
      status: "RESOLVED",
      contact: null,
      code: null,
      canComplete: false,
      canCancel: false,
    });
    expect((await db.item.findUniqueOrThrow({ where: { id: scenario.item.id } })).status).toBe("RESOLVED");
    expect((await db.claim.findUniqueOrThrow({ where: { id: scenario.claim.id } })).status).toBe("APPROVED");
  });

  it("answers a repeat with the same result and then refuses to cancel", async () => {
    const { posterClient, claimantClient, claim } = await approvedScenario();
    const first = await act(posterClient, claim.id, "COMPLETE");

    const repeat = await act(claimantClient, claim.id, "COMPLETE");
    const lateCancel = await act(posterClient, claim.id, "CANCEL");

    expect(repeat.status).toBe(200);
    expect(repeat.body).toEqual(first.body);
    expect(lateCancel.status).toBe(409);
    expect(lateCancel.body.error).toBe("The item was already returned.");
  });

  it("stops showing contact details once the item is returned", async () => {
    const { posterClient, claimantClient, claim } = await approvedScenario();
    await act(posterClient, claim.id, "COMPLETE");

    for (const client of [posterClient, claimantClient]) {
      const result = await handoverOf(client, claim.id);
      expect(result.body.handover).toMatchObject({ status: "RESOLVED", contact: null, code: null });
    }
  });
});

describe("PATCH /api/claims/:id/handover cancelling", () => {
  it.each(["poster", "claimant"] as const)("lets the %s cancel, which reopens the item", async (who) => {
    const scenario = await approvedScenario();
    const rival = await createClaim(scenario.item.id, (await createUser()).id, { status: "REJECTED", decidedAt: new Date() });
    const client = who === "poster" ? scenario.posterClient : scenario.claimantClient;

    const result = await act(client, scenario.claim.id, "CANCEL");

    expect(result.status).toBe(200);
    expect(result.body.handover).toMatchObject({ status: "CANCELLED", contact: null, code: null, canComplete: false, canCancel: false });
    const cancelled = await db.claim.findUniqueOrThrow({ where: { id: scenario.claim.id } });
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.decidedAt).not.toBeNull();
    expect((await db.item.findUniqueOrThrow({ where: { id: scenario.item.id } })).status).toBe("OPEN");
    expect((await db.claim.findUniqueOrThrow({ where: { id: rival.id } })).status).toBe("REJECTED");
  });

  it("answers a repeat with the same result and then refuses to complete", async () => {
    const { posterClient, claimantClient, claim } = await approvedScenario();
    const first = await act(claimantClient, claim.id, "CANCEL");

    const repeat = await act(posterClient, claim.id, "CANCEL");
    const lateComplete = await act(posterClient, claim.id, "COMPLETE");

    expect(repeat.status).toBe(200);
    expect(repeat.body).toEqual(first.body);
    expect(lateComplete.status).toBe(409);
    expect(lateComplete.body.error).toBe("This handover was cancelled.");
  });

  it("opens the item to claims and edits again, including from the same claimant", async () => {
    const { posterClient, claimantClient, item, claim } = await approvedScenario();
    expect((await posterClient.patch(`/api/items/${item.id}`, { title: "Blocked while claimed" })).status).toBe(409);

    await act(posterClient, claim.id, "CANCEL");

    expect((await posterClient.patch(`/api/items/${item.id}`, { title: "Editable again" })).status).toBe(200);
    const again = await claimantClient.post<{ status: string }>(`/api/items/${item.id}/claims`, {
      description: "Black strap, my initials AO are stitched inside the lining",
    });
    expect(again.status).toBe(201);
    expect(again.body.status).toBe("PENDING");
  });

  it("lets the cancelled handover be read but shows nothing private", async () => {
    const { posterClient, claimantClient, claim } = await approvedScenario();
    await act(posterClient, claim.id, "CANCEL");

    for (const client of [posterClient, claimantClient]) {
      const result = await handoverOf(client, claim.id);
      expect(result.status).toBe(200);
      expect(result.body.handover).toMatchObject({ status: "CANCELLED", contact: null, code: null });
    }
  });

  it("settles a completion racing a cancellation", async () => {
    const { posterClient, claimantClient, item, claim } = await approvedScenario();

    const results = await Promise.all([act(posterClient, claim.id, "COMPLETE"), act(claimantClient, claim.id, "CANCEL")]);

    expect(results.map((result) => result.status).sort()).toEqual([200, 409]);
    const claimStatus = (await db.claim.findUniqueOrThrow({ where: { id: claim.id } })).status;
    const itemStatus = (await db.item.findUniqueOrThrow({ where: { id: item.id } })).status;
    expect([claimStatus, itemStatus]).toEqual(claimStatus === "APPROVED" ? ["APPROVED", "RESOLVED"] : ["CANCELLED", "OPEN"]);
  });
});

describe("PATCH /api/claims/:id/handover authorization and input", () => {
  it("is limited to the two people involved", async () => {
    const { claim, item } = await approvedScenario();
    const { client: stranger } = await createSignedInUser({ kycStatus: "VERIFIED" });
    const { client: admin } = await createSignedInUser({ role: "ADMIN", kycStatus: "VERIFIED" });

    for (const client of [stranger, admin]) {
      expect((await act(client, claim.id, "COMPLETE")).status).toBe(403);
      expect((await act(client, claim.id, "CANCEL")).status).toBe(403);
    }
    expect((await act(new ApiClient(), claim.id, "CANCEL")).status).toBe(401);
    expect((await act(stranger, "does-not-exist", "CANCEL")).status).toBe(404);
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("CLAIMED");
  });

  it("does nothing for a claim that was never approved", async () => {
    const { posterClient, claim, item } = await createClaimScenario();

    for (const action of ["COMPLETE", "CANCEL"]) {
      expect((await act(posterClient, claim.id, action)).status).toBe(409);
    }
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("OPEN");
  });

  it.each([
    ["a missing action", {}],
    ["lower case", { action: "complete" }],
    ["an unknown action", { action: "RESOLVE" }],
    ["an extra field", { action: "CANCEL", code: "ABC234" }],
  ])("rejects %s", async (_label, body) => {
    const { posterClient, claim } = await approvedScenario();

    expect((await posterClient.patch<ErrorBody>(`/api/claims/${claim.id}/handover`, body)).status).toBe(400);
  });

  it("blocks a foreign Origin", async () => {
    const { posterClient, claim, item } = await approvedScenario();

    const result = await posterClient.patch(`/api/claims/${claim.id}/handover`, { action: "CANCEL" }, { origin: "https://evil.example" });

    expect(result.status).toBe(403);
    expect((await db.item.findUniqueOrThrow({ where: { id: item.id } })).status).toBe("CLAIMED");
  });
});
