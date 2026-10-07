import type { PrismaClient } from "../src/generated/prisma/client";
import { hashPassword } from "../src/lib/auth/password";

export const ADMIN_EMAIL = "admin@campuslaf.test";

const CATEGORIES = [
  "Electronics",
  "ID cards",
  "Books & notes",
  "Bags",
  "Keys",
  "Clothing",
  "Jewelry",
  "Other",
];

const LOCATIONS = [
  "Oduduwa Hall",
  "Main Library",
  "Faculty of Science",
  "Sports Complex",
  "Student Union Building",
  "Health Centre",
  "Cafeteria",
  "Main Gate",
];

const SAMPLE_ITEMS = [
  { id: "seed-item-1", type: "LOST", title: "Black HP laptop", description: "Lost near the library entrance, has a university sticker on the lid.", category: "Electronics", location: "Main Library", daysAgo: 2 },
  { id: "seed-item-2", type: "FOUND", title: "Student ID card", description: "Found on a bench outside the Student Union Building.", category: "ID cards", location: "Student Union Building", daysAgo: 1 },
  { id: "seed-item-3", type: "LOST", title: "Calculus textbook", description: "Left in a lecture theatre in the Faculty of Science, name written inside the cover.", category: "Books & notes", location: "Faculty of Science", daysAgo: 5 },
  { id: "seed-item-4", type: "FOUND", title: "Blue backpack", description: "Found at the Sports Complex after a football match.", category: "Bags", location: "Sports Complex", daysAgo: 3 },
  { id: "seed-item-5", type: "LOST", title: "Bunch of keys, red keychain", description: "Lost somewhere between the cafeteria and the main gate.", category: "Keys", location: "Cafeteria", daysAgo: 1 },
  { id: "seed-item-6", type: "FOUND", title: "Grey hoodie", description: "Left behind at the Health Centre waiting area.", category: "Clothing", location: "Health Centre", daysAgo: 4 },
  { id: "seed-item-7", type: "LOST", title: "Silver wristwatch", description: "Lost near Oduduwa Hall during an event.", category: "Jewelry", location: "Oduduwa Hall", daysAgo: 7 },
  { id: "seed-item-8", type: "FOUND", title: "Black umbrella", description: "Found leaning against a wall near the Main Gate.", category: "Other", location: "Main Gate", daysAgo: 2 },
  { id: "seed-item-9", type: "LOST", title: "Wired earphones", description: "Dropped somewhere in the library reading hall.", category: "Electronics", location: "Main Library", daysAgo: 6 },
  { id: "seed-item-10", type: "FOUND", title: "Maroon wallet", description: "Found near the Student Union Building, has a few cards inside.", category: "Bags", location: "Student Union Building", daysAgo: 1 },
] as const;

export type Taxonomy = Awaited<ReturnType<typeof seedTaxonomy>>;

export async function seedTaxonomy(client: PrismaClient) {
  const categories = await Promise.all(
    CATEGORIES.map((name) => client.category.upsert({ where: { name }, update: {}, create: { name } })),
  );
  const locations = await Promise.all(
    LOCATIONS.map((name) => client.location.upsert({ where: { name }, update: {}, create: { name } })),
  );
  return {
    categoryIds: Object.fromEntries(categories.map((category) => [category.name, category.id])),
    locationIds: Object.fromEntries(locations.map((location) => [location.name, location.id])),
  };
}

export async function seedAdmin(client: PrismaClient, password: string, options: { resetPassword?: boolean } = {}) {
  const passwordHash = await hashPassword(password);
  return client.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: options.resetPassword ? { password: passwordHash, role: "ADMIN", kycStatus: "VERIFIED" } : {},
    create: {
      email: ADMIN_EMAIL,
      name: "Campus LAF Admin",
      password: passwordHash,
      role: "ADMIN",
      kycStatus: "VERIFIED",
    },
  });
}

export async function seedSampleItems(client: PrismaClient, posterId: string, taxonomy: Taxonomy) {
  for (const item of SAMPLE_ITEMS) {
    const eventDate = new Date();
    eventDate.setDate(eventDate.getDate() - item.daysAgo);

    await client.item.upsert({
      where: { id: item.id },
      update: {},
      create: {
        id: item.id,
        type: item.type,
        title: item.title,
        description: item.description,
        status: "OPEN",
        eventDate,
        categoryId: taxonomy.categoryIds[item.category],
        locationId: taxonomy.locationIds[item.location],
        posterId,
      },
    });
  }
}
