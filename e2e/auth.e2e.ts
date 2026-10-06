import { describe, expect, it } from "vitest";

import { AUTH_LIMITS } from "@/lib/auth/limits";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { db } from "@/lib/db";

import { ApiClient } from "./support/client";
import {
  TEST_PASSWORD,
  createSignedInUser,
  createUser,
  signInAs,
  toInternational,
  uniqueEmail,
  uniqueLocalPhone,
} from "./support/factories";

interface UserBody {
  user: { id: string; name: string; email: string; phone: string; role: string; kycStatus: string };
}

interface ErrorBody {
  error: string;
  fields?: Record<string, string[]>;
}

function registration(overrides: Record<string, unknown> = {}) {
  return {
    name: "Ada Okafor",
    email: uniqueEmail("ada"),
    phone: uniqueLocalPhone(),
    password: TEST_PASSWORD,
    ...overrides,
  };
}

describe("POST /api/auth/register", () => {
  it("creates the account, signs the user in and never returns the password", async () => {
    const client = new ApiClient();
    const input = registration();

    const result = await client.post<UserBody>("/api/auth/register", input);

    expect(result.status).toBe(201);
    expect(result.body.user).toMatchObject({
      name: "Ada Okafor",
      email: input.email,
      phone: toInternational(input.phone),
      role: "STUDENT",
      kycStatus: "NOT_SUBMITTED",
    });
    expect(result.body.user).not.toHaveProperty("password");

    const setCookie = result.headers.getSetCookie().join("\n");
    expect(setCookie).toContain(`${SESSION_COOKIE}=`);
    expect(setCookie).toMatch(/HttpOnly/);
    expect(setCookie).toMatch(/SameSite=Lax/);
    expect(setCookie).toMatch(/Path=\//);
    expect(setCookie).toMatch(/Max-Age=1209600/);
    expect(setCookie).not.toMatch(/Secure/);

    const me = await client.get<UserBody>("/api/me");
    expect(me.status).toBe(200);
    expect(me.body.user.id).toBe(result.body.user.id);

    const stored = await db.user.findUniqueOrThrow({ where: { id: result.body.user.id } });
    expect(stored.password).toMatch(/^scrypt\$/);
    expect(stored.password).not.toContain(TEST_PASSWORD);
  });

  it("marks the cookie Secure when the request arrived over HTTPS", async () => {
    const result = await new ApiClient().post<UserBody>("/api/auth/register", registration(), {
      headers: { "x-forwarded-proto": "https" },
    });

    expect(result.status).toBe(201);
    expect(result.headers.getSetCookie().join("\n")).toMatch(/; Secure/);
  });

  it("rejects invalid input with a message per field", async () => {
    const result = await new ApiClient().post<ErrorBody>("/api/auth/register", {
      name: "A",
      email: "nope",
      phone: "123",
      password: "short",
    });

    expect(result.status).toBe(400);
    expect(Object.keys(result.body.fields ?? {}).sort()).toEqual(["email", "name", "password", "phone"]);
  });

  it("rejects a missing body", async () => {
    const result = await new ApiClient().post<ErrorBody>("/api/auth/register");

    expect(result.status).toBe(400);
    expect(result.body.error).toBeTruthy();
  });

  it("rejects a duplicate email in any letter case", async () => {
    const first = registration();
    expect((await new ApiClient().post("/api/auth/register", first)).status).toBe(201);

    const second = await new ApiClient().post<ErrorBody>(
      "/api/auth/register",
      registration({ email: first.email.toUpperCase() }),
    );

    expect(second.status).toBe(409);
    expect(second.body.fields).toHaveProperty("email");
    expect(await db.user.count({ where: { email: first.email } })).toBe(1);
  });

  it("rejects a duplicate phone number written in another format", async () => {
    const first = registration();
    expect((await new ApiClient().post("/api/auth/register", first)).status).toBe(201);

    const second = await new ApiClient().post<ErrorBody>(
      "/api/auth/register",
      registration({ phone: toInternational(first.phone) }),
    );

    expect(second.status).toBe(409);
    expect(second.body.fields).toHaveProperty("phone");
  });

  it("limits registrations per IP address, counting concurrent requests exactly", async () => {
    const client = new ApiClient();
    const { max } = AUTH_LIMITS.register.perIp;

    const allowed = await Promise.all(Array.from({ length: max }, () => client.post("/api/auth/register", {})));
    expect(allowed.map((result) => result.status)).toEqual(Array(max).fill(400));

    const blocked = await client.post<ErrorBody>("/api/auth/register", registration());

    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

describe("POST /api/auth/login", () => {
  it("signs in and creates one session per login", async () => {
    const user = await createUser();
    const client = new ApiClient();

    const result = await client.post<UserBody>("/api/auth/login", { email: user.email, password: TEST_PASSWORD });

    expect(result.status).toBe(200);
    expect(result.body.user.id).toBe(user.id);
    expect(result.body.user).not.toHaveProperty("password");
    expect(result.headers.getSetCookie().join("\n")).toContain(`${SESSION_COOKIE}=`);
    expect((await client.get<UserBody>("/api/me")).body.user.id).toBe(user.id);

    await new ApiClient().post("/api/auth/login", { email: user.email, password: TEST_PASSWORD });
    expect(await db.session.count({ where: { userId: user.id } })).toBe(2);
  });

  it("accepts the email in any letter case", async () => {
    const user = await createUser();

    const result = await new ApiClient().post<UserBody>("/api/auth/login", {
      email: user.email.toUpperCase(),
      password: TEST_PASSWORD,
    });

    expect(result.status).toBe(200);
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    const user = await createUser();

    const wrongPassword = await new ApiClient().post<ErrorBody>("/api/auth/login", {
      email: user.email,
      password: "not-the-password",
    });
    const unknownEmail = await new ApiClient().post<ErrorBody>("/api/auth/login", {
      email: uniqueEmail("ghost"),
      password: TEST_PASSWORD,
    });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual({ error: "Email or password is incorrect." });
    expect(unknownEmail.body).toEqual(wrongPassword.body);
    expect(wrongPassword.headers.getSetCookie()).toHaveLength(0);
  });

  it("rejects malformed input", async () => {
    const result = await new ApiClient().post<ErrorBody>("/api/auth/login", { email: "nope" });

    expect(result.status).toBe(400);
    expect(result.body.fields).toHaveProperty("email");
  });

  it("blocks an email once it exceeds its attempt limit, even with the right password", async () => {
    const user = await createUser();
    const client = new ApiClient();
    for (let attempt = 0; attempt < AUTH_LIMITS.login.perEmail.max; attempt += 1) {
      expect((await client.post("/api/auth/login", { email: user.email, password: "wrong-password" })).status).toBe(
        401,
      );
    }

    const blocked = await client.post<ErrorBody>("/api/auth/login", { email: user.email, password: TEST_PASSWORD });

    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
  });
});

describe("GET /api/me", () => {
  it("rejects requests without a session", async () => {
    const result = await new ApiClient().get<ErrorBody>("/api/me");

    expect(result.status).toBe(401);
    expect(result.body.error).toBeTruthy();
  });

  it("rejects an unknown session token", async () => {
    const client = new ApiClient();
    client.cookies.set(SESSION_COOKIE, "not-a-real-token");

    expect((await client.get("/api/me")).status).toBe(401);
  });

  it("rejects and removes an expired session", async () => {
    const user = await createUser();
    const client = await signInAs(user);
    await db.session.updateMany({ where: { userId: user.id }, data: { expiresAt: new Date(Date.now() - 1000) } });

    expect((await client.get("/api/me")).status).toBe(401);
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);
  });

  it("returns the profile of the signed-in user and is never cached", async () => {
    const { user, client } = await createSignedInUser({ role: "ADMIN", kycStatus: "VERIFIED" });

    const result = await client.get<UserBody>("/api/me");

    expect(result.status).toBe(200);
    expect(result.body.user).toMatchObject({ id: user.id, email: user.email, role: "ADMIN", kycStatus: "VERIFIED" });
    expect(result.body.user).not.toHaveProperty("password");
    expect(result.headers.get("cache-control")).toBe("no-store");
  });
});

describe("POST /api/auth/logout", () => {
  it("revokes the session on the server", async () => {
    const user = await createUser();
    const client = new ApiClient();
    await client.post("/api/auth/login", { email: user.email, password: TEST_PASSWORD });
    const token = client.cookies.get(SESSION_COOKIE) as string;

    const result = await client.post("/api/auth/logout");

    expect(result.status).toBe(200);
    expect(result.headers.getSetCookie().join("\n")).toMatch(/Max-Age=0/);
    expect(client.cookies.has(SESSION_COOKIE)).toBe(false);
    expect(await db.session.count({ where: { userId: user.id } })).toBe(0);

    const replay = new ApiClient();
    replay.cookies.set(SESSION_COOKIE, token);
    expect((await replay.get("/api/me")).status).toBe(401);
  });

  it("only ends the session it was called with", async () => {
    const user = await createUser();
    const phone = await signInAs(user);
    const laptop = await signInAs(user);

    await phone.post("/api/auth/logout");

    expect((await phone.get("/api/me")).status).toBe(401);
    expect((await laptop.get("/api/me")).status).toBe(200);
  });

  it("is safe to repeat and works without a session", async () => {
    const { client } = await createSignedInUser();

    expect((await client.post("/api/auth/logout")).status).toBe(200);
    expect((await client.post("/api/auth/logout")).status).toBe(200);
    expect((await new ApiClient().post("/api/auth/logout")).status).toBe(200);
  });
});

describe("cross-origin protection", () => {
  it.each(["/api/auth/register", "/api/auth/login", "/api/auth/logout"])(
    "blocks a foreign Origin on %s",
    async (path) => {
      const result = await new ApiClient().post<ErrorBody>(path, registration(), { origin: "https://evil.example" });

      expect(result.status).toBe(403);
      expect(result.body.error).toBe("Cross-origin request blocked.");
    },
  );

  it("creates no account for a blocked request", async () => {
    const input = registration();

    await new ApiClient().post("/api/auth/register", input, { origin: "https://evil.example" });

    expect(await db.user.findUnique({ where: { email: input.email } })).toBeNull();
  });

  it("allows requests without an Origin header, such as scripts and curl", async () => {
    const result = await new ApiClient().post<UserBody>("/api/auth/register", registration(), { origin: null });

    expect(result.status).toBe(201);
  });
});
