import { describe, expect, it } from "vitest";
import { addDays, basQuarter, dayOfWeek, financialYear, melbourneDate, toMinutes, weekStart } from "../src/lib/dates";

describe("Melbourne dates", () => {
  it("reads the calendar date in Melbourne, not the server's zone", () => {
    // 2026-08-02 23:47 UTC is 3 Aug 09:47 AEST.
    expect(melbourneDate(new Date("2026-08-02T23:47:05Z"))).toBe("2026-08-03");
    expect(melbourneDate(new Date("2026-08-02T10:00:00Z"))).toBe("2026-08-02");
  });
  it("knows the August 2026 weekdays the programme uses", () => {
    expect(dayOfWeek("2026-08-01")).toBe(6); // Saturday
    expect(dayOfWeek("2026-08-14")).toBe(5); // Friday
    expect(weekStart("2026-08-14")).toBe("2026-08-10");
    expect(weekStart("2026-08-09")).toBe("2026-08-03");
    expect(addDays("2026-08-29", 3)).toBe("2026-09-01");
  });
  it("parses times and allows 24:00 as an end", () => {
    expect(toMinutes("19:30")).toBe(1170);
    expect(toMinutes("24:00")).toBe(1440);
    expect(() => toMinutes("24:01")).toThrow();
    expect(() => toMinutes("7pm")).toThrow();
  });
  it("labels financial years and BAS quarters", () => {
    expect(financialYear("2026-08-10")).toBe("FY2026-27");
    expect(financialYear("2026-06-30")).toBe("FY2025-26");
    expect(basQuarter("2026-08-10")).toEqual({ label: "FY2026-27 Q1", start: "2026-07-01", end: "2026-09-30" });
    expect(basQuarter("2026-11-05")).toEqual({ label: "FY2026-27 Q2", start: "2026-10-01", end: "2026-12-31" });
    expect(basQuarter("2027-02-14")).toEqual({ label: "FY2026-27 Q3", start: "2027-01-01", end: "2027-03-31" });
    expect(basQuarter("2027-05-01")).toEqual({ label: "FY2026-27 Q4", start: "2027-04-01", end: "2027-06-30" });
  });
});
