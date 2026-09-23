/** The preview workspace: fictional but realistic Acidity data, seeded with the August 2026
 * programme exactly as it stands on acidity.com.au so the website export can be checked
 * against the real thing. Prices, rates and stock costs are illustrative, not the venue's. */
import type { OverviewEvent } from "@/lib/today/overview";
import type { LedgerEntry } from "@/lib/accounting/ledger";
import type { Shift, StaffMember } from "@/lib/staffing/roster";
import type { CountLine, StockItem } from "@/lib/stock/engine";
import { ledgerSplit } from "@/lib/accounting/ledger";
import type { Recipe, RecipeLine } from "@/lib/recipes/engine";
import { recipeSeedSchema } from "./bar-seed";
import recipeBookJson from "../../../data/recipes.json";

export const FIXTURE_USER = { id: "00000000-0000-4000-8000-000000000001", name: "Preview owner", role: "owner" };

/** The recipe book is real - it is what the bar pours, not a fictional record - so the preview
 * shows the same list the live database is seeded with. Ingredients read unlinked here because
 * linking points at real stock rows, which the preview does not have. */
const recipeBook = recipeSeedSchema.parse(recipeBookJson);
export const recipes: Recipe[] = recipeBook.recipes.map((recipe, index) => ({
  id: `recipe-${index + 1}`,
  name: recipe.name,
  kind: recipe.kind,
  family: recipe.family ?? null,
  glass: recipe.glass ?? null,
  method: recipe.method,
  methodNote: recipe.methodNote ?? null,
  garnish: recipe.garnish ?? null,
  menuPrice: recipe.menuPrice ?? null,
  notes: recipe.notes ?? null,
  active: true,
  lines: recipe.lines.map((line, position) => ({
    id: `recipe-${index + 1}-${position + 1}`,
    ingredient: line.ingredient,
    quantity: line.quantity ?? null,
    unit: (line.unit ?? null) as RecipeLine["unit"],
    itemId: null,
    note: line.note ?? null,
  })),
}));

export const events: OverviewEvent[] = [
  { id: "e1", eventDate: "2026-08-01", title: "The Music of Wes Montgomery", artist: "Tony Yang Trio", genre: "Jazz Trio", kind: "night_session", status: "ticketed", startTime: "20:00", ticketUrl: "https://events.humanitix.com/music-of-montgomery-or-tony-yang-jazz-trio-live-performance/tickets", description: "Tony Yang, Charlie Rank and Zayne Guo play the music of Wes Montgomery.", staffRequired: 3 },
  { id: "e2", eventDate: "2026-08-02", title: "Coffee Rave + Jazz Jam", artist: "Session 04", genre: null, kind: "day_programme", status: "free_rsvp", startTime: "14:00", endTime: "22:00", ticketUrl: "https://events.humanitix.com/coffee-rave-jazz-jam-or-jazz-jam-dj-sunday-party-at-acidity/tickets", description: "2–5pm coffee rave, 5–10pm open jazz jam. Free entry, RSVP recommended.", staffRequired: 3 },
  { id: "e3", eventDate: "2026-08-08", title: "Tripside Life Quartet", artist: null, genre: "Acid Jazz / Funk", kind: "night_session", status: "ticketed", startTime: "19:30", ticketUrl: "https://events.humanitix.com/acid-jazz-funk-live-music-by-tripside-life-quartet/tickets", description: "Acid jazz / funk — original jazz and hypnotic grooves.", staffRequired: 3 },
  { id: "e4", eventDate: "2026-08-09", title: "Private function", artist: null, genre: null, kind: "private_booking", status: "private", startTime: "15:00", endTime: "20:00", ticketUrl: null, description: "3pm–8pm exclusive hire.", staffRequired: 2 },
  { id: "e5", eventDate: "2026-08-10", title: "Cerros / Marks Quintet", artist: null, genre: "Two Trumpets", kind: "night_session", status: "ticketed", startTime: "19:30", ticketUrl: "https://events.humanitix.com/2-trumpets-jazz-quintet-or-cerros-marks-quintet-live-jazz-gig/tickets", description: "Two trumpets, one night only.", staffRequired: 3 },
  { id: "e6", eventDate: "2026-08-14", title: "Afro Jazz/AfroSpace Interchange", artist: null, genre: "Afro Jazz", kind: "night_session", status: "confirmed", startTime: null, ticketUrl: null, description: null, staffRequired: 2 },
  { id: "e7", eventDate: "2026-08-15", title: "Late Night Jazz", artist: null, genre: "Afro-Jazz", kind: "night_session", status: "confirmed", startTime: null, ticketUrl: null, description: "Late night jazz & exclusive wine/sake session.", staffRequired: 2 },
  { id: "e8", eventDate: "2026-08-20", title: "Jazz Lineup", artist: null, genre: "Night Session", kind: "night_session", status: "placeholder", startTime: null, ticketUrl: null, description: null, staffRequired: 2 },
  { id: "e9", eventDate: "2026-08-21", title: "Live Session", artist: null, genre: null, kind: "night_session", status: "placeholder", startTime: null, ticketUrl: null, description: null, staffRequired: 2 },
  { id: "e10", eventDate: "2026-08-22", title: "Jazz Fusion Lineup", artist: null, genre: "Jazz Fusion", kind: "night_session", status: "placeholder", startTime: null, ticketUrl: null, description: null, staffRequired: 2 },
  { id: "e11", eventDate: "2026-08-23", title: "J-Fusion & Hiphop", artist: "Chakamens", genre: "Nagoya, JP", kind: "night_session", status: "confirmed", startTime: null, ticketUrl: null, description: "By Chakamens — Nagoya, JP.", staffRequired: 2 },
  { id: "e12", eventDate: "2026-08-28", title: "Private function", artist: null, genre: null, kind: "private_booking", status: "private", startTime: null, ticketUrl: null, description: null, staffRequired: 2 },
  { id: "e13", eventDate: "2026-08-29", title: "Rock Lineup", artist: null, genre: "Rock", kind: "night_session", status: "placeholder", startTime: null, ticketUrl: null, description: null, staffRequired: 2 },
];

