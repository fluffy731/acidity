import { describe, expect, it } from "vitest";
import { basSummary, dailyTakings, ledgerInputSchema, ledgerSplit, profitAndLoss } from "../src/lib/accounting/ledger";
import { splitIsConsistent } from "../src/lib/money";
import { ledger } from "../src/lib/data/fixtures";

describe("ledger", () => {
  it("splits a GST-inclusive total once, and stores wages and GST-free with zero GST", () => {
    expect(ledgerSplit({ total: 2860.5, gstFree: false, kind: "income" })).toEqual({ subtotal: 2600.45, gst: 260.05, total: 2860.5 });
    expect(ledgerSplit({ total: 3200, gstFree: true, kind: "expense" })).toEqual({ subtotal: 3200, gst: 0, total: 3200 });
    expect(ledgerSplit({ total: 2214.5, gstFree: false, kind: "wages" }).gst).toBe(0);
    for (const entry of ledger) expect(splitIsConsistent(entry)).toBe(true);
  });
  it("keeps kinds and categories honest", () => {
    const base = { entryDate: "2026-08-10", description: "x", total: 10 };
    expect(ledgerInputSchema.safeParse({ ...base, kind: "income", category: "rent" }).success).toBe(false);
    expect(ledgerInputSchema.safeParse({ ...base, kind: "expense", category: "bar_takings" }).success).toBe(false);
    expect(ledgerInputSchema.safeParse({ ...base, kind: "wages", category: "wages_payment" }).success).toBe(false); // wages must be gstFree
    expect(ledgerInputSchema.safeParse({ ...base, kind: "wages", category: "wages_payment", gstFree: true }).success).toBe(true);
    expect(ledgerInputSchema.safeParse({ ...base, kind: "income", category: "bar_takings", paymentMethod: "card" }).success).toBe(true);
  });
  it("builds a cash-basis P&L ex GST with stock as cost of goods and wages separate", () => {
    const pnl = profitAndLoss(ledger, "2026-08-01", "2026-08-10");
    expect(pnl.income).toBe(14897.96);
    expect(pnl.costOfGoods).toBe(1910.63);
    expect(pnl.wages).toBe(2214.5);
    expect(pnl.otherExpenses).toBe(4173.27);
    expect(pnl.grossProfit).toBe(12987.33);
    expect(pnl.netProfit).toBe(6599.56);
    expect(pnl.byCategory[0].category).toBe("bar_takings");
  });
  it("ignores void entries and respects the date range", () => {
    const voided = ledger.map((entry, index) => index === 0 ? { ...entry, voidedAt: "2026-08-11T00:00:00Z" } : entry);
    // 14897.96 - 2600.45 in floating point is 12297.509999999998 - the reason money is cents.
    expect(profitAndLoss(voided, "2026-08-01", "2026-08-10").income).toBe(12297.51);
    expect(profitAndLoss(ledger, "2026-08-09", "2026-08-09").income).toBe(2390.91);
  });
  it("reports working BAS figures for the quarter", () => {
    const bas = basSummary(ledger, "2026-08-10");
    expect(bas.label).toBe("FY2026-27 Q1");
    expect(bas.g1TotalSales).toBe(16387.75);
    expect(bas.oneAGstOnSales).toBe(1489.79);
    expect(bas.g11NonCapitalPurchases).toBe(6312.3);
    expect(bas.oneBGstOnPurchases).toBe(228.4);
    expect(bas.netGst).toBe(1261.39);
    expect(bas.wagesW1).toBe(2214.5);
  });
  it("totals one trading day", () => {
    expect(dailyTakings(ledger, "2026-08-08")).toEqual({ total: 4835.9, gst: 439.62 });
  });
});
