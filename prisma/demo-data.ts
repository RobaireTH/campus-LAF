export type DemoKyc = "VERIFIED" | "PENDING" | "REJECTED";
export type DemoItemStatus = "OPEN" | "CLAIMED" | "RESOLVED" | "REMOVED";

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  kyc: DemoKyc;
  idPhoto?: string;
  submittedHoursAgo?: number;
  rejectionReason?: string;
}

export interface DemoItem {
  id: string;
  type: "LOST" | "FOUND";
  title: string;
  description: string;
  category: string;
  location: string;
  locationNote?: string;
  poster: string;
  status: DemoItemStatus;
  eventDaysAgo: number;
  postedHoursAgo: number;
  photos: string[];
}

export interface DemoClaim {
  id: string;
  item: string;
  claimant: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  proof: string;
  photos: string[];
  hoursAgo: number;
  handoverCode?: string;
}

export interface DemoReport {
  id: string;
  item: string;
  reporter: string;
  reason: "spam" | "fake" | "personal" | "offensive" | "other";
  details?: string;
  status: "OPEN" | "ACTIONED";
  hoursAgo: number;
}

export const DEMO_USERS: DemoUser[] = [
  { id: "demo-user-amaka", name: "Amaka Obi", email: "amaka.obi@campuslaf.test", phone: "+2340000000001", kyc: "VERIFIED" },
  { id: "demo-user-tunde", name: "Tunde Bello", email: "tunde.bello@campuslaf.test", phone: "+2340000000002", kyc: "VERIFIED" },
  { id: "demo-user-ngozi", name: "Ngozi Eze", email: "ngozi.eze@campuslaf.test", phone: "+2340000000003", kyc: "VERIFIED" },
  { id: "demo-user-emeka", name: "Emeka Nwosu", email: "emeka.nwosu@campuslaf.test", phone: "+2340000000004", kyc: "VERIFIED" },
  { id: "demo-user-chidi", name: "Chidi Okafor", email: "chidi.okafor@campuslaf.test", phone: "+2340000000005", kyc: "PENDING", idPhoto: "kyc-chidi", submittedHoursAgo: 3 },
  { id: "demo-user-zainab", name: "Zainab Musa", email: "zainab.musa@campuslaf.test", phone: "+2340000000006", kyc: "PENDING", idPhoto: "kyc-zainab", submittedHoursAgo: 20 },
  {
    id: "demo-user-tolu",
    name: "Tolu Adeyemi",
    email: "tolu.adeyemi@campuslaf.test",
    phone: "+2340000000007",
    kyc: "REJECTED",
    idPhoto: "kyc-tolu",
    submittedHoursAgo: 30,
    rejectionReason: "The photo is too blurry to read. Take it again in good light.",
  },
  { id: "demo-user-deals", name: "Quick Deals", email: "quick.deals@campuslaf.test", phone: "+2340000000008", kyc: "VERIFIED" },
];

