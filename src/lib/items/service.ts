import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import type { CurrentUser } from "@/lib/auth";
import { cancelOpenClaims } from "@/lib/claims/close";
import { TRANSACTION_OPTIONS, db } from "@/lib/db";
import { badRequest, conflict, forbidden, notFound, type FieldErrors } from "@/lib/http/errors";
import { mediaKind, ownsUpload } from "@/lib/uploads/keys";
import { getMediaUrl } from "@/lib/uploads/media";

import { DEFAULT_PAGE_SIZE, type CreateItemInput, type ItemSearch, type UpdateItemInput } from "./schema";
import { transitionItem } from "./status";
import type { ItemCardData, ItemDetail, ItemSearchResponse } from "./types";
import { buildItemWhere } from "./where";

const cardSelect = {
  id: true,
  title: true,
  type: true,
  status: true,
  eventDate: true,
  category: { select: { name: true } },
  location: { select: { name: true } },
  media: { where: { type: "IMAGE" }, orderBy: { position: "asc" }, take: 1, select: { key: true } },
} satisfies Prisma.ItemSelect;

const detailSelect = {
  id: true,
  title: true,
  type: true,
  status: true,
  description: true,
  locationNote: true,
  eventDate: true,
  createdAt: true,
  posterId: true,
  category: { select: { name: true } },
  location: { select: { name: true } },
  poster: { select: { name: true } },
  media: { orderBy: { position: "asc" }, select: { id: true, key: true, type: true } },
} satisfies Prisma.ItemSelect;

type CardRow = Prisma.ItemGetPayload<{ select: typeof cardSelect }>;
type DetailRow = Prisma.ItemGetPayload<{ select: typeof detailSelect }>;

async function toCard(row: CardRow): Promise<ItemCardData> {
  const thumbnail = row.media[0];
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    category: row.category.name,
    location: row.location.name,
    date: row.eventDate.toISOString(),
    status: row.status,
    thumbnailUrl: thumbnail ? await getMediaUrl(thumbnail.key) : null,
  };
}

async function toDetail(row: DetailRow, viewer: CurrentUser | null): Promise<ItemDetail> {
  const isOwner = viewer?.id === row.posterId;
  const [media, myClaim, claimCount] = await Promise.all([
    Promise.all(row.media.map(async (file) => ({ id: file.id, url: await getMediaUrl(file.key), kind: file.type }))),
    viewer && !isOwner
      ? db.claim.findFirst({
          where: { itemId: row.id, claimantId: viewer.id },
          orderBy: { createdAt: "desc" },
          select: { id: true, status: true },
        })
      : null,
    isOwner ? db.claim.count({ where: { itemId: row.id } }) : 0,
  ]);
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    category: row.category.name,
    location: row.location.name,
    date: row.eventDate.toISOString(),
    status: row.status,
    description: row.description,
    locationNote: row.locationNote,
    media,
    postedAt: row.createdAt.toISOString(),
    poster: { displayName: row.poster.name ?? "Anonymous" },
    isOwner,
    myClaim,
    claimCount,
  };
}

async function assertTaxonomyExists({ categoryId, locationId }: { categoryId?: string; locationId?: string }) {
  const [category, location] = await Promise.all([
    categoryId ? db.category.findUnique({ where: { id: categoryId }, select: { id: true } }) : true,
    locationId ? db.location.findUnique({ where: { id: locationId }, select: { id: true } }) : true,
  ]);
  const fields: FieldErrors = {};
  if (!category) fields.categoryId = ["Choose a valid category."];
  if (!location) fields.locationId = ["Choose a valid campus location."];
  if (Object.keys(fields).length > 0) throw badRequest(Object.values(fields)[0][0], fields);
}

function explainRejection(item: { posterId: string; status: string } | null, userId: string, action: "edit" | "remove") {
  if (!item || (item.status === "REMOVED" && item.posterId !== userId)) return notFound("Item not found");
  if (item.posterId !== userId) return forbidden(`Only the poster can ${action} this item.`);
  if (item.status === "REMOVED") return conflict("This post was removed.");
  if (item.status === "CLAIMED") {
    return conflict(
      action === "edit"
        ? "A claim was approved, so this post can't be edited. Finish the handover from the claim."
        : "A claim was approved, so this post can't be removed. Cancel the handover first.",
    );
  }
  return conflict("This item was already returned.");
}

