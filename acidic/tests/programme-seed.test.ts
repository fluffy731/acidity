import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { programmeSeedSchema, seedIssues } from "@/lib/data/programme-seed";

/** data/programme.json is loaded into the live database by `npm run programme:seed`, which runs
 *  in a container with no TypeScript. These tests are where the file meets the app's real rules,
 *  so a bad row fails in CI on a laptop rather than at the bar on a Friday night. */
const raw = JSON.parse(readFileSync(new URL("../data/programme.json", import.meta.url), "utf8"));

describe("the programme seed file", () => {
  const seed = programmeSeedSchema.parse(raw);

  it("holds only events the Programme screen would accept", () => {
    expect(seed.events.length).toBeGreaterThan(0);
  });

  it("has no duplicates and no private hire on a public night", () => {
    expect(seedIssues(seed.events)).toEqual([]);
  });

  it("reads in date order, like the programme it describes", () => {
    const dates = seed.events.map((event) => event.eventDate);
    expect(dates).toEqual([...dates].sort());
  });

  it("publishes a booking link on every ticketed or RSVP night, and nowhere else", () => {
    for (const event of seed.events) {
      const bookable = ["ticketed", "free_rsvp"].includes(event.status);
      expect(Boolean(event.ticketUrl), `${event.eventDate} ${event.title}`).toBe(bookable);
    }
  });

  it("rejects a ticketed night with no way to buy a ticket", () => {
    const broken = { events: [{ eventDate: "2026-10-02", title: "Someone", status: "ticketed" }] };
    expect(() => programmeSeedSchema.parse(broken)).toThrow();
  });

  it("rejects a private booking left open to the public", () => {
    const broken = { events: [{ eventDate: "2026-10-02", title: "Private function", kind: "private_booking", status: "confirmed" }] };
    expect(() => programmeSeedSchema.parse(broken)).toThrow();
  });

  it("rejects a key nobody meant to type", () => {
    const broken = { events: [{ eventDate: "2026-10-02", title: "Someone", door: "8pm" }] };
    expect(() => programmeSeedSchema.parse(broken)).toThrow();
  });
});
