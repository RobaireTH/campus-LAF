import { describe, expect, it } from "vitest";

import { buildObjectKey, mediaKind, mediaPurpose, ownsUpload } from "./keys";

const userId = "user_abc123";
const uuid = "0b9c1e2a-5f4d-4c3b-9a8e-7d6f5e4c3b2a";

describe("buildObjectKey", () => {
  it("builds purpose/user/uuid.ext keys that the other helpers accept", () => {
    const key = buildObjectKey("claim", userId, "video/mp4");

    expect(key).toMatch(/^claim\/user_abc123\/[0-9a-f-]{36}\.mp4$/);
    expect(ownsUpload(key, userId, "claim")).toBe(true);
    expect(mediaPurpose(key)).toBe("claim");
    expect(mediaKind(key)).toBe("VIDEO");
  });

  it("never repeats a key", () => {
    expect(buildObjectKey("item", userId, "image/png")).not.toBe(buildObjectKey("item", userId, "image/png"));
  });
});

describe("ownsUpload", () => {
  it("is true only for the right user and the right purpose", () => {
    expect(ownsUpload(`kyc/${userId}/${uuid}.jpg`, userId, "kyc")).toBe(true);
    expect(ownsUpload(`kyc/${userId}/${uuid}.jpg`, "user_other", "kyc")).toBe(false);
    expect(ownsUpload(`kyc/${userId}/${uuid}.jpg`, userId, "item")).toBe(false);
    expect(ownsUpload(`kyc/${userId}/${uuid}.jpg`, userId, "claim")).toBe(false);
  });

  it.each([
    ["an unsupported extension", `kyc/${userId}/${uuid}.exe`],
    ["a GIF", `kyc/${userId}/${uuid}.gif`],
    ["an upper-case extension", `kyc/${userId}/${uuid}.JPG`],
    ["a name that is not a uuid", `kyc/${userId}/photo.jpg`],
    ["an extra path segment", `kyc/${userId}/nested/${uuid}.jpg`],
    ["a traversal", `kyc/${userId}/../other/${uuid}.jpg`],
    ["an unknown purpose", `avatar/${userId}/${uuid}.jpg`],
    ["an empty string", ""],
  ])("is false for %s", (_label, key) => {
    expect(ownsUpload(key, userId, "kyc")).toBe(false);
  });
});

describe("mediaPurpose", () => {
  it("reads the purpose from a valid key and throws on anything else", () => {
    expect(mediaPurpose(`item/${userId}/${uuid}.webp`)).toBe("item");
    expect(() => mediaPurpose("not-a-key")).toThrow("Invalid media key");
  });
});

describe("mediaKind", () => {
  it.each([
    ["a.jpg", "IMAGE"],
    ["a.png", "IMAGE"],
    ["a.webp", "IMAGE"],
    ["a.mp4", "VIDEO"],
    ["a.webm", "VIDEO"],
    ["a.pdf", undefined],
  ])("classifies %s as %s", (name, kind) => {
    expect(mediaKind(name)).toBe(kind);
  });
});
