import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { buildObjectKey } from "@/lib/uploads/keys";

import { ApiClient } from "./support/client";
import {
  createAdmin,
  createClaim,
  createClaimScenario,
  createItem,
  createPendingVerification,
  createSignedInUser,
  createUser,
} from "./support/factories";

const NOT_FOUND = "NEXT_HTTP_ERROR_FALLBACK;404";

const SELECTED_POSTS_TAB = /role="tab" aria-selected="true"[^>]*trigger-posts/;
const SELECTED_CLAIMS_TAB = /role="tab" aria-selected="true"[^>]*trigger-claims/;

const page = (client: ApiClient, path: string) => client.get<string>(path);
const tag = () => randomUUID().slice(0, 8);

async function approvedScenario() {
  const scenario = await createClaimScenario();
  const approved = await scenario.posterClient.patch(`/api/claims/${scenario.claim.id}`, { decision: "APPROVE" });
  expect(approved.status).toBe(200);
  const { handoverCode } = await db.claim.findUniqueOrThrow({ where: { id: scenario.claim.id } });
  return { ...scenario, code: handoverCode as string };
}

function proofFiles(claimantId: string) {
  return {
    create: [
      { key: buildObjectKey("claim", claimantId, "image/jpeg"), type: "IMAGE" as const, position: 0 },
      { key: buildObjectKey("claim", claimantId, "image/png"), type: "IMAGE" as const, position: 1 },
    ],
  };
}

describe("the claim page", () => {
  it("asks an unverified user to verify their ID first", async () => {
    const item = await createItem((await createUser()).id);
    const { client } = await createSignedInUser({ kycStatus: "NOT_SUBMITTED" });

    const result = await page(client, `/items/${item.id}/claim`);

    expect(result.body).toContain("Verify your student ID");
    expect(result.body).not.toContain("Ownership details");
  });

  it("shows a verified user what they are claiming and asks for proof of ownership of a found item", async () => {
    const item = await createItem((await createUser()).id, { type: "FOUND", title: `Found flask ${tag()}` });
    const { client } = await createSignedInUser({ kycStatus: "VERIFIED" });

    const result = await page(client, `/items/${item.id}/claim`);

    expect(result.body).toContain(item.title);
    expect(result.body).toContain("Claim this item");
    expect(result.body).toContain("Ownership details");
    expect(result.body).toContain("Submit claim");
    expect(result.body).not.toContain("Verify your student ID");
  });

  it("asks a finder where they found a lost item and where it is now", async () => {
    const item = await createItem((await createUser()).id, { type: "LOST" });
    const { client } = await createSignedInUser({ kycStatus: "VERIFIED" });

    const result = await page(client, `/items/${item.id}/claim`);

    expect(result.body).toContain("I found this");
    expect(result.body).toContain("What you found");
    expect(result.body).not.toContain("Ownership details");
  });

  it("sends the poster to the claims instead of showing the form", async () => {
    const { user, client } = await createSignedInUser({ kycStatus: "VERIFIED" });
    const item = await createItem(user.id);

    const result = await page(client, `/items/${item.id}/claim`);

    expect(result.body).toContain("This is your post");
    expect(result.body).toContain(`href="/items/${item.id}/claims"`);
    expect(result.body).not.toContain("Submit claim");
  });

  it("says a claim was already sent while it is waiting", async () => {
    const { user, client } = await createSignedInUser({ kycStatus: "VERIFIED" });
    const item = await createItem((await createUser()).id);
    await createClaim(item.id, user.id);

    const result = await page(client, `/items/${item.id}/claim`);

    expect(result.body).toContain("You already sent a claim");
    expect(result.body).toContain('href="/dashboard?tab=claims"');
    expect(result.body).not.toContain("Submit claim");
  });

  it("points an approved claimant at the handover", async () => {
    const { claimantClient, claim } = await approvedScenario();

    const result = await page(claimantClient, `/items/${claim.itemId}/claim`);

    expect(result.body).toContain("Your claim was approved");
    expect(result.body).toContain(`href="/claims/${claim.id}"`);
    expect(result.body).not.toContain("Submit claim");
  });

  it("lets someone try again after their claim was rejected", async () => {
    const { user, client } = await createSignedInUser({ kycStatus: "VERIFIED" });
    const item = await createItem((await createUser()).id, { type: "FOUND" });
    await createClaim(item.id, user.id, { status: "REJECTED", decidedAt: new Date() });

    const result = await page(client, `/items/${item.id}/claim`);

    expect(result.body).toContain("Submit claim");
  });

  it.each([
    ["CLAIMED", "A claim was already approved"],
    ["RESOLVED", "This item was already returned"],
  ] as const)("explains that a %s post can't be claimed", async (status, text) => {
    const item = await createItem((await createUser()).id, { status });
    const { client } = await createSignedInUser({ kycStatus: "VERIFIED" });

    const result = await page(client, `/items/${item.id}/claim`);

    expect(result.body).toContain(text);
    expect(result.body).not.toContain("Submit claim");
  });

  it("looks like nothing is there for a removed or missing post", async () => {
    const removed = await createItem((await createUser()).id, { status: "REMOVED" });
    const { client } = await createSignedInUser({ kycStatus: "VERIFIED" });

    expect((await page(client, `/items/${removed.id}/claim`)).body).toContain(NOT_FOUND);
    expect((await page(client, "/items/does-not-exist/claim")).body).toContain(NOT_FOUND);
  });
});

