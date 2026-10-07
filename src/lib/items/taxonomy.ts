import "server-only";

import { db } from "@/lib/db";

import { toOptions } from "./options";

export async function listTaxonomy() {
  const [categories, locations] = await Promise.all([
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.location.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return { categories: toOptions(categories), locations: toOptions(locations) };
}
