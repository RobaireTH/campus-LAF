import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import type { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";

import { DEMO_CLAIMS, DEMO_ITEMS, DEMO_REPORTS, DEMO_USERS } from "./demo-data";
import { seedTaxonomy } from "./seed-data";

const HOUR_MS = 60 * 60 * 1000;

export interface DemoOptions {
  password: string;
  adminId: string;
  putObject: (key: string, body: Buffer, contentType: string) => Promise<unknown>;
  imagesDir?: string;
  now?: Date;
}

function stableUuid(seed: string) {
  const hex = createHash("sha1").update(`campus-laf-demo:${seed}`).digest("hex");
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function demoKey(purpose: "item" | "claim" | "kyc", ownerId: string, entityId: string, photo: string) {
  return `${purpose}/${ownerId}/${stableUuid(`${purpose}:${entityId}:${photo}`)}.jpg`;
}

const demoItemIds = () => DEMO_ITEMS.map((item) => item.id);

export async function seedDemo(client: PrismaClient, options: DemoOptions) {
  const { password, adminId, putObject, imagesDir = path.join(process.cwd(), "prisma/demo/images"), now = new Date() } = options;
  const ago = (hours: number) => new Date(now.getTime() - hours * HOUR_MS);
  const photos = new Map<string, Buffer>();
  const uploaded = new Set<string>();

  async function upload(key: string, photo: string) {
    let bytes = photos.get(photo);
    if (!bytes) {
      bytes = await readFile(path.join(imagesDir, `${photo}.jpg`));
      photos.set(photo, bytes);
    }
    await putObject(key, bytes, "image/jpeg");
    uploaded.add(key);
  }

  const taxonomy = await seedTaxonomy(client);
  const passwordHash = await hashPassword(password);

  await client.report.deleteMany({ where: { itemId: { in: demoItemIds() } } });
  await client.claim.deleteMany({ where: { itemId: { in: demoItemIds() } } });
  await client.itemMedia.deleteMany({ where: { itemId: { in: demoItemIds() } } });

  for (const user of DEMO_USERS) {
    const idKey = user.idPhoto ? demoKey("kyc", user.id, user.id, user.idPhoto) : null;
    if (user.idPhoto && idKey) await upload(idKey, user.idPhoto);
    const data = {
      name: user.name,
      email: user.email,
      phone: user.phone,
      password: passwordHash,
      role: "STUDENT" as const,
      kycStatus: user.kyc,
      kycIdImageKey: idKey,
      kycSubmittedAt: user.submittedHoursAgo === undefined ? null : ago(user.submittedHoursAgo),
      kycRejectionReason: user.rejectionReason ?? null,
      kycReviewedAt: user.kyc === "PENDING" ? null : ago(user.kyc === "REJECTED" ? 24 : 240),
      kycReviewedById: user.kyc === "PENDING" ? null : adminId,
    };
    await client.user.upsert({ where: { id: user.id }, update: data, create: { id: user.id, ...data } });
  }

  let photoCount = 0;
  for (const item of DEMO_ITEMS) {
    const data = {
      type: item.type,
      title: item.title,
      description: item.description,
      status: item.status,
      eventDate: ago(item.eventDaysAgo * 24),
      locationNote: item.locationNote ?? null,
      categoryId: taxonomy.categoryIds[item.category],
      locationId: taxonomy.locationIds[item.location],
      posterId: item.poster,
      createdAt: ago(item.postedHoursAgo),
    };
    await client.item.upsert({ where: { id: item.id }, update: data, create: { id: item.id, ...data } });
    for (const [position, photo] of item.photos.entries()) {
      const key = demoKey("item", item.poster, item.id, photo);
      await upload(key, photo);
      await client.itemMedia.create({ data: { itemId: item.id, key, type: "IMAGE", position } });
      photoCount += 1;
    }
  }

  for (const claim of DEMO_CLAIMS) {
    const media = [];
    for (const [position, photo] of claim.photos.entries()) {
      const key = demoKey("claim", claim.claimant, claim.id, photo);
      await upload(key, photo);
      media.push({ key, type: "IMAGE" as const, position });
    }
    await client.claim.create({
      data: {
        id: claim.id,
        itemId: claim.item,
        claimantId: claim.claimant,
        status: claim.status,
        proofText: claim.proof,
        handoverCode: claim.handoverCode ?? null,
        decidedAt: claim.status === "PENDING" ? null : ago(Math.max(claim.hoursAgo - 2, 0.1)),
        createdAt: ago(claim.hoursAgo),
        media: { create: media },
      },
    });
  }

  for (const report of DEMO_REPORTS) {
    await client.report.create({
      data: {
        id: report.id,
        itemId: report.item,
        reporterId: report.reporter,
        reason: report.reason,
        details: report.details ?? null,
        status: report.status,
        createdAt: ago(report.hoursAgo),
        decidedAt: report.status === "OPEN" ? null : ago(Math.max(report.hoursAgo - 4, 0.1)),
        decidedById: report.status === "OPEN" ? null : adminId,
      },
    });
  }

  return {
    users: DEMO_USERS.length,
    items: DEMO_ITEMS.length,
    photos: photoCount,
    claims: DEMO_CLAIMS.length,
    reports: DEMO_REPORTS.length,
    uploads: uploaded.size,
  };
}

export async function removeDemo(client: PrismaClient) {
  const userIds = DEMO_USERS.map((user) => user.id);
  const items = await client.item.findMany({
    where: { OR: [{ id: { in: demoItemIds() } }, { posterId: { in: userIds } }] },
    select: { id: true },
  });
  const itemIds = items.map((item) => item.id);
  await client.report.deleteMany({ where: { OR: [{ itemId: { in: itemIds } }, { reporterId: { in: userIds } }] } });
  await client.claim.deleteMany({ where: { OR: [{ itemId: { in: itemIds } }, { claimantId: { in: userIds } }] } });
  await client.item.deleteMany({ where: { id: { in: itemIds } } });
  await client.session.deleteMany({ where: { userId: { in: userIds } } });
  await client.user.deleteMany({ where: { id: { in: userIds } } });
}
