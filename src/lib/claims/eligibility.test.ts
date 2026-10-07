import { describe, expect, it } from "vitest";

import type { ClaimStatus, ItemStatus } from "@/lib/items/types";

import { claimBlocker, type ClaimSubject } from "./eligibility";

function subject(overrides: Partial<ClaimSubject> = {}, myClaim: ClaimStatus | null = null): ClaimSubject {
  return {
    id: "item-1",
    status: "OPEN",
    isOwner: false,
    myClaim: myClaim ? { id: "claim-1", status: myClaim } : null,
    ...overrides,
  };
}

describe("claimBlocker", () => {
  it("lets someone claim an open post that is not theirs", () => {
    expect(claimBlocker(subject())).toBeNull();
  });

  it("lets someone try again after their claim was rejected or cancelled", () => {
    expect(claimBlocker(subject({}, "REJECTED"))).toBeNull();
    expect(claimBlocker(subject({}, "CANCELLED"))).toBeNull();
  });

  it("sends the poster to the claims they should review", () => {
    expect(claimBlocker(subject({ isOwner: true }))).toMatchObject({
      title: "This is your post",
      action: { href: "/items/item-1/claims" },
    });
  });

  it("tells the poster first, even when the post is closed", () => {
    expect(claimBlocker(subject({ isOwner: true, status: "CLAIMED" }))?.title).toBe("This is your post");
  });

  it("points a claimant with a pending claim at their claims", () => {
    expect(claimBlocker(subject({}, "PENDING"))).toMatchObject({
      title: "You already sent a claim",
      action: { href: "/dashboard?tab=claims" },
    });
  });

  it("points a claimant whose claim was approved at the handover", () => {
    expect(claimBlocker(subject({ status: "CLAIMED" }, "APPROVED"))).toMatchObject({
      title: "Your claim was approved",
      action: { href: "/claims/claim-1" },
    });
  });

  it.each([
    ["CLAIMED", "A claim was already approved"],
    ["RESOLVED", "This item was already returned"],
    ["REMOVED", "This post was removed"],
  ] as const)("explains a %s post to everyone else", (status: ItemStatus, title) => {
    expect(claimBlocker(subject({ status }))).toMatchObject({ title });
    expect(claimBlocker(subject({ status }))?.action).toBeUndefined();
  });

  it("says a returned post is returned, even to the person who got it back", () => {
    expect(claimBlocker(subject({ status: "RESOLVED" }, "APPROVED"))?.title).toBe("This item was already returned");
  });
});
