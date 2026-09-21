import { describe, expect, it } from "vitest";
import { buildOverview } from "../src/lib/today/overview";
import * as fixtures from "../src/lib/data/fixtures";

describe("Today overview joins the four domains", () => {
  const view = buildOverview({ today: "2026-08-10", events: fixtures.events, shifts: fixtures.shifts, staff: fixtures.staff, items: fixtures.items, latestCount: fixtures.latestCount, ledger: fixtures.ledger });
  it("shows the coming week's programme with roster coverage", () => {
    expect(view.thisWeek.events.map((event) => event.eventDate)).toEqual(["2026-08-10", "2026-08-14", "2026-08-15"]);
    expect(view.thisWeek.coverage.find((row) => row.eventDate === "2026-08-10")?.short).toBe(1);
  });
  it("raises the roster shortfall first, then stock, then the BAS note", () => {
    expect(view.attention[0]).toMatchObject({ severity: "urgent", area: "staffing" });
    expect(view.attention.some((item) => item.area === "stock" && item.severity === "urgent")).toBe(true); // pale ale at zero
    expect(view.attention.some((item) => item.area === "accounting")).toBe(false); // Q1 ends 30 Sept, not within 21 days of 10 Aug
  });
  it("carries the money figures through unchanged", () => {
    expect(view.money.weekTakings).toBe(8356.3);
    expect(view.money.monthToDate.netProfit).toBe(6599.56);
    expect(view.money.bas.label).toBe("FY2026-27 Q1");
    expect(view.stock.value).toBe(1427.9);
    expect(view.stock.reorderValue).toBeGreaterThan(620);
  });
  it("is calm when there is nothing to do", () => {
    const quiet = buildOverview({ today: "2026-09-15", events: [], shifts: [], staff: [], items: [], latestCount: { countDate: "2026-09-14", lines: [] }, ledger: [] });
    expect(quiet.thisWeek.events).toHaveLength(0);
    expect(quiet.attention.filter((item) => item.severity !== "note")).toHaveLength(0);
  });
});