export const staff: StaffMember[] = [
  { id: "s1", name: "Mia (barista)", hourlyRate: 32.5, employmentType: "casual" },
  { id: "s2", name: "Jae (bartender)", hourlyRate: 34, employmentType: "casual" },
  { id: "s3", name: "Ren (floor)", hourlyRate: 30, employmentType: "casual" },
  { id: "s4", name: "Sam (manager)", hourlyRate: 38, employmentType: "part_time" },
];

export const shifts: Shift[] = [
  { staffId: "s1", shiftDate: "2026-08-08", startTime: "08:00", endTime: "16:00", role: "barista", status: "worked", breakMinutes: 30 },
  { staffId: "s2", shiftDate: "2026-08-08", startTime: "18:00", endTime: "24:00", role: "bartender", status: "worked", breakMinutes: 0 },
  { staffId: "s3", shiftDate: "2026-08-08", startTime: "18:30", endTime: "23:30", role: "floor", status: "worked", breakMinutes: 0 },
  { staffId: "s4", shiftDate: "2026-08-08", startTime: "18:00", endTime: "24:00", role: "manager", status: "worked", breakMinutes: 0 },
  { staffId: "s2", shiftDate: "2026-08-10", startTime: "18:00", endTime: "23:00", role: "bartender", status: "rostered", breakMinutes: 0 },
  { staffId: "s4", shiftDate: "2026-08-10", startTime: "18:00", endTime: "23:00", role: "manager", status: "rostered", breakMinutes: 0 },
  { staffId: "s2", shiftDate: "2026-08-14", startTime: "18:00", endTime: "24:00", role: "bartender", status: "rostered", breakMinutes: 0 },
  { staffId: "s1", shiftDate: "2026-08-15", startTime: "08:00", endTime: "16:00", role: "barista", status: "rostered", breakMinutes: 30 },
];

