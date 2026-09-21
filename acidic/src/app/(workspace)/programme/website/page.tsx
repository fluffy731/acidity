import { PageHeading } from "@/components/ui";
import { loadWorkspace } from "@/lib/data/source";
import { calendarDataAttribute, heroEvent, programmeIndexRows, cardDate, editorialTime } from "@/lib/programme/website-export";
import { melbourneDate } from "@/lib/dates";
export const dynamic = "force-dynamic";
export const metadata = { title: "Website export" };

/** What to paste into acidity.com.au, rendered from the programme so the site and the
 * record cannot drift. Each block matches a hand-written section of index.html. */
export default async function WebsiteExport() {
  const { events } = await loadWorkspace();
  const today = process.env.ACIDIC_MODE === "live" ? melbourneDate() : "2026-08-10";
  const rows = programmeIndexRows(events);
  const hero = heroEvent(events, today);
  const indexHtml = rows.map((row) => `<li class="pi-upcoming${row.tba ? " pi-tba" : ""}"><span class="pi-date">${row.date}</span><span class="pi-title">${row.title}</span><span class="pi-meta">${row.meta.replace(/&/g, "&amp;")}</span> ${row.href ? `<a href="${row.href}" target="_blank" rel="noopener" class="pi-link">${row.action}</a>` : `<span class="pi-status">${row.action}</span>`}</li>`).join("\n");
  const upcomingHtml = events.filter((event) => event.kind !== "private_booking" && event.status !== "cancelled" && event.eventDate >= today).map((event) => `<li><span>${event.title}${event.artist ? ` — ${event.artist}` : ""}</span><span class="event-date">${cardDate(event.eventDate)}</span></li>`).join("\n");
  return <>
    <PageHeading title="Website export">Copy each block into the matching section of acidity.com.au&apos;s index.html and events.html. Everything is derived from the programme above - the website&apos;s formatting rules are applied here, not by hand.</PageHeading>
    <section className="panel"><h2>Homepage hero - next public event</h2>{hero ? <p><strong>{hero.title}</strong>{hero.artist ? ` — ${hero.artist}` : ""} · {cardDate(hero.eventDate)}{hero.startTime ? ` · ${hero.kind === "night_session" ? "Doors " : ""}${editorialTime(hero.startTime)}` : ""}{hero.genre ? ` · ${hero.genre}` : ""} · {hero.status === "ticketed" ? "Ticketed" : hero.status === "free_rsvp" ? "Free RSVP" : "Details TBA"}</p> : <p className="hint">No upcoming public event.</p>}</section>
    <section className="panel"><h2>Programme Index rows (index.html)</h2><pre>{indexHtml}</pre></section>
    <section className="panel"><h2>Upcoming lists (index.html availability + events.html)</h2><pre>{upcomingHtml}</pre></section>
    <section className="panel"><h2>Booking calendar data-events attribute (index.html)</h2><pre>{`data-events='${calendarDataAttribute(events)}'`}</pre></section>
    <p className="hint">Also available as JSON at <code>/api/website/programme</code> for a script or a future build step.</p>
  </>;
}