describe("the claim sent page", () => {
  it("confirms the claim in the words of the kind of post", async () => {
    const found = await createItem((await createUser()).id, { type: "FOUND", title: `Sent found ${tag()}` });
    const lost = await createItem((await createUser()).id, { type: "LOST" });
    const { client } = await createSignedInUser({ kycStatus: "VERIFIED" });

    const forFound = await page(client, `/items/${found.id}/claim/sent`);
    const forLost = await page(client, `/items/${lost.id}/claim/sent`);

    expect(forFound.body).toContain("Claim sent");
    expect(forFound.body).toContain(found.title);
    expect(forFound.body).toContain("review your ownership details");
    expect(forLost.body).toContain("review what you found");
    expect(forFound.body).toContain('href="/dashboard?tab=claims"');
  });

  it("asks an unverified user to verify and hides a missing post", async () => {
    const item = await createItem((await createUser()).id);
    const { client: unverified } = await createSignedInUser({ kycStatus: "NOT_SUBMITTED" });
    const { client: verified } = await createSignedInUser({ kycStatus: "VERIFIED" });

    expect((await page(unverified, `/items/${item.id}/claim/sent`)).body).toContain("Verify your student ID");
    expect((await page(verified, "/items/does-not-exist/claim/sent")).body).toContain(NOT_FOUND);
  });
});

