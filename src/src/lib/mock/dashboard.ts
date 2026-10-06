import type { DashboardData } from "@/lib/types";

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

// Swap the body of this function for the real API call in SOF-19 (Integration).
export async function getDashboard(): Promise<DashboardData> {
  const calculator = {
    id: "item-1",
    title: "Casio fx-991ES calculator",
    type: "FOUND" as const,
    location: "Engineering Block",
    createdAt: hoursAgo(5),
    claimCount: 2,
  };

  return {
    user: { name: "Tobi", initials: "TA", verified: true },
    stats: { posts: 3, claimsToReview: 2, claims: 1 },
    needsAction: [calculator],
    matches: [
      { id: "item-2", title: "Black iPhone 13 (case)", type: "FOUND", location: "Cafeteria", createdAt: hoursAgo(3) },
      { id: "item-3", title: "iPhone in clear case", type: "FOUND", location: "Student Union Building", createdAt: hoursAgo(30) },
    ],
    recent: [
      calculator,
      { id: "item-4", title: "Black iPhone 13", type: "LOST", location: "Student Union Building", createdAt: hoursAgo(9), claimCount: 0 },
    ],
  };
}
