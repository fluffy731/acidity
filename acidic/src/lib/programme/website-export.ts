/** The bridge between Acidic and acidity.com.au.
 *
 * The website is static HTML with the programme typed by hand in five places. Acidic is
 * the record; this module renders the exact structures the site uses - the booking
 * calendar's `data-events` JSON and the Programme Index rows - so the site can be updated
 * from one source instead of edited by hand. Format rules come from the September 2026
 * programme consistency brief: 24-hour times in the index, DOORS where confirmed, one
 * action word per status, never Book Tickets without a link. */
import { WEBSITE_ACTION, type EventStatus } from "./vocab";
import { occupiesDate } from "./workflow";

export type ProgrammeEvent = {
  eventDate: string; title: string; artist: string | null; genre: string | null; kind: string;
  status: EventStatus; startTime: string | null; ticketUrl: string | null; description: string | null;
};

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "01 AUG" */
export function indexDate(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  return `${String(day).padStart(2, "0")} ${MONTHS[month - 1]}`;
}
/** "Sat, 1 Aug" - the What's On card and Upcoming list form. */
export function cardDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const dow = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  return `${DAYS[dow]}, ${day} ${MONTHS[month - 1][0]}${MONTHS[month - 1].slice(1).toLowerCase()}`;
}
/** "8pm" / "7:30pm" - the editorial form the cards and calendar use. */
export function editorialTime(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  const hour = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${hour}${suffix}` : `${hour}:${String(m).padStart(2, "0")}${suffix}`;
}

/** The metadata cell: ARTIST / GENRE / TIME / STATUS, upper case, slash-separated, in the
 * agreed order, with the parts that are unknown left out rather than invented. */
export function indexMeta(event: ProgrammeEvent): string {
  const parts: string[] = [];
  if (event.artist) parts.push(event.artist.toUpperCase());
  if (event.genre) parts.push(event.genre.toUpperCase());
  if (event.kind === "day_programme") parts.push("DAY PROGRAMME");
  if (event.startTime) parts.push(event.kind === "night_session" && event.status === "ticketed" ? `DOORS ${event.startTime}` : event.startTime);
  const status: Record<EventStatus, string> = { ticketed: "TICKETED", free_rsvp: "FREE RSVP", confirmed: "DETAILS TBA", placeholder: "DETAILS TBA", private: "PRIVATE", cancelled: "CANCELLED" };
  parts.push(status[event.status]);
  return parts.join(" / ");
}

export type IndexRow = { date: string; title: string; meta: string; action: string; href: string | null; tba: boolean };

/** Programme Index rows for the public site: private bookings are never listed; cancelled
 * events are dropped; the rest are chronological with the agreed action word. */
export function programmeIndexRows(events: readonly ProgrammeEvent[]): IndexRow[] {
  return [...events]
    .filter((event) => event.kind !== "private_booking" && event.status !== "cancelled")
    .sort((a, b) => a.eventDate.localeCompare(b.eventDate))
    .map((event) => ({
      date: indexDate(event.eventDate),
      title: event.title,
      meta: indexMeta(event),
      action: WEBSITE_ACTION[event.status],
      href: ["ticketed", "free_rsvp"].includes(event.status) && event.ticketUrl ? event.ticketUrl : null,
      tba: !["ticketed", "free_rsvp"].includes(event.status),
    }));
}

export type CalendarEntry = { type: "session" | "private"; title: string; time?: string };

/** The `data-events` attribute for the booking calendar on index.html: every occupied date,
 * private bookings as venue-unavailable, with the editorial time where one is confirmed. */
export function calendarData(events: readonly ProgrammeEvent[]): Record<string, CalendarEntry> {
  const out: Record<string, CalendarEntry> = {};
  for (const event of [...events].sort((a, b) => a.eventDate.localeCompare(b.eventDate))) {
    if (!occupiesDate(event.status)) continue;
    if (event.kind === "private_booking") { out[event.eventDate] = { type: "private", title: "Private function", ...(event.startTime ? { time: editorialTime(event.startTime) } : {}) }; continue; }
    if (out[event.eventDate]?.type === "private") continue;
    const title = event.artist && !event.title.includes(event.artist) ? `${event.title} — ${event.artist}` : event.genre && !event.title.toLowerCase().includes(event.genre.toLowerCase()) ? `${event.title} — ${event.genre}` : event.title;
    out[event.eventDate] = { type: "session", title, time: event.startTime ? editorialTime(event.startTime) : "Details TBA" };
  }
  return out;
}

/** The single HTML attribute value, escaped the way the website's hand-written one is. */
export function calendarDataAttribute(events: readonly ProgrammeEvent[]): string {
  return JSON.stringify(calendarData(events)).replace(/&/g, "&amp;").replace(/'/g, "&#39;");
}

/** Text or attribute value safe to paste into the site's HTML. */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** One Programme Index `<li>` exactly as index.html carries it. */
export function indexRowHtml(row: IndexRow): string {
  const action = row.href ? `<a href="${escapeHtml(row.href)}" target="_blank" rel="noopener" class="pi-link">${escapeHtml(row.action)}</a>` : `<span class="pi-status">${escapeHtml(row.action)}</span>`;
  return `<li class="pi-upcoming${row.tba ? " pi-tba" : ""}"><span class="pi-date">${row.date}</span><span class="pi-title">${escapeHtml(row.title)}</span><span class="pi-meta">${escapeHtml(row.meta)}</span> ${action}</li>`;
}

/** One Upcoming-list `<li>` as index.html's availability list and events.html carry it. */
export function upcomingRowHtml(event: ProgrammeEvent): string {
  return `<li><span>${escapeHtml(event.title)}${event.artist ? ` — ${escapeHtml(event.artist)}` : ""}</span><span class="event-date">${cardDate(event.eventDate)}</span></li>`;
}

/** The next public event on or after `today` - what the homepage hero should show. */
export function heroEvent(events: readonly ProgrammeEvent[], today: string): ProgrammeEvent | null {
  return [...events].filter((event) => event.kind !== "private_booking" && event.status !== "cancelled" && event.eventDate >= today).sort((a, b) => a.eventDate.localeCompare(b.eventDate))[0] ?? null;
}