describe("the review claims page", () => {
  it("lists each claim for the poster with its details, proof and the decision buttons", async () => {
    const { user: poster, client } = await createSignedInUser();
    const item = await createItem(poster.id, { type: "FOUND", title: `Rucksack ${tag()}` });
    const claimant = await createUser({ name: `Tunde ${tag()}`, kycStatus: "VERIFIED" });
    await createClaim(item.id, claimant.id, {
      proofText: "There is a blue keyring inside the front pocket.",
      media: proofFiles(claimant.id),
    });

    const result = await page(client, `/items/${item.id}/claims`);

    expect(result.body).toContain(item.title);
    expect(result.body).toContain(claimant.name as string);
    expect(result.body).toContain("Verified student");
    expect(result.body).toContain("blue keyring inside the front pocket");
    expect(result.body).toContain("Needs your review");
    expect(result.body).toContain("Compare private ownership details");
    expect(result.body).toContain("Enlarge Proof 1 of 2");
    expect(result.body).toContain("Enlarge Proof 2 of 2");
    expect(result.body).toContain("Approve claim");
    expect(result.body).toContain("Reject");
  });

  it("tells the owner of a lost item to compare what the finders say", async () => {
    const { user: poster, client } = await createSignedInUser();
    const item = await createItem(poster.id, { type: "LOST" });
    await createClaim(item.id, (await createUser()).id);

    const result = await page(client, `/items/${item.id}/claims`);

    expect(result.body).toContain("Compare what each finder tells you");
  });

  it("shows pending claims first and takes the buttons away from decided ones", async () => {
    const { user: poster, client } = await createSignedInUser();
    const item = await createItem(poster.id);
    const rejected = await createUser({ name: `Rejected ${tag()}` });
    const pending = await createUser({ name: `Pending ${tag()}` });
    await createClaim(item.id, rejected.id, { status: "REJECTED", decidedAt: new Date() });
    await createClaim(item.id, pending.id);

    const { body } = await page(client, `/items/${item.id}/claims`);

    expect(body.indexOf(pending.name as string)).toBeLessThan(body.indexOf(rejected.name as string));
    expect(body).toContain("Not approved");
    expect(body.match(/Approve claim/g)).toHaveLength(1);
  });

  it("points an approved claim at its handover and says the poster already approved one", async () => {
    const { posterClient, claim } = await approvedScenario();

    const { body } = await page(posterClient, `/items/${claim.itemId}/claims`);

    expect(body).toContain("You approved a claim");
    expect(body).toContain("Contact and handover");
    expect(body).toContain(`href="/claims/${claim.id}"`);
    expect(body).not.toContain("Approve claim");
  });

  it("says so when nobody has claimed the post", async () => {
    const { user, client } = await createSignedInUser();
    const item = await createItem(user.id);

    expect((await page(client, `/items/${item.id}/claims`)).body).toContain("No claims yet");
  });

  it("looks like nothing is there to anyone but the poster, even the claimant and an admin", async () => {
    const { claimantClient, claim } = await createClaimScenario();
    const { client: stranger } = await createSignedInUser();
    const { client: admin } = await createAdmin();
    const path = `/items/${claim.itemId}/claims`;

    expect((await page(claimantClient, path)).body).toContain(NOT_FOUND);
    expect((await page(stranger, path)).body).toContain(NOT_FOUND);
    expect((await page(admin, path)).body).toContain(NOT_FOUND);
    expect((await page(stranger, "/items/does-not-exist/claims")).body).toContain(NOT_FOUND);
  });
});

describe("the handover page", () => {
  it("shows the poster the claimant's contact, the shared code and what they can do", async () => {
    const { posterClient, claimant, code } = await approvedScenario();

    const { body } = await page(posterClient, `/claims/${(await db.claim.findFirstOrThrow({ where: { handoverCode: code } })).id}`);

    expect(body).toContain("Contact and handover");
    expect(body).toContain("Claimant Person");
    expect(body).toContain("Sent the claim");
    expect(body).toContain(claimant.phone as string);
    expect(body).toContain(`https://wa.me/${(claimant.phone as string).replace("+", "")}`);
    expect(body).toContain(code);
    expect(body).toContain("Mark as returned");
    expect(body).toContain("Cancel handover");
  });

  it("shows the claimant the poster's contact and the same code", async () => {
    const { claimantClient, poster, claim, code } = await approvedScenario();

    const { body } = await page(claimantClient, `/claims/${claim.id}`);

    expect(body).toContain("Poster Person");
    expect(body).toContain("Posted this item");
    expect(body).toContain(poster.phone as string);
    expect(body).toContain(code);
  });

  it("never shows an email address", async () => {
    const { claimantClient, posterClient, poster, claimant, claim } = await approvedScenario();

    expect((await page(claimantClient, `/claims/${claim.id}`)).body).not.toContain(poster.email);
    expect((await page(posterClient, `/claims/${claim.id}`)).body).not.toContain(claimant.email);
  });

  it("looks like nothing is there to anyone else, and keeps the code and phone numbers from them", async () => {
    const { poster, claim, code } = await approvedScenario();
    const { client: stranger } = await createSignedInUser();
    const { client: admin } = await createAdmin();

    for (const client of [stranger, admin]) {
      const { body } = await page(client, `/claims/${claim.id}`);
      expect(body).toContain(NOT_FOUND);
      expect(body).not.toContain(code);
      expect(body).not.toContain(poster.phone as string);
    }
    expect((await page(stranger, "/claims/does-not-exist")).body).toContain(NOT_FOUND);
  });

  it("explains that the details come with the poster's approval while the claim is pending", async () => {
    const { claimantClient, posterClient, claim } = await createClaimScenario();

    expect((await page(claimantClient, `/claims/${claim.id}`)).body).toContain("Not available yet");
    expect((await page(posterClient, `/claims/${claim.id}`)).body).toContain("Not available yet");
  });

  it("celebrates the return and stops sharing contact details", async () => {
    const { claimantClient, posterClient, claimant, claim, code } = await approvedScenario();
    expect((await posterClient.patch(`/api/claims/${claim.id}/handover`, { action: "COMPLETE" })).status).toBe(200);

    for (const client of [claimantClient, posterClient]) {
      const { body } = await page(client, `/claims/${claim.id}`);
      expect(body).toContain("Item returned");
      expect(body).not.toContain(code);
      expect(body).not.toContain(claimant.phone as string);
      expect(body).not.toContain("Mark as returned");
    }
  });

  it("says the handover was cancelled and stops sharing contact details", async () => {
    const { claimantClient, posterClient, poster, claim, code } = await approvedScenario();
    expect((await claimantClient.patch(`/api/claims/${claim.id}/handover`, { action: "CANCEL" })).status).toBe(200);

    for (const client of [claimantClient, posterClient]) {
      const { body } = await page(client, `/claims/${claim.id}`);
      expect(body).toContain("Handover cancelled");
      expect(body).not.toContain(code);
      expect(body).not.toContain(poster.phone as string);
    }
  });
});

