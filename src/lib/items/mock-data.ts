/**
 * TEMPORARY mock data + fake API so Browse and Item details work before the backend.
 * Integration (SOF-19) replaces `searchItems` / `getItem` in ./api.ts with real fetches;
 * the pages don't need to change. Categories and locations come from seed data (SOF-9).
 */
import type { ItemDetail, ItemType, ItemStatus, Option } from "./types";

export const categories: Option[] = [
  { value: "electronics", label: "Electronics" },
  { value: "ids-cards", label: "IDs & cards" },
  { value: "keys", label: "Keys" },
  { value: "bags", label: "Bags & bottles" },
  { value: "books", label: "Books & notes" },
  { value: "clothing", label: "Clothing & accessories" },
  { value: "other", label: "Other" },
];

export const locations: Option[] = [
  { value: "main-library", label: "Main Library" },
  { value: "engineering", label: "Engineering Block" },
  { value: "student-union", label: "Student Union Building" },
  { value: "arts", label: "Faculty of Arts" },
  { value: "science-lt", label: "Science Lecture Theatres" },
  { value: "sports", label: "Sports Complex" },
  { value: "halls", label: "Halls of residence" },
  { value: "cafeteria", label: "Cafeteria" },
];

const HOUR = 3_600_000;
const now = Date.now();
const ago = (hours: number) => new Date(now - hours * HOUR).toISOString();
const label = (opts: Option[], v: string) => opts.find((o) => o.value === v)?.label ?? v;

type Seed = [
  title: string,
  type: ItemType,
  category: string,
  location: string,
  hoursAgo: number,
  photos: string[],
  status?: ItemStatus,
  note?: string | null,
  description?: string,
];

const seeds: Seed[] = [
  ["Blue JanSport backpack", "FOUND", "bags", "engineering", 2, ["backpack"], "OPEN", "LT 2, back row", "Blue backpack left after the 10am lecture. Has a few notebooks inside. Handed in at the Engineering porters' desk."],
  ["Casio fx-991ES calculator", "FOUND", "electronics", "engineering", 5, ["calculator"], "OPEN", "Room 104", "Silver scientific calculator, no cover. Found on a desk after the CPE exam."],
  ["Student ID card", "FOUND", "ids-cards", "main-library", 7, ["idcard"], "OPEN", "2nd floor, near the printers", "Found a student ID card on the floor. Ask me which faculty is printed on it."],
  ["Black iPhone 13", "LOST", "electronics", "student-union", 9, ["phone"], "OPEN", null, "Lost my black iPhone 13 in a clear case, somewhere between the SUB and the cafeteria. Lock screen is a photo of a dog."],
  ["Keys with red lanyard", "FOUND", "keys", "halls", 20, ["keys"], "CLAIMED", "Reception", "Two keys and a small padlock key on a red lanyard."],
  ["Water bottle with stickers", "FOUND", "bags", "sports", 26, ["bottle"], "OPEN", "Basketball court bench", "Green steel bottle covered in stickers."],
  ["Black umbrella", "FOUND", "other", "main-library", 30, ["umbrella"], "OPEN", "Entrance umbrella stand", "Large black umbrella, wooden handle."],
  ["HP laptop charger", "LOST", "electronics", "science-lt", 34, [], "OPEN", "LT 3", "Lost my HP laptop charger (blue tip) after the afternoon class."],
  ["Grey hoodie", "LOST", "clothing", "cafeteria", 40, [], "OPEN", null, "Grey plain hoodie, size L. Left it on a chair."],
  ["Dell laptop in black sleeve", "FOUND", "electronics", "arts", 46, ["laptop", "backpack"], "OPEN", "Room 12", "Dell laptop in a black neoprene sleeve. Handed to the faculty office."],
  ["Wallet (brown leather)", "LOST", "ids-cards", "student-union", 52, [], "OPEN", null, "Brown leather wallet with my ATM card and ID. Reward if found."],
  ["CSC 308 lecture notebook", "FOUND", "books", "science-lt", 60, [], "OPEN", "LT 1", "Blue 80-leaf notebook with numerical methods notes."],
  ["AirPods Pro case", "LOST", "electronics", "main-library", 70, [], "OPEN", "3rd floor reading room", "White AirPods Pro case, small scratch on the lid."],
  ["Room key #214", "FOUND", "keys", "halls", 80, ["keys"], "RESOLVED", "Hall 3", "Single room key with tag 214."],
  ["Prescription glasses", "LOST", "other", "arts", 90, [], "OPEN", null, "Black rectangular frames in a red case."],
  ["Silver bracelet", "FOUND", "clothing", "sports", 100, [], "OPEN", "Changing rooms", "Thin silver bracelet."],
  ["Power bank (Oraimo)", "FOUND", "electronics", "cafeteria", 110, [], "OPEN", null, "Oraimo 20,000mAh power bank, black."],
  ["Textbook: Engineering Maths", "LOST", "books", "engineering", 130, [], "OPEN", null, "Stroud Engineering Mathematics, name written inside the cover."],
  ["Library card", "FOUND", "ids-cards", "main-library", 150, ["idcard"], "OPEN", "Front desk", "Library card handed in at the front desk."],
  ["Red flask", "LOST", "bags", "halls", 170, ["bottle"], "OPEN", null, "Red flask with a dent near the bottom."],
  ["Black cap", "FOUND", "clothing", "student-union", 190, [], "OPEN", null, "Plain black cap."],
  ["Earphones (wired)", "FOUND", "electronics", "science-lt", 210, [], "OPEN", "LT 2", "Wired white earphones."],
  ["Motorbike key", "LOST", "keys", "sports", 230, ["keys"], "OPEN", "Car park", "Bajaj key with a blue tag."],
  ["Brown tote bag", "FOUND", "bags", "arts", 260, ["backpack"], "OPEN", null, "Brown canvas tote bag with a few pens inside."],
];

export const mockItems: ItemDetail[] = seeds.map(
  ([title, type, category, location, hoursAgo, photos, status = "OPEN", note, description], i) => ({
    id: `itm_${(i + 1).toString().padStart(3, "0")}`,
    title,
    type,
    category: label(categories, category),
    location: label(locations, location),
    date: ago(hoursAgo + 3),
    status,
    description: description ?? "",
    locationNote: note || null,
    media: photos.map((p, j) => ({ id: `${i}-${j}`, url: `/mock/${p}.svg`, kind: "IMAGE" as const })),
    postedAt: ago(hoursAgo),
    poster: { displayName: i % 5 === 3 ? "Anonymous" : ["Tobi A.", "Ada O.", "Kemi B.", "Emeka N."][i % 4] },
    isOwner: false,
    myClaim: null,
    claimCount: i % 3,
  }),
);

/** Mock filter keys use slugs; map back to labels for matching. */
export const categoryLabel = (v: string) => label(categories, v);
export const locationLabel = (v: string) => label(locations, v);
