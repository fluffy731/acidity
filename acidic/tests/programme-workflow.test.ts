import { describe, expect, it } from "vitest";
import { canTransition, dateConflict, eventInputSchema, occupiesDate } from "../src/lib/programme/workflow";

const base = { eventDate: "2026-08-14", title: "Afro Jazz/AfroSpace Interchange" };

describe("event input", () => {
  it("never allows Book Tickets without a link, and never a link without a bookable status", () => {
    expect(eventInputSchema.safeParse({ ...base, status: "ticketed" }).success).toBe(false);
    expect(eventInputSchema.safeParse({ ...base, status: "confirmed", ticketUrl: "https://events.humanitix.com/x" }).success).toBe(false);
    expect(eventInputSchema.safeParse({ ...base, status: "ticketed", ticketUrl: "https://events.humanitix.com/x" }).success).toBe(true);
    expect(eventInputSchema.safeParse({ ...base, status: "free_rsvp", ticketUrl: "https://events.humanitix.com/x" }).success).toBe(true);
  });
  it("keeps a private booking private and prices in order", () => {
    expect(eventInputSchema.safeParse({ ...base, kind: "private_booking", status: "confirmed" }).success).toBe(false);
    expect(eventInputSchema.safeParse({ ...base, kind: "private_booking", status: "private", startTime: "15:00", endTime: "20:00" }).success).toBe(true);
    expect(eventInputSchema.safeParse({ ...base, priceFrom: 20, priceTo: 15 }).success).toBe(false);
    expect(eventInputSchema.parse(base).status).toBe("placeholder");
  });
});

describe("status moves", () => {
  it("goes placeholder -> confirmed -> ticketed, and never skips or revives", () => {
    expect(canTransition("placeholder", "confirmed")).toBe(true);
    expect(canTransition("placeholder", "ticketed")).toBe(false);
    expect(canTransition("confirmed", "ticketed")).toBe(true);
    expect(canTransition("ticketed", "confirmed")).toBe(true);
    expect(canTransition("cancelled", "placeholder")).toBe(false);
    expect(canTransition("private", "private")).toBe(true);
  });
  it("treats every non-cancelled event as occupying its date", () => {
    expect(occupiesDate("placeholder")).toBe(true);
    expect(occupiesDate("cancelled")).toBe(false);
  });
  it("warns on two public events and refuses a private booking on a gig night", () => {
    expect(dateConflict([], { status: "confirmed", kind: "night_session" })).toBe("none");
    expect(dateConflict([{ status: "confirmed", kind: "night_session" }], { status: "confirmed", kind: "day_programme" })).toBe("warning");
    expect(dateConflict([{ status: "ticketed", kind: "night_session" }], { status: "private", kind: "private_booking" })).toBe("conflict");
    expect(dateConflict([{ status: "cancelled", kind: "private_booking" }], { status: "confirmed", kind: "night_session" })).toBe("none");
  });
});