export const items: StockItem[] = [
  { id: "i1", name: "Espresso beans (1kg)", category: "coffee", unit: "kg", unitCost: 42, parLevel: 8 },
  { id: "i2", name: "Oat milk (1L)", category: "milk_dairy", unit: "litre", unitCost: 3.2, parLevel: 24 },
  { id: "i3", name: "Full cream milk (2L)", category: "milk_dairy", unit: "each", unitCost: 3.6, parLevel: 20 },
  { id: "i4", name: "Craft lager keg (50L)", category: "beer", unit: "keg", unitCost: 290, parLevel: 2 },
  { id: "i5", name: "Pale ale keg (50L)", category: "beer", unit: "keg", unitCost: 310, parLevel: 2 },
  { id: "i6", name: "House red (750ml)", category: "wine", unit: "bottle", unitCost: 14.5, parLevel: 18 },
  { id: "i7", name: "House white (750ml)", category: "wine", unit: "bottle", unitCost: 13, parLevel: 18 },
  { id: "i8", name: "Junmai sake (720ml)", category: "sake", unit: "bottle", unitCost: 28, parLevel: 8 },
  { id: "i9", name: "Roku gin (700ml)", category: "spirits", unit: "bottle", unitCost: 58, parLevel: 4 },
  { id: "i10", name: "Matcha (100g)", category: "coffee", unit: "pack", unitCost: 24, parLevel: 6 },
];

export const previousCount: { countDate: string; lines: CountLine[] } = { countDate: "2026-08-03", lines: [
  { itemId: "i1", quantity: 9 }, { itemId: "i2", quantity: 30 }, { itemId: "i3", quantity: 22 }, { itemId: "i4", quantity: 2 }, { itemId: "i5", quantity: 2 },
  { itemId: "i6", quantity: 20 }, { itemId: "i7", quantity: 19 }, { itemId: "i8", quantity: 9 }, { itemId: "i9", quantity: 4 }, { itemId: "i10", quantity: 7 },
] };
export const latestCount: { countDate: string; lines: CountLine[] } = { countDate: "2026-08-10", lines: [
  { itemId: "i1", quantity: 5.5 }, { itemId: "i2", quantity: 14 }, { itemId: "i3", quantity: 21 }, { itemId: "i4", quantity: 1 }, { itemId: "i5", quantity: 0 },
  { itemId: "i6", quantity: 11 }, { itemId: "i7", quantity: 13 }, { itemId: "i8", quantity: 5 }, { itemId: "i9", quantity: 3 }, { itemId: "i10", quantity: 6 },
] };
export const movements = [
  { itemId: "i2", kind: "delivery" as const, quantity: 12 },
  { itemId: "i5", kind: "delivery" as const, quantity: 1 },
  { itemId: "i3", kind: "waste" as const, quantity: 2 },
  { itemId: "i6", kind: "delivery" as const, quantity: 6 },
];

const entry = (entryDate: string, kind: LedgerEntry["kind"], category: string, total: number, gstFree = false): LedgerEntry => ({ entryDate, kind, category, ...ledgerSplit({ total, gstFree, kind }) });
export const ledger: LedgerEntry[] = [
  entry("2026-08-01", "income", "bar_takings", 2860.5), entry("2026-08-01", "income", "ticket_sales", 640),
  entry("2026-08-01", "income", "coffee_takings", 1180.2),
  entry("2026-08-02", "income", "bar_takings", 1930), entry("2026-08-02", "income", "coffee_takings", 1420.75),
  entry("2026-08-03", "expense", "stock_purchase", 1289.4), entry("2026-08-03", "expense", "rent", 3200, true),
  entry("2026-08-05", "income", "coffee_takings", 890.4),
  entry("2026-08-07", "expense", "artist_fee", 600, true),
  entry("2026-08-08", "income", "bar_takings", 3105.9), entry("2026-08-08", "income", "ticket_sales", 720), entry("2026-08-08", "income", "coffee_takings", 1010),
  entry("2026-08-09", "income", "venue_hire", 1650), entry("2026-08-09", "income", "bar_takings", 980),
  entry("2026-08-10", "wages", "wages_payment", 2214.5, true), entry("2026-08-10", "expense", "stock_purchase", 812.3), entry("2026-08-10", "expense", "utilities", 410.6),
];
