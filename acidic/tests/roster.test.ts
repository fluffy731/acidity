import { describe, expect, it } from "vitest";
import { eventCoverage, overlappingShifts, paidHours, rosterSummary, shiftCost, shiftInputSchema } from "../src/lib/staffing/roster";
import { events, shifts, staff } from "../src/lib/data/fixtures";

describe("roster", () => {
  it("pays the shift less its break, in exact cents", () => {
    const barista = shifts[0]; // 08:00-16:00, 30 min break, $32.50
    expect(paidHours(barista)).toBe(7.5);
    expect(shiftCost(barista, staff[0])).toBe(243.75);
    const late = shifts[1]; // 18:00-24:00, $34
    expect(paidHours(late)).toBe(6);
    expect(shiftCost(late, staff[1])).toBe(204);
  });
  it("summarises rostered hours and cost, and separately what was worked", () => {
    const all = rosterSummary(shifts, staff);
    expect(all.shifts).toBe(8);
    expect(all.hours).toBe(48);
    const worked = rosterSummary(shifts, staff, ["worked"]);
    expect(worked.shifts).toBe(4);
    expect(worked.cost).toBe(243.75 + 204 + 150 + 228);
  });
  it("finds two shifts for one person that overlap", () => {
    expect(overlappingShifts(shifts)).toHaveLength(0);
    const clash = [...shifts, { staffId: "s2", shiftDate: "2026-08-08", startTime: "22:00", endTime: "23:00", role: "bartender", status: "rostered", breakMinutes: 0 }];
    expect(overlappingShifts(clash)).toHaveLength(1);
    expect(overlappingShifts([...shifts, { staffId: "s2", shiftDate: "2026-08-08", startTime: "16:00", endTime: "18:00", role: "bartender", status: "rostered", breakMinutes: 0 }])).toHaveLength(0);
  });
  it("checks each gig night against the people on that date", () => {
    const coverage = eventCoverage(events.filter((event) => event.kind !== "private_booking"), shifts);
    expect(coverage.find((row) => row.eventDate === "2026-08-08")).toMatchObject({ required: 3, rostered: 4, short: 0 });
    expect(coverage.find((row) => row.eventDate === "2026-08-10")).toMatchObject({ required: 3, rostered: 2, short: 1 });
    expect(coverage.find((row) => row.eventDate === "2026-08-20")).toMatchObject({ required: 2, rostered: 0, short: 2 });
  });
  it("refuses a shift that ends before it starts or runs past 14 hours", () => {
    const base = { staffId: "6b1f2f3e-1111-4a5b-8c9d-000000000001", shiftDate: "2026-08-08", role: "bartender" };
    expect(shiftInputSchema.safeParse({ ...base, startTime: "18:00", endTime: "17:00" }).success).toBe(false);
    expect(shiftInputSchema.safeParse({ ...base, startTime: "08:00", endTime: "24:00" }).success).toBe(false);
    expect(shiftInputSchema.safeParse({ ...base, startTime: "18:00", endTime: "24:00" }).success).toBe(true);
    expect(shiftInputSchema.safeParse({ ...base, startTime: "18:00", endTime: "19:00", breakMinutes: 60 }).success).toBe(false);
  });
});
