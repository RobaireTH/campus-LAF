import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import { db } from "@/lib/db";

import { ApiClient, type ApiResponse } from "./support/client";
import { createAdmin, createItem, createScope, createSignedInUser, createUser, defaultTaxonomy } from "./support/factories";

const NOT_FOUND = "NEXT_HTTP_ERROR_FALLBACK;404";

function redirectOf(response: ApiResponse<string>) {
  const header = response.headers.get("location");
  if (header) {
    const url = new URL(header, "http://localhost");
    return `${url.pathname}${url.search}`;
  }
  return /http-equiv="refresh" content="\d+;url=([^"]+)"/.exec(response.body)?.[1].replaceAll("&amp;", "&");
}

const page = (client: ApiClient, path: string) => client.get<string>(path);

describe("protected pages", () => {
  it.each(["/report", "/dashboard", "/account", "/admin", "/items/some-item/edit", "/items/some-item/claims", "/items/some-item/claim", "/claims/some-claim"])(
    "send a signed-out visitor from %s to login with a way back",
    async (path) => {
      const result = await page(new ApiClient(), path);

      expect(redirectOf(result)).toBe(`/login?callbackUrl=${encodeURIComponent(path)}`);
    },
  );

  it("send a signed-out visitor from the ID screen to login and then back to it", async () => {
    const result = await page(new ApiClient(), "/verify-id?callbackUrl=%2Fdashboard");

    expect(redirectOf(result)).toBe(`/login?callbackUrl=${encodeURIComponent("/verify-id?callbackUrl=%2Fdashboard")}`);
  });

  it.each(["/", "/login", "/register"])("leave %s open to a signed-out visitor", async (path) => {
    const result = await page(new ApiClient(), path);

    expect(result.status).toBe(200);
    expect(redirectOf(result)).toBeUndefined();
  });

  it("send a signed-in user away from login and register to where they were going", async () => {
    const { client } = await createSignedInUser();

    expect(redirectOf(await page(client, "/login"))).toBe("/");
    expect(redirectOf(await page(client, "/register?callbackUrl=%2Fdashboard"))).toBe("/dashboard");
    expect(redirectOf(await page(client, `/login?callbackUrl=${encodeURIComponent("/\\evil.example")}`))).toBe("/");
  });

  it("open the report, dashboard and account pages to a signed-in user", async () => {
    const { client } = await createSignedInUser();

    for (const path of ["/report", "/dashboard", "/account"]) {
      const result = await page(client, path);

      expect(result.status).toBe(200);
      expect(redirectOf(result)).toBeUndefined();
      expect(result.body).not.toContain(NOT_FOUND);
    }
  });

  it("hide the admin page from everyone who is not an admin", async () => {
    const { client: student } = await createSignedInUser({ kycStatus: "VERIFIED" });
    const { client: admin } = await createAdmin();

    expect((await page(student, "/admin")).body).toContain(NOT_FOUND);
    const allowed = await page(admin, "/admin");
    expect(allowed.body).not.toContain(NOT_FOUND);
    expect(allowed.body).toContain("Moderation");
  });

  it("keep the notification page hidden until notifications exist", async () => {
    const { client } = await createSignedInUser();

    expect((await page(client, "/notifications")).body).toContain(NOT_FOUND);
  });
});

describe("the claim page", () => {
  it("asks an unverified user to verify their ID first", async () => {
    const item = await createItem((await createUser()).id);
    const { client } = await createSignedInUser({ kycStatus: "NOT_SUBMITTED" });

    const result = await page(client, `/items/${item.id}/claim`);

    expect(result.body).toContain("Verify your student ID");
    expect(result.body).not.toContain("Ownership details");
  });

  it("shows the claim form to a verified user", async () => {
    const item = await createItem((await createUser()).id);
    const { client } = await createSignedInUser({ kycStatus: "VERIFIED" });

    const result = await page(client, `/items/${item.id}/claim`);

    expect(result.body).toContain("Ownership details");
    expect(result.body).not.toContain("Verify your student ID");
  });
});