export async function searchItems(search: ItemSearch): Promise<ItemSearchResponse> {
  const where = buildItemWhere(search);
  const limit = search.limit ?? DEFAULT_PAGE_SIZE;
  const [rows, total] = await Promise.all([
    db.item.findMany({
      where,
      orderBy: [{ createdAt: search.sort === "oldest" ? "asc" : "desc" }, { id: "asc" }],
      take: limit + 1,
      ...(search.cursor && { cursor: { id: search.cursor }, skip: 1 }),
      select: cardSelect,
    }),
    db.item.count({ where }),
  ]);
  const page = rows.slice(0, limit);
  return {
    items: await Promise.all(page.map(toCard)),
    nextCursor: rows.length > limit ? page[page.length - 1].id : null,
    total,
  };
}

export async function getItemDetail(id: string, viewer: CurrentUser | null) {
  const row = await db.item.findUnique({ where: { id }, select: detailSelect });
  if (!row) return null;
  const canSeeRemoved = viewer?.id === row.posterId || viewer?.role === "ADMIN";
  if (row.status === "REMOVED" && !canSeeRemoved) return null;
  return toDetail(row, viewer);
}

export async function createItem(user: CurrentUser, input: CreateItemInput) {
  if (!input.mediaKeys.every((key) => ownsUpload(key, user.id, "item"))) {
    throw badRequest("One or more attached files are not valid item uploads.", {
      mediaKeys: ["Upload your photos again."],
    });
  }
  await assertTaxonomyExists(input);
  const row = await db.item.create({
    data: {
      type: input.type,
      title: input.title,
      description: input.description,
      locationNote: input.locationNote,
      eventDate: input.dateLostOrFound,
      categoryId: input.categoryId,
      locationId: input.locationId,
      posterId: user.id,
      media: {
        create: input.mediaKeys.map((key, position) => ({ key, position, type: mediaKind(key)! })),
      },
    },
    select: detailSelect,
  });
  return toDetail(row, user);
}

export async function updateItem(user: CurrentUser, id: string, input: UpdateItemInput) {
  await assertTaxonomyExists(input);
  const { dateLostOrFound, ...fields } = input;
  const updated = await db.item.updateMany({
    where: { id, posterId: user.id, status: "OPEN" },
    data: { ...fields, ...(dateLostOrFound && { eventDate: dateLostOrFound }) },
  });
  if (updated.count === 0) {
    const item = await db.item.findUnique({ where: { id }, select: { posterId: true, status: true } });
    throw explainRejection(item, user.id, "edit");
  }
  const row = await db.item.findUniqueOrThrow({ where: { id }, select: detailSelect });
  return toDetail(row, user);
}

export async function removeItem(user: CurrentUser, id: string) {
  const removed = await db.$transaction(async (tx) => {
    const moved = await transitionItem(tx, { itemId: id, from: "OPEN", to: "REMOVED", posterId: user.id });
    if (moved) await cancelOpenClaims(tx, id, ["PENDING"]);
    return moved;
  }, TRANSACTION_OPTIONS);
  if (removed) return { id, status: "REMOVED" as const };

  const item = await db.item.findUnique({ where: { id }, select: { posterId: true, status: true } });
  if (item?.posterId === user.id && item.status === "REMOVED") return { id, status: "REMOVED" as const };
  throw explainRejection(item, user.id, "remove");
}

export async function listMyItems(user: CurrentUser) {
  const rows = await db.item.findMany({
    where: { posterId: user.id, status: { not: "REMOVED" } },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      type: true,
      status: true,
      eventDate: true,
      createdAt: true,
      _count: { select: { claims: true } },
    },
  });
  return rows.map(({ _count, ...item }) => ({ ...item, claimCount: _count.claims }));
}
