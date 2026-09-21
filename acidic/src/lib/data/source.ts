/** One place every screen reads from. In preview it is the fixture workspace; in live it is
 * PostgreSQL. Screens never know which - and live never falls back to fixtures. */
import { desc, eq } from "drizzle-orm";
import { appMode, liveConfigured } from "@/lib/mode";
import { money } from "@/lib/money";
import type { OverviewEvent } from "@/lib/today/overview";
import type { LedgerEntry } from "@/lib/accounting/ledger";
import type { Shift, StaffMember } from "@/lib/staffing/roster";
import type { CountLine, StockItem } from "@/lib/stock/engine";
import type { EventStatus } from "@/lib/programme/vocab";
import * as fixtures from "./fixtures";

export type Workspace = {
  events: OverviewEvent[];
  staff: (StaffMember & { defaultRole: string; active: boolean })[];
  shifts: (Shift & { id: string })[];
  items: (StockItem & { supplier: string | null; active: boolean })[];
  latestCount: { id: string | null; countDate: string; lines: CountLine[] } | null;
  previousCount: { id: string | null; countDate: string; lines: CountLine[] } | null;
  movements: { itemId: string; kind: "delivery" | "waste" | "adjustment"; quantity: number }[];
  ledger: (LedgerEntry & { id: string; description: string; paymentMethod: string | null })[];
};

export function isLive() { return appMode() === "live" && liveConfigured(); }

export async function loadWorkspace(): Promise<Workspace> {
  if (!isLive()) {
    return {
      events: fixtures.events,
      staff: fixtures.staff.map((member) => ({ ...member, defaultRole: member.name.replace(/.*\((.*)\)/, "$1"), active: true })),
      shifts: fixtures.shifts.map((shift, index) => ({ ...shift, id: `shift-${index + 1}` })),
      items: fixtures.items.map((item) => ({ ...item, supplier: null, active: true })),
      latestCount: { id: null, ...fixtures.latestCount },
      previousCount: { id: null, ...fixtures.previousCount },
      movements: fixtures.movements,
      ledger: fixtures.ledger.map((entry, index) => ({ ...entry, id: `ledger-${index + 1}`, description: entry.category.replace(/_/g, " "), paymentMethod: null })),
    };
  }
  const { db } = await import("@/db/client");
  const schema = await import("@/db/schema");
  const database = db();
  const [eventRows, staffRows, shiftRows, itemRows, countRows, movementRows, ledgerRows] = await Promise.all([
    database.select().from(schema.events).orderBy(schema.events.eventDate),
    database.select().from(schema.staffMembers).orderBy(schema.staffMembers.name),
    database.select().from(schema.shifts).orderBy(schema.shifts.shiftDate, schema.shifts.startTime),
    database.select().from(schema.stockItems).orderBy(schema.stockItems.category, schema.stockItems.name),
    database.select().from(schema.stockCounts).orderBy(desc(schema.stockCounts.countDate), desc(schema.stockCounts.createdAt)).limit(2),
    database.select().from(schema.stockMovements).orderBy(schema.stockMovements.movementDate),
    database.select().from(schema.ledgerEntries).orderBy(desc(schema.ledgerEntries.entryDate), desc(schema.ledgerEntries.createdAt)),
  ]);
  const countWithLines = async (count: (typeof countRows)[number] | undefined) => {
    if (!count) return null;
    const lines = await database.select().from(schema.stockCountLines).where(eq(schema.stockCountLines.countId, count.id));
    return { id: count.id, countDate: count.countDate, lines: lines.map((line) => ({ itemId: line.itemId, quantity: Number(line.quantity) })) };
  };
  const [latestCount, previousCount] = await Promise.all([countWithLines(countRows[0]), countWithLines(countRows[1])]);
  const movementFloor = previousCount?.countDate ?? "0000-00-00";
  return {
    events: eventRows.map((row) => ({ id: row.id, eventDate: row.eventDate, title: row.title, artist: row.artist, genre: row.genre, kind: row.kind, status: row.status as EventStatus, startTime: row.startTime, ticketUrl: row.ticketUrl, description: row.description, staffRequired: row.staffRequired })),
    staff: staffRows.map((row) => ({ id: row.id, name: row.name, hourlyRate: money(row.hourlyRate), employmentType: row.employmentType, defaultRole: row.defaultRole, active: row.active === 1 })),
    shifts: shiftRows.map((row) => ({ id: row.id, staffId: row.staffId, shiftDate: row.shiftDate, startTime: row.startTime, endTime: row.endTime, role: row.role, status: row.status, breakMinutes: row.breakMinutes })),
    // Retired lines stay in the database for old counts but never in the reorder list or value.
    items: itemRows.filter((row) => row.active === 1).map((row) => ({ id: row.id, name: row.name, category: row.category, unit: row.unit, unitCost: money(row.unitCost), parLevel: Number(row.parLevel), supplier: row.supplier, active: true })),
    latestCount, previousCount,
    movements: movementRows.filter((row) => row.movementDate >= movementFloor && (!latestCount || row.movementDate <= latestCount.countDate)).map((row) => ({ itemId: row.itemId, kind: row.kind as "delivery" | "waste" | "adjustment", quantity: Number(row.quantity) })),
    ledger: ledgerRows.map((row) => ({ id: row.id, entryDate: row.entryDate, kind: row.kind as LedgerEntry["kind"], category: row.category, description: row.description, total: money(row.total), gst: money(row.gst), subtotal: money(row.subtotal), paymentMethod: row.paymentMethod, voidedAt: row.voidedAt?.toISOString() ?? null })),
  };
}