describe("the dashboard", () => {
  it("shows what needs the poster: claims to review and handovers in progress", async () => {
    const { user, client } = await createSignedInUser();
    const reviewing = await createItem(user.id, { title: `Reviewing ${tag()}` });
    const handedOver = await createItem(user.id, { title: `Handed over ${tag()}`, status: "CLAIMED" });
    const returned = await createItem(user.id, { title: `Returned ${tag()}`, status: "RESOLVED" });
    const removed = await createItem(user.id, { title: `Removed ${tag()}`, status: "REMOVED" });
    await createClaim(reviewing.id, (await createUser()).id);
    await createClaim(reviewing.id, (await createUser()).id);
    await createClaim(reviewing.id, (await createUser()).id, { status: "REJECTED", decidedAt: new Date() });
    const approved = await createClaim(handedOver.id, (await createUser()).id, { status: "APPROVED", decidedAt: new Date() });

    const { body } = await page(client, "/dashboard");

    expect(body).toContain(reviewing.title);
    expect(body).toContain(handedOver.title);
    expect(body).toContain(returned.title);
    expect(body).not.toContain(removed.title);
    expect(body).toContain("Review 2 claims");
    expect(body).toContain(`href="/items/${reviewing.id}/claims"`);
    expect(body).toContain("Open handover");
    expect(body).toContain(`href="/claims/${approved.id}"`);
    expect(body).toMatch(/>2<\/p><p[^>]*>Claims to review</);
    expect(body).toMatch(/>2<\/p><p[^>]*>Active posts</);
    expect(body).toMatch(/>1<\/p><p[^>]*>Items returned</);
  });

  it("shows how each of my claims is going on the claims tab", async () => {
    const { user, client } = await createSignedInUser({ kycStatus: "VERIFIED" });
    const poster = await createUser();
    const waiting = await createItem(poster.id, { title: `Waiting ${tag()}` });
    const approved = await createItem(poster.id, { title: `Approved ${tag()}`, status: "CLAIMED" });
    const turnedDown = await createItem(poster.id, { title: `Turned down ${tag()}` });
    await createClaim(waiting.id, user.id);
    const approvedClaim = await createClaim(approved.id, user.id, { status: "APPROVED", decidedAt: new Date() });
    await createClaim(turnedDown.id, user.id, { status: "REJECTED", decidedAt: new Date() });

    const { body } = await page(client, "/dashboard?tab=claims");

    expect(body).toContain(waiting.title);
    expect(body).toContain("Waiting for the poster");
    expect(body).toContain(approved.title);
    expect(body).toContain(`href="/claims/${approvedClaim.id}"`);
    expect(body).toContain(turnedDown.title);
    expect(body).toContain("Not approved");
    expect(body).toContain(`href="/items/${waiting.id}"`);
  });

  it("opens on the posts tab unless the claims tab is asked for", async () => {
    const { user, client } = await createSignedInUser({ kycStatus: "VERIFIED" });
    const mine = await createItem(user.id, { title: `Mine ${tag()}` });
    const theirs = await createItem((await createUser()).id, { title: `Theirs ${tag()}` });
    await createClaim(theirs.id, user.id);

    const posts = await page(client, "/dashboard");
    const claims = await page(client, "/dashboard?tab=claims");
    const unknown = await page(client, "/dashboard?tab=nonsense");

    expect(posts.body).toMatch(SELECTED_POSTS_TAB);
    expect(posts.body).toContain(`href="/items/${mine.id}"`);
    expect(posts.body).not.toContain(`href="/items/${theirs.id}"`);
    expect(claims.body).toMatch(SELECTED_CLAIMS_TAB);
    expect(claims.body).toContain(`href="/items/${theirs.id}"`);
    expect(claims.body).not.toContain(`href="/items/${mine.id}"`);
    expect(unknown.body).toMatch(SELECTED_POSTS_TAB);
  });

  it("keeps the claims tab through login", async () => {
    const result = await page(new ApiClient(), "/dashboard?tab=claims");

    expect(result.body).toContain(encodeURIComponent("/dashboard?tab=claims"));
  });

  it("says so when there is nothing yet", async () => {
    const { client } = await createSignedInUser();

    expect((await page(client, "/dashboard")).body).toContain("No posts yet");
    expect((await page(client, "/dashboard?tab=claims")).body).toContain("No claims yet");
  });
});