export const DEMO_ITEMS: DemoItem[] = [
  {
    id: "demo-item-spam",
    type: "FOUND",
    title: "Brand new iPhones for sale, DM now",
    description: "Cheap iPhone 15 and PS5, pay first and I deliver to your hostel. Message me today before they finish.",
    category: "Electronics",
    location: "Main Gate",
    poster: "demo-user-deals",
    status: "OPEN",
    eventDaysAgo: 0,
    postedHoursAgo: 105,
    photos: [],
  },
  {
    id: "demo-item-id-card",
    type: "FOUND",
    title: "Student ID card (name covered)",
    description: "Found on a bench outside the Student Union Building. Blue card, Science faculty. I covered the name in the photo, so message me the matric number to claim it.",
    category: "ID cards",
    location: "Student Union Building",
    locationNote: "Bench by the notice boards",
    poster: "demo-user-tunde",
    status: "OPEN",
    eventDaysAgo: 1,
    postedHoursAgo: 5,
    photos: ["id-card-found"],
  },
  {
    id: "demo-item-phone",
    type: "LOST",
    title: "White Samsung phone",
    description: "Lost at the cafeteria around lunch time. White back cover, grey geometric wallpaper on the lock screen. Please check the lost phones at the front desk too.",
    category: "Electronics",
    location: "Cafeteria",
    poster: "demo-user-emeka",
    status: "OPEN",
    eventDaysAgo: 1,
    postedHoursAgo: 8,
    photos: ["phone-white"],
  },
  {
    id: "demo-item-keys",
    type: "LOST",
    title: "House keys with a black fob",
    description: "Two keys and a black fob. Lost between the cafeteria and the main gate on Tuesday evening. The fob has a small scratch on one side.",
    category: "Keys",
    location: "Cafeteria",
    locationNote: "Probably on the path to the main gate",
    poster: "demo-user-tunde",
    status: "OPEN",
    eventDaysAgo: 1,
    postedHoursAgo: 14,
    photos: ["house-keys"],
  },
  {
    id: "demo-item-laptop",
    type: "LOST",
    title: "Silver laptop in a grey sleeve",
    description: "Lost after the MTH 101 tutorial. 14-inch silver laptop in a grey felt sleeve, charger inside. It has my final-year project on it, so any lead helps.",
    category: "Electronics",
    location: "Main Library",
    locationNote: "Second-floor reading hall",
    poster: "demo-user-amaka",
    status: "OPEN",
    eventDaysAgo: 1,
    postedHoursAgo: 20,
    photos: ["laptop-silver"],
  },
  {
    id: "demo-item-mini-backpack",
    type: "FOUND",
    title: "Cream mini backpack",
    description: "Found near the steps of the Student Union Building. Drawstring top and a zip pocket at the front. Looks barely used.",
    category: "Bags",
    location: "Student Union Building",
    poster: "demo-user-amaka",
    status: "CLAIMED",
    eventDaysAgo: 1,
    postedHoursAgo: 26,
    photos: ["mini-backpack"],
  },
  {
    id: "demo-item-sunglasses",
    type: "FOUND",
    title: "Yellow sunglasses",
    description: "Found on the bleachers after the inter-faculty match. Bright yellow frame with dark lenses.",
    category: "Other",
    location: "Sports Complex",
    poster: "demo-user-ngozi",
    status: "OPEN",
    eventDaysAgo: 2,
    postedHoursAgo: 30,
    photos: ["sunglasses-yellow"],
  },
  {
    id: "demo-item-umbrella",
    type: "FOUND",
    title: "Red umbrella",
    description: "Found leaning against the wall near the Main Gate after the rain on Monday. Automatic opening, red canopy, black handle.",
    category: "Other",
    location: "Main Gate",
    poster: "demo-user-tunde",
    status: "OPEN",
    eventDaysAgo: 2,
    postedHoursAgo: 36,
    photos: ["umbrella-red"],
  },
  {
    id: "demo-item-rucksack",
    type: "FOUND",
    title: "Brown canvas rucksack",
    description: "Found at the Sports Complex after the evening football match. Waxed canvas with leather straps and a blue cap clipped to the side. There are things inside, so please describe them when you claim it.",
    category: "Bags",
    location: "Sports Complex",
    locationNote: "On the bench near the east goal",
    poster: "demo-user-amaka",
    status: "OPEN",
    eventDaysAgo: 2,
    postedHoursAgo: 40,
    photos: ["rucksack", "rucksack-side"],
  },
  {
    id: "demo-item-bottle",
    type: "FOUND",
    title: "Clear water bottle",
    description: "Found in the changing rooms at the Sports Complex. Half full, blue cap.",
    category: "Other",
    location: "Sports Complex",
    poster: "demo-user-emeka",
    status: "OPEN",
    eventDaysAgo: 1,
    postedHoursAgo: 46,
    photos: ["water-bottle"],
  },
  {
    id: "demo-item-glasses",
    type: "FOUND",
    title: "Black-framed glasses",
    description: "Found on a desk in the library, next to a magazine. Thin black frames, looks like a reading prescription.",
    category: "Other",
    location: "Main Library",
    poster: "demo-user-tunde",
    status: "OPEN",
    eventDaysAgo: 2,
    postedHoursAgo: 52,
    photos: ["glasses-black"],
  },
  {
    id: "demo-item-headphones",
    type: "FOUND",
    title: "Black over-ear headphones",
    description: "Found on a laptop in the study room. Padded ear cups and a braided cable. There is a small mark on the left cup.",
    category: "Electronics",
    location: "Student Union Building",
    poster: "demo-user-amaka",
    status: "OPEN",
    eventDaysAgo: 3,
    postedHoursAgo: 58,
    photos: ["headphones-black", "headphones-black-2"],
  },
  {
    id: "demo-item-textbooks",
    type: "LOST",
    title: "Two physics textbooks",
    description: "Left in a lecture theatre in the Faculty of Science. One has a green sticky tab at chapter 4 and my name is inside the cover.",
    category: "Books & notes",
    location: "Faculty of Science",
    poster: "demo-user-ngozi",
    status: "OPEN",
    eventDaysAgo: 3,
    postedHoursAgo: 64,
    photos: ["textbooks", "textbooks-open"],
  },
  {
    id: "demo-item-scarf",
    type: "FOUND",
    title: "Green knitted scarf",
    description: "Found on a seat in Oduduwa Hall after the Friday lecture. Soft green wool with fringes.",
    category: "Clothing",
    location: "Oduduwa Hall",
    poster: "demo-user-ngozi",
    status: "OPEN",
    eventDaysAgo: 4,
    postedHoursAgo: 72,
    photos: ["scarf-green"],
  },
  {
    id: "demo-item-calculator",
    type: "LOST",
    title: "Blue Casio calculator",
    description: "Lost in a lecture theatre in the Faculty of Science. Blue Casio desk calculator, a bit scuffed on one corner.",
    category: "Electronics",
    location: "Faculty of Science",
    poster: "demo-user-ngozi",
    status: "OPEN",
    eventDaysAgo: 4,
    postedHoursAgo: 80,
    photos: ["calculator-casio"],
  },
  {
    id: "demo-item-wooden-watch",
    type: "FOUND",
    title: "Wooden watch with a tan strap",
    description: "Found on a table in the cafeteria. Wooden case, cream dial, tan leather strap.",
    category: "Jewelry",
    location: "Cafeteria",
    poster: "demo-user-emeka",
    status: "OPEN",
    eventDaysAgo: 3,
    postedHoursAgo: 90,
    photos: ["watch-wooden"],
  },
  {
    id: "demo-item-duffel",
    type: "LOST",
    title: "Brown leather duffel bag",
    description: "Left at the Main Gate bus stop. Brass buckles and a long strap, contains gym clothes and trainers.",
    category: "Bags",
    location: "Main Gate",
    poster: "demo-user-tunde",
    status: "OPEN",
    eventDaysAgo: 5,
    postedHoursAgo: 100,
    photos: ["duffel-bag"],
  },
  {
    id: "demo-item-notebook",
    type: "LOST",
    title: "Lined notebook, MTH 101",
    description: "Lined A4 notebook with my MTH 101 notes. Lost in the library, there is a pencil sharpener tucked inside.",
    category: "Books & notes",
    location: "Main Library",
    poster: "demo-user-ngozi",
    status: "OPEN",
    eventDaysAgo: 5,
    postedHoursAgo: 110,
    photos: ["notebook-lined"],
  },
  {
    id: "demo-item-earphones",
    type: "LOST",
    title: "White wired earphones",
    description: "Dropped somewhere in the library reading hall. They were tangled around my phone cable.",
    category: "Electronics",
    location: "Main Library",
    poster: "demo-user-emeka",
    status: "OPEN",
    eventDaysAgo: 6,
    postedHoursAgo: 120,
    photos: ["earphones-white"],
  },
  {
    id: "demo-item-wristwatch",
    type: "LOST",
    title: "Silver chronograph wristwatch",
    description: "Lost near Oduduwa Hall during the convocation rehearsal. Steel bracelet and a cream dial. It was my grandfather's, so it means a lot.",
    category: "Jewelry",
    location: "Oduduwa Hall",
    poster: "demo-user-ngozi",
    status: "OPEN",
    eventDaysAgo: 7,
    postedHoursAgo: 140,
    photos: ["wristwatch-silver"],
  },
  {
    id: "demo-item-rain-jacket",
    type: "FOUND",
    title: "Orange rain jacket",
    description: "Left in the Health Centre waiting area. Waterproof with a drawstring hood. Returned to its owner.",
    category: "Clothing",
    location: "Health Centre",
    poster: "demo-user-amaka",
    status: "RESOLVED",
    eventDaysAgo: 6,
    postedHoursAgo: 150,
    photos: ["rain-jacket"],
  },
  {
    id: "demo-item-camera",
    type: "LOST",
    title: "Small film camera",
    description: "Compact black film camera with a wrist strap. Lost on the lawn outside the Faculty of Science during orientation week.",
    category: "Electronics",
    location: "Faculty of Science",
    poster: "demo-user-amaka",
    status: "OPEN",
    eventDaysAgo: 8,
    postedHoursAgo: 160,
    photos: ["film-camera"],
  },
  {
    id: "demo-item-removed",
    type: "LOST",
    title: "PS5 giveaway, click the link",
    description: "Free PS5 for the first 50 people, send your bank details to the number in my profile.",
    category: "Electronics",
    location: "Main Gate",
    poster: "demo-user-deals",
    status: "REMOVED",
    eventDaysAgo: 3,
    postedHoursAgo: 75,
    photos: [],
  },
];

