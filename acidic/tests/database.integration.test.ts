import { randomUUID } from "node:crypto";
import postgres from "postgres";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Opt-in only: a disposable, migrated PostgreSQL (CI starts one). Exercises the real
// constraints, row locks and transactions behind the four services.
const enabled = process.env.RUN_DATABASE_TESTS === "1" && !!process.env.TEST_DATABASE_URL;
const owner = randomUUID();
let sql: ReturnType<typeof postgres>;

describe.runIf(enabled)("PostgreSQL integration", () => {
  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", process.env.TEST_DATABASE_URL!);
    sql = postgres(process.env.TEST_DATABASE_URL!, { max: 1, prepare: false, connect_timeout: 10 });
    await sql`insert into users (id, name, email, role) values (${owner}, 'Integration fixture', ${`${owner}@example.invalid`}, 'owner')`;
  });
  afterAll(async () => {
    if (!sql) return;
    await sql.begin(async (tx) => {
      await tx`delete from audit_log where actor_id = ${owner}`;
      await tx`delete from ledger_entries where recorded_by = ${owner}`;
      await tx`delete from shifts where created_by = ${owner}`;
      await tx`delete from staff_members where name like 'Fixture %'`;
      await tx`delete from stock_count_lines where count_id in (select id from stock_counts where counted_by = ${owner})`;
      await tx`delete from stock_counts where counted_by = ${owner}`;
      await tx`delete from stock_movements where recorded_by = ${owner}`;
      await tx`delete from stock_items where name like 'Fixture %'`;
      await tx`delete from events where created_by = ${owner}`;
      await tx`delete from users where id = ${owner}`;
    });
    await sql.end();
  });

  it("creates, transitions and refuses a conflicting event", async () => {
    const { createEvent, updateEvent } = await import("../src/lib/programme/service");
    const event = await createEvent(owner, { eventDate: "2031-08-14", title: "Fixture night" });
    expect(event.status).toBe("placeholder");
    await expect(updateEvent(owner, event.id, { eventDate: "2031-08-14", title: "Fixture night", status: "ticketed", ticketUrl: "https://example.invalid/t" })).rejects.toThrow(/cannot move/);
    const confirmed = await updateEvent(owner, event.id, { eventDate: "2031-08-14", title: "Fixture night", status: "confirmed" });
    expect(confirmed.status).toBe("confirmed");
    await expect(createEvent(owner, { eventDate: "2031-08-14", title: "Fixture hire", kind: "private_booking", status: "private" })).rejects.toThrow(/cannot share/);
    const audits = await sql`select action from audit_log where entity_id = ${event.id} order by created_at`;
    expect(audits.map((row) => row.action)).toEqual(["created", "status:placeholder->confirmed"]);
  });

  it("records a count and a movement with the database enforcing the numbers", async () => {
    const { createStockItem, recordStockCount, recordStockMovement } = await import("../src/lib/stock/service");
    const item = await createStockItem(owner, { name: "Fixture keg", category: "beer", unit: "keg", unitCost: 290, parLevel: 2 });
    await expect(createStockItem(owner, { name: "Fixture keg", category: "beer", unit: "keg", unitCost: 1, parLevel: 0 })).rejects.toThrow(/already exists/);
    const count = await recordStockCount(owner, { countDate: "2031-08-10", lines: [{ itemId: item.id, quantity: 1.5 }] });
    const [line] = await sql`select quantity from stock_count_lines where count_id = ${count.id}`;
    expect(line.quantity).toBe("1.50");
    await expect(recordStockMovement(owner, { itemId: item.id, movementDate: "2031-08-11", kind: "delivery", quantity: 0 })).rejects.toThrow();
    const delivery = await recordStockMovement(owner, { itemId: item.id, movementDate: "2031-08-11", kind: "delivery", quantity: 2 });
    expect(delivery.kind).toBe("delivery");
  });

  it("refuses overlapping shifts under a transaction", async () => {
    const { createShift, createStaffMember } = await import("../src/lib/staffing/service");
    const member = await createStaffMember(owner, { name: "Fixture bartender", defaultRole: "bartender", employmentType: "casual", hourlyRate: 34 });
    await createShift(owner, { staffId: member.id, shiftDate: "2031-08-14", startTime: "18:00", endTime: "24:00", role: "bartender" });
    await expect(createShift(owner, { staffId: member.id, shiftDate: "2031-08-14", startTime: "22:00", endTime: "23:00", role: "bartender" })).rejects.toThrow(/overlapping/);
  });

  it("stores a consistent GST split and voids with a reason", async () => {
    const { recordLedgerEntry, voidLedgerEntry } = await import("../src/lib/accounting/service");
    const entry = await recordLedgerEntry(owner, { entryDate: "2031-08-08", kind: "income", category: "bar_takings", description: "Fixture takings", total: 2860.5, paymentMethod: "card" });
    expect(entry.gst).toBe("260.05");
    expect(entry.subtotal).toBe("2600.45");
    const voided = await voidLedgerEntry(owner, entry.id, { reason: "Entered twice" });
    expect(voided.voidedAt).not.toBeNull();
    await expect(voidLedgerEntry(owner, entry.id, { reason: "again" })).rejects.toThrow(/already void/);
  });
});
