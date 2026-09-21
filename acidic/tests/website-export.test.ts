import { describe, expect, it } from "vitest";
import { calendarData, calendarDataAttribute, cardDate, editorialTime, escapeHtml, heroEvent, indexDate, indexMeta, indexRowHtml, programmeIndexRows, upcomingRowHtml } from "../src/lib/programme/website-export";
import { events } from "../src/lib/data/fixtures";

describe("pasted HTML is escaped", () => {
  const hostile = { eventDate: "2026-09-04", title: 'Jazz <b>Night</b> & "Friends"', artist: "A'B", genre: null, kind: "night_session" as const, status: "ticketed" as const, startTime: "20:00", ticketUrl: 'https://example.test/t?a=1&b="x"', description: null };
  it("escapes titles, meta and links in the Programme Index row", () => {
    const [row] = programmeIndexRows([hostile]);
    const html = indexRowHtml(row);
    expect(html).toContain("Jazz &lt;b&gt;Night&lt;/b&gt; &amp; &quot;Friends&quot;");
    expect(html).toContain('href="https://example.test/t?a=1&amp;b=&quot;x&quot;"');
    expect(html).not.toContain("<b>");
    expect(escapeHtml("a<b>&\"'")).toBe("a&lt;b&gt;&amp;&quot;&#39;");
  });
  it("escapes the Upcoming list row and keeps the site's exact shape", () => {
    expect(upcomingRowHtml(hostile)).toBe('<li><span>Jazz &lt;b&gt;Night&lt;/b&gt; &amp; &quot;Friends&quot; — A&#39;B</span><span class="event-date">Fri, 4 Sep</span></li>');
    expect(upcomingRowHtml(events[2])).toBe('<li><span>Tripside Life Quartet</span><span class="event-date">Sat, 8 Aug</span></li>');
  });
});

// These assert the exact strings that are hand-typed on acidity.com.au today, so the
// export can replace the hand-typing without changing what the public sees.
describe("website export matches acidity.com.au", () => {
  it("formats dates and times the way the site does", () => {
    expect(indexDate("2026-08-01")).toBe("01 AUG");
    expect(cardDate("2026-08-01")).toBe("Sat, 1 Aug");
    expect(cardDate("2026-08-20")).toBe("Thu, 20 Aug");
    expect(editorialTime("20:00")).toBe("8pm");
    expect(editorialTime("19:30")).toBe("7:30pm");
    expect(editorialTime("14:00")).toBe("2pm");
  });
  it("renders the agreed Programme Index rows", () => {
    const rows = programmeIndexRows(events);
    expect(rows.map((row) => row.date)).toEqual(["01 AUG", "02 AUG", "08 AUG", "10 AUG", "14 AUG", "15 AUG", "20 AUG", "21 AUG", "22 AUG", "23 AUG", "29 AUG"]);
    expect(rows[0]).toMatchObject({ title: "The Music of Wes Montgomery", meta: "TONY YANG TRIO / JAZZ TRIO / DOORS 20:00 / TICKETED", action: "Book Tickets", tba: false });
    expect(rows[0].href).toContain("humanitix");
    expect(rows[1]).toMatchObject({ meta: "SESSION 04 / DAY PROGRAMME / 14:00 / FREE RSVP", action: "RSVP" });
    expect(rows[2]).toMatchObject({ title: "Tripside Life Quartet", meta: "ACID JAZZ / FUNK / DOORS 19:30 / TICKETED" });
    expect(rows[3]).toMatchObject({ title: "Cerros / Marks Quintet", meta: "TWO TRUMPETS / DOORS 19:30 / TICKETED" });
    expect(rows[9]).toMatchObject({ title: "J-Fusion & Hiphop", meta: "CHAKAMENS / NAGOYA, JP / DETAILS TBA", action: "Details TBA", href: null, tba: true });
    expect(rows.find((row) => row.date === "29 AUG")).toMatchObject({ title: "Rock Lineup", meta: "ROCK / DETAILS TBA" });
  });
  it("never lists a private booking publicly, and never shows Book Tickets without a link", () => {
    const rows = programmeIndexRows(events);
    expect(rows.some((row) => row.title === "Private function")).toBe(false);
    for (const row of rows) if (row.action === "Book Tickets" || row.action === "RSVP") expect(row.href).toBeTruthy();
  });
  it("renders the calendar data-events the booking calendar reads", () => {
    const data = calendarData(events);
    expect(data["2026-08-01"]).toEqual({ type: "session", title: "The Music of Wes Montgomery — Tony Yang Trio", time: "8pm" });
    expect(data["2026-08-08"]).toEqual({ type: "session", title: "Tripside Life Quartet — Acid Jazz / Funk", time: "7:30pm" });
    expect(data["2026-08-09"]).toEqual({ type: "private", title: "Private function", time: "3pm" });
    expect(data["2026-08-28"]).toEqual({ type: "private", title: "Private function" });
    expect(data["2026-08-15"]).toEqual({ type: "session", title: "Late Night Jazz — Afro-Jazz", time: "Details TBA" });
    expect(data["2026-08-23"].title).toBe("J-Fusion & Hiphop — Chakamens");
    expect(Object.keys(data)).toHaveLength(13);
    expect(calendarDataAttribute(events)).toContain("&amp; Hiphop");
    expect(calendarDataAttribute(events)).not.toContain("'");
  });
  it("picks the next public event for the hero", () => {
    expect(heroEvent(events, "2026-08-03")?.title).toBe("Tripside Life Quartet");
    expect(heroEvent(events, "2026-08-09")?.title).toBe("Cerros / Marks Quintet");
    expect(heroEvent(events, "2026-09-01")).toBeNull();
  });
  it("leaves unknown parts out of the meta rather than inventing them", () => {
    expect(indexMeta({ eventDate: "2026-08-21", title: "Live Session", artist: null, genre: null, kind: "night_session", status: "placeholder", startTime: null, ticketUrl: null, description: null })).toBe("DETAILS TBA");
  });
});