export const DEMO_CLAIMS: DemoClaim[] = [
  {
    id: "demo-claim-rucksack-tunde",
    item: "demo-item-rucksack",
    claimant: "demo-user-tunde",
    status: "PENDING",
    proof: "It is my brother's rucksack that I borrowed for training. The blue cap on the side has TB written inside the band, and there is a packet of tissues and a red pen in the front pocket. I attached the receipt.",
    photos: ["receipt-rucksack"],
    hoursAgo: 12,
  },
  {
    id: "demo-claim-rucksack-emeka",
    item: "demo-item-rucksack",
    claimant: "demo-user-emeka",
    status: "PENDING",
    proof: "I left it after training at about 8pm. Inside the main pocket there is an HP laptop charger, a blue notebook and a half-empty water bottle.",
    photos: [],
    hoursAgo: 5,
  },
  {
    id: "demo-claim-headphones-emeka",
    item: "demo-item-headphones",
    claimant: "demo-user-emeka",
    status: "PENDING",
    proof: "These are mine. I bought them last year, the left cup has a small scratch and the cable is the braided one that came in the box. The receipt is attached.",
    photos: ["receipt-headphones"],
    hoursAgo: 9,
  },
  {
    id: "demo-claim-mini-backpack-ngozi",
    item: "demo-item-mini-backpack",
    claimant: "demo-user-ngozi",
    status: "APPROVED",
    proof: "It is the cream backpack I bought for my sister. Inside the front zip pocket there is a pink lip balm and a bus ticket from Tuesday. Receipt attached.",
    photos: ["receipt-mini-backpack"],
    hoursAgo: 20,
    handoverCode: "K7P2XM",
  },
  {
    id: "demo-claim-mini-backpack-tunde",
    item: "demo-item-mini-backpack",
    claimant: "demo-user-tunde",
    status: "REJECTED",
    proof: "I think this looks like my girlfriend's bag.",
    photos: [],
    hoursAgo: 22,
  },
  {
    id: "demo-claim-rain-jacket-tunde",
    item: "demo-item-rain-jacket",
    claimant: "demo-user-tunde",
    status: "APPROVED",
    proof: "Orange waterproof jacket, size L. The left pocket has a small hole and my name tag T. Bello is sewn inside the collar.",
    photos: [],
    hoursAgo: 140,
    handoverCode: "R4N8QZ",
  },
];

export const DEMO_REPORTS: DemoReport[] = [
  {
    id: "demo-report-spam-amaka",
    item: "demo-item-spam",
    reporter: "demo-user-amaka",
    reason: "spam",
    details: "This is selling phones, not a lost or found item.",
    status: "OPEN",
    hoursAgo: 1.5,
  },
  {
    id: "demo-report-spam-ngozi",
    item: "demo-item-spam",
    reporter: "demo-user-ngozi",
    reason: "fake",
    details: "Asks for payment first. Looks like a scam.",
    status: "OPEN",
    hoursAgo: 0.75,
  },
  {
    id: "demo-report-removed-tunde",
    item: "demo-item-removed",
    reporter: "demo-user-tunde",
    reason: "spam",
    status: "ACTIONED",
    hoursAgo: 70,
  },
];
