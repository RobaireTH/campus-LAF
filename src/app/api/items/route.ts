import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { ItemStatus, ItemType, Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { route } from "@/lib/http/route";

const createItemSchema = z.object({
  type: z.enum(["LOST", "FOUND"]),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(10).max(2000),
  categoryId: z.string().min(1),
  locationId: z.string().min(1),
  locationNote: z.string().trim().max(200).optional(),
  dateLostOrFound: z.coerce.date(),
  mediaKeys: z.array(z.string().min(1)).max(6).default([]),
});

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const REQUIRE_KYC_TO_POST = false;

const transientDatabaseErrorCodes = new Set([
  "ETIMEDOUT",
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
]);

function hasErrorCode(error: unknown): error is { code: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  );
}

function isDatabaseUnavailableError(error: unknown) {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  return hasErrorCode(error) && transientDatabaseErrorCodes.has(error.code);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  const q = params.get("q")?.trim() || undefined;

  const typeParam = params.get("type");
  if (typeParam && !Object.values(ItemType).includes(typeParam as ItemType)) {
    return NextResponse.json(
      { error: "Invalid type. Expected LOST or FOUND." },
      { status: 400 },
    );
  }
  const type = typeParam as ItemType | null;

  const categoryId = params.get("category") || undefined;
  const locationId = params.get("location") || undefined;

  const fromParam = params.get("from");
  const toParam = params.get("to");
  const from = fromParam ? new Date(fromParam) : undefined;
  const to = toParam ? new Date(toParam) : undefined;
  if ((fromParam && isNaN(from!.getTime())) || (toParam && isNaN(to!.getTime()))) {
    return NextResponse.json(
      { error: "Invalid from/to date. Use ISO format, e.g. 2026-09-01." },
      { status: 400 },
    );
  }

  const statusParam = params.get("status")?.toUpperCase();
  const requestedStatus =
    statusParam && Object.values(ItemStatus).includes(statusParam as ItemStatus)
      ? (statusParam as ItemStatus)
      : null;
  const status: ItemStatus =
    requestedStatus && requestedStatus !== "REMOVED" ? requestedStatus : "OPEN";

  const cursor = params.get("cursor") || undefined;
  const limitParam = Number(params.get("limit"));
  const limit =
    Number.isFinite(limitParam) && limitParam > 0
      ? Math.min(limitParam, MAX_LIMIT)
      : DEFAULT_LIMIT;

  const sort = params.get("sort") === "oldest" ? "oldest" : "newest";
  const orderBy: Prisma.ItemOrderByWithRelationInput[] = [
    { createdAt: sort === "oldest" ? "asc" : "desc" },
    { id: "asc" },
  ];

  const where: Prisma.ItemWhereInput = {
    status,
    ...(type && { type }),
    ...(categoryId && { categoryId }),
    ...(locationId && { locationId }),
    ...((from || to) && {
      eventDate: {
        ...(from && { gte: from }),
        ...(to && { lte: to }),
      },
    }),
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  try {
    const rows = await db.item.findMany({
      where,
      orderBy,
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        eventDate: true,
        category: { select: { name: true } },
        location: { select: { name: true } },
        media: {
          where: { type: "IMAGE" },
          orderBy: { position: "asc" },
          take: 1,
          select: { key: true },
        },
      },
    });

    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? page[page.length - 1].id : null;

    const items = page.map((item) => ({
      id: item.id,
      title: item.title,
      type: item.type,
      category: item.category.name,
      location: item.location.name,
      date: item.eventDate,
      status: item.status,
      thumbnail: item.media[0]?.key ?? null,
    }));

    return NextResponse.json({ items, nextCursor });
  } catch (error) {
    console.error("Failed to fetch items", error);
    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json(
        { error: "Database unavailable" },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { error: "Failed to fetch items" },
      { status: 500 },
    );
  }
}

export const POST = route(async (request) => {
  const user = await requireUser();

  if (REQUIRE_KYC_TO_POST && user.kycStatus !== "VERIFIED") {
    return NextResponse.json(
      { error: "KYC verification is required before posting an item." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = createItemSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input.", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const { type, title, description, categoryId, locationId, locationNote, dateLostOrFound, mediaKeys } = parsed.data;

  try {
    const item = await db.item.create({
      data: {
        type,
        title,
        description,
        locationNote,
        status: "OPEN",
        eventDate: dateLostOrFound,
        categoryId,
        locationId,
        posterId: user.id,
        media: {
          create: mediaKeys.map((key, index) => ({
            key,
            type: "IMAGE" as const,
            position: index,
          })),
        },
      },
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        locationNote: true,
        status: true,
        eventDate: true,
        category: { select: { name: true } },
        location: { select: { name: true } },
        media: { select: { key: true, type: true, position: true } },
        createdAt: true,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Failed to create item", error);

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json(
        { error: "Invalid categoryId or locationId." },
        { status: 400 },
      );
    }

    if (isDatabaseUnavailableError(error)) {
      return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
    }

    return NextResponse.json({ error: "Failed to create item" }, { status: 500 });
  }
});