import { describe, expect, it } from "vitest";

import type { ClaimStatus, ItemStatus } from "@/lib/items/types";

import { claimCopy, claimProgress } from "./labels";

describe("claimProgress", () => {
  it.each([
    ["PENDING", "OPEN", "claimant", "Waiting for the poster", "warning"],
    ["PENDING", "OPEN", "poster", "Needs your review", "warning"],
    ["PENDING", "CLAIMED", "claimant", "Closed", "neutral"],
    ["PENDING", "RESOLVED", "poster", "Closed", "neutral"],
    ["PENDING", "REMOVED", "claimant", "Closed", "neutral"],
    ["APPROVED", "CLAIMED", "claimant", "Approved", "success"],
    ["APPROVED", "CLAIMED", "poster", "Approved", "success"],
    ["APPROVED", "RESOLVED", "claimant", "Returned", "success"],
    ["APPROVED", "RESOLVED", "poster", "Returned", "success"],
    ["REJECTED", "OPEN", "claimant", "Not approved", "danger"],
    ["REJECTED", "CLAIMED", "poster", "Not approved", "danger"],
    ["CANCELLED", "OPEN", "claimant", "Cancelled", "neutral"],
    ["CANCELLED", "REMOVED", "poster", "Cancelled", "neutral"],
  ] as const)("shows a %s claim on a %s item to the %s as %s", (status, itemStatus, viewer, label, tone) => {
    expect(claimProgress({ status, itemStatus }, viewer)).toMatchObject({ label, tone });
  });

  it("speaks to the claimant by default", () => {
    expect(claimProgress({ status: "PENDING", itemStatus: "OPEN" }).description).toBe("The poster is reviewing your claim.");
  });

  it("gives every state a label, a tone and a sentence", () => {
    const statuses: ClaimStatus[] = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];
    const itemStatuses: ItemStatus[] = ["OPEN", "CLAIMED", "RESOLVED", "REMOVED"];

    for (const status of statuses) {
      for (const itemStatus of itemStatuses) {
        for (const viewer of ["claimant", "poster"] as const) {
          const progress = claimProgress({ status, itemStatus }, viewer);
          expect(progress.label.length).toBeGreaterThan(0);
          expect(progress.description.endsWith(".")).toBe(true);
        }
      }
    }
  });
});

describe("claimCopy", () => {
  it("asks an owner for proof when the item was found", () => {
    expect(claimCopy("FOUND")).toMatchObject({
      title: "Claim this item",
      detailsLabel: "Ownership details",
      mediaLabel: "Proof media",
    });
  });

  it("asks a finder where the item is when the item was lost", () => {
    expect(claimCopy("LOST")).toMatchObject({ title: "I found this", detailsLabel: "What you found" });
  });

  it("fills in every line for both kinds of item", () => {
    for (const type of ["FOUND", "LOST"] as const) {
      for (const [key, value] of Object.entries(claimCopy(type))) {
        expect(value.trim().length, `${type}.${key}`).toBeGreaterThan(0);
      }
    }
  });
});