describe("the ID verification page", () => {
  it("shows the upload form to someone who has not submitted", async () => {
    const { client } = await createSignedInUser({ kycStatus: "NOT_SUBMITTED" });

    const result = await page(client, "/verify-id");

    expect(result.body).toContain("Submit for verification");
    expect(result.body).not.toContain("Your last photo was not accepted");
  });

  it("shows the reason a rejected ID was refused, with the form to try again", async () => {
    const { user, client } = await createSignedInUser({ kycStatus: "REJECTED" });
    await db.user.update({ where: { id: user.id }, data: { kycRejectionReason: "The name on the card is not readable." } });

    const result = await page(client, "/verify-id");

    expect(result.body).toContain("Your last photo was not accepted");
    expect(result.body).toContain("The name on the card is not readable.");
    expect(result.body).toContain("Submit for verification");
  });

  it.each([
    ["PENDING", "Your ID is under review"],
    ["VERIFIED", "Your ID is verified"],
  ] as const)("shows %s as a status instead of the form", async (kycStatus, text) => {
    const { client } = await createSignedInUser({ kycStatus });

    const result = await page(client, "/verify-id?callbackUrl=%2Fdashboard");

    expect(result.body).toContain(text);
    expect(result.body).not.toContain("Submit for verification");
    expect(result.body).toContain('href="/dashboard"');
  });

  it("ignores a callback that leaves the site", async () => {
    const { client } = await createSignedInUser({ kycStatus: "VERIFIED" });

    const result = await page(client, `/verify-id?callbackUrl=${encodeURIComponent("//evil.example")}`);

    expect(result.body).toContain('href="/"');
    expect(result.body).not.toContain('href="//evil.example"');
  });
});

describe("the edit page", () => {
  it("shows the owner the open post with its details filled in, and the category and location to change", async () => {
    const { user, client } = await createSignedInUser();
    const { categoryId, locationId } = await defaultTaxonomy();
    const item = await createItem(user.id, { title: `Editable ${randomUUID().slice(0, 8)}`, locationNote: "Near the printers" });

    const result = await page(client, `/items/${item.id}/edit`);

    expect(result.body).toContain(item.title);
    expect(result.body).toContain("Near the printers");
    expect(result.body).toContain("Save changes");
    expect(result.body).toContain(categoryId);
    expect(result.body).toContain(locationId);
  });

  it("looks like nothing is there to anyone else, including an admin", async () => {
    const item = await createItem((await createUser()).id);
    const { client: stranger } = await createSignedInUser();
    const { client: admin } = await createAdmin();

    expect((await page(stranger, `/items/${item.id}/edit`)).body).toContain(NOT_FOUND);
    expect((await page(admin, `/items/${item.id}/edit`)).body).toContain(NOT_FOUND);
    expect((await page(stranger, "/items/does-not-exist/edit")).body).toContain(NOT_FOUND);
  });

  it.each([
    ["CLAIMED", "A claim was approved"],
    ["RESOLVED", "already returned"],
    ["REMOVED", "This post was removed."],
  ] as const)("explains to the owner why a %s post can't be edited", async (status, text) => {
    const { user, client } = await createSignedInUser();
    const item = await createItem(user.id, { status });

    const result = await page(client, `/items/${item.id}/edit`);

    expect(result.body).toContain(text);
    expect(result.body).not.toContain("Save changes");
  });
});

describe("browse and item pages", () => {
  it("list posts straight from the database and filter them by category id", async () => {
    const poster = await createUser();
    const { category: first } = await createScope();
    const { category: second } = await createScope();
    const tag = randomUUID().slice(0, 8);
    const inFirst = await createItem(poster.id, { title: `First ${tag}`, categoryId: first.id });
    const inSecond = await createItem(poster.id, { title: `Second ${tag}`, categoryId: second.id });

    const everything = await page(new ApiClient(), `/?q=${tag}`);
    const onlyFirst = await page(new ApiClient(), `/?q=${tag}&category=${first.id}`);

    expect(everything.body).toContain(inFirst.title);
    expect(everything.body).toContain(inSecond.title);
    expect(onlyFirst.body).toContain(inFirst.title);
    expect(onlyFirst.body).not.toContain(inSecond.title);
  });

  it("offers the real categories and locations, by id, to the filters", async () => {
    const { category, location } = await createScope();

    const result = await page(new ApiClient(), "/");

    expect(result.body).toContain(category.id);
    expect(result.body).toContain(location.id);
  });

  it("says so when nothing matches", async () => {
    const result = await page(new ApiClient(), `/?q=${randomUUID()}`);

    expect(result.body).toContain("Nothing matches yet");
  });

  it("shows an open post to anyone and hides a removed one from everyone but its owner", async () => {
    const { user: owner, client: ownerClient } = await createSignedInUser();
    const open = await createItem(owner.id, { title: `Open ${randomUUID().slice(0, 8)}` });
    const removed = await createItem(owner.id, { title: `Removed ${randomUUID().slice(0, 8)}`, status: "REMOVED" });

    expect((await page(new ApiClient(), `/items/${open.id}`)).body).toContain(open.title);
    expect((await page(new ApiClient(), `/items/${removed.id}`)).body).toContain(NOT_FOUND);
    expect((await page(ownerClient, `/items/${removed.id}`)).body).toContain(removed.title);
    expect((await page(new ApiClient(), "/items/does-not-exist")).body).toContain(NOT_FOUND);
  });
});