describe("the moderation page", () => {
  it("shows an admin the IDs waiting, with the photo to open and the decisions", async () => {
    const { user } = await createPendingVerification(new Date(2000, 0, 1));
    const name = `Waiting ${tag()}`;
    await db.user.update({ where: { id: user.id }, data: { name } });
    const { client: admin } = await createAdmin();

    const { body } = await page(admin, "/admin?tab=verification");

    expect(body).toContain(name);
    expect(body).toContain(user.email);
    expect(body).toContain(`Enlarge ID photo of ${name} 1 of 1`);
    expect(body).toContain("Approve");
    expect(body).toContain("Reject");
  });

  it("shows an admin the reports waiting with the reason and the decisions", async () => {
    const poster = await createUser();
    const reporter = await createUser({ name: `Reporter ${tag()}` });
    const item = await createItem(poster.id, { title: `Reported ${tag()}` });
    await db.report.create({
      data: { itemId: item.id, reporterId: reporter.id, reason: "spam", details: "Selling phones.", createdAt: new Date(2000, 0, 1) },
    });
    const { client: admin } = await createAdmin();

    const { body } = await page(admin, "/admin?tab=reports");

    expect(body).toContain(item.title);
    expect(body).toContain(reporter.name as string);
    expect(body).toContain("Spam or advertising");
    expect(body).toContain("Selling phones.");
    expect(body).toContain("Dismiss");
    expect(body).toContain("Remove item");
  });

  it("offers an admin every post on the board with a search, filters and a way to remove one", async () => {
    const { client: admin } = await createAdmin();

    const { body } = await page(admin, "/admin?tab=posts");

    expect(body).toContain('aria-label="Search posts"');
    expect(body).toContain("Filter by type");
    expect(body).toContain("Filter by status");
  });

  it("names its three tabs", async () => {
    const { client: admin } = await createAdmin();

    const { body } = await page(admin, "/admin");

    expect(body).toContain("ID reviews");
    expect(body).toContain("Reports");
    expect(body).toContain("Posts");
  });

  it("opens on the tab asked for and ignores one that does not exist", async () => {
    const { client: admin } = await createAdmin();

    expect((await page(admin, "/admin?tab=posts")).body).toMatch(/role="tab" aria-selected="true"[^>]*trigger-posts/);
    expect((await page(admin, "/admin?tab=reports")).body).toMatch(/role="tab" aria-selected="true"[^>]*trigger-reports/);
    expect((await page(admin, "/admin?tab=nonsense")).body).toMatch(/role="tab" aria-selected="true"[^>]*trigger-(verification|reports)/);
  });
});
