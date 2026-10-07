import type { Prisma } from "@/generated/prisma/client";

import type { ItemSearch } from "./schema";

const MAX_WORDS = 5;

function dayStart(day: string) {
  return new Date(`${day}T00:00:00.000Z`);
}

function dayAfter(day: string) {
  const next = dayStart(day);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}

const escapeLike = (word: string) => word.replace(/[\\%_]/g, "\\$&");

function matchesWord(word: string): Prisma.ItemWhereInput {
  const contains = { contains: escapeLike(word), mode: "insensitive" as const };
  return {
    OR: [
      { title: contains },
      { description: contains },
      { locationNote: contains },
      { category: { name: contains } },
      { location: { name: contains } },
    ],
  };
}

export function matchesText(q: string | undefined): Prisma.ItemWhereInput[] {
  return (q ?? "").split(/\s+/).filter(Boolean).slice(0, MAX_WORDS).map(matchesWord);
}

export function buildItemWhere(search: ItemSearch): Prisma.ItemWhereInput {
  const text = matchesText(search.q);
  return {
    status: search.status ?? "OPEN",
    ...(search.type && { type: search.type }),
    ...(search.category && { categoryId: search.category }),
    ...(search.location && { locationId: search.location }),
    ...((search.from || search.to) && {
      eventDate: {
        ...(search.from && { gte: dayStart(search.from) }),
        ...(search.to && { lt: dayAfter(search.to) }),
      },
    }),
    ...(text.length > 0 && { AND: text }),
  };
}
