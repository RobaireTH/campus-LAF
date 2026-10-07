import { describe, expect, it, vi } from "vitest";

import type { ItemStatus, Prisma } from "@/generated/prisma/client";

import { canTransition, transitionItem } from "./status";

const ALL: ItemStatus[] = ["OPEN", "CLAIMED", "RESOLVED", "REMOVED"];

const ALLOWED: Record<ItemStatus, ItemStatus[]> = {
  OPEN: ["CLAIMED", "REMOVED"],
  CLAIMED: ["RESOLVED", "OPEN", "REMOVED"],
  RESOLVED: ["REMOVED"],
  REMOVED: [],
};

function fakeTransaction(count: number) {
  const updateMany = vi.fn().mockResolvedValue({ count });
  return { tx: { item: { updateMany } } as unknown as Prisma.TransactionClient, updateMany };
}

describe("canTransition", () => {
  it.each(ALL.flatMap((from) => ALL.map((to) => [from, to] as const)))("%s to %s", (from, to) => {
    expect(canTransition(from, to)).toBe(ALLOWED[from].includes(to));
  });

  it("never leaves REMOVED", () => {
    expect(ALL.some((to) => canTransition("REMOVED", to))).toBe(false);
  });
});

describe("transitionItem", () => {
  it("moves the item only from the status the caller expects", async () => {
    const { tx, updateMany } = fakeTransaction(1);

    const moved = await transitionItem(tx, { itemId: "itm_1", from: "OPEN", to: "CLAIMED" });

    expect(moved).toBe(true);
    expect(updateMany).toHaveBeenCalledWith({ where: { id: "itm_1", status: "OPEN" }, data: { status: "CLAIMED" } });
  });

  it("restricts the update to the poster when asked", async () => {
    const { tx, updateMany } = fakeTransaction(1);

    await transitionItem(tx, { itemId: "itm_1", from: "OPEN", to: "REMOVED", posterId: "usr_1" });

    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "itm_1", status: "OPEN", posterId: "usr_1" },
      data: { status: "REMOVED" },
    });
  });

  it("reports false when nothing matched, such as after losing a race", async () => {
    const { tx } = fakeTransaction(0);

    expect(await transitionItem(tx, { itemId: "itm_1", from: "OPEN", to: "CLAIMED" })).toBe(false);
  });

  it("refuses an illegal move without touching the database", async () => {
    const { tx, updateMany } = fakeTransaction(1);

    await expect(transitionItem(tx, { itemId: "itm_1", from: "RESOLVED", to: "OPEN" })).rejects.toThrow(
      "Illegal item transition from RESOLVED to OPEN",
    );
    expect(updateMany).not.toHaveBeenCalled();
  });
});
