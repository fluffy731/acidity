import { PageHeading } from "@/components/ui";
import { loadWorkspace } from "@/lib/data/source";
import { calendarDataAttribute, heroEvent, programmeIndexRows, cardDate, editorialTime, indexRowHtml, upcomingRowHtml } from "@/lib/programme/website-export";
import { melbourneDate } from "@/lib/dates";
import { requirePageRole } from "@/lib/page-access";
export const dynamic = "force-dynamic";
export const metadata = { title: "Website export" };

/** What to paste into acidity.com.au, rendered from the programme so the site and the
 * record cannot drift. Each block matches a hand-written section of index.html. */
export default async function WebsiteExport() {
  await requirePageRole("manager");
  const { events } = await loadWorkspace();
  const today = process.env.ACIDIC_MODE === "live" ? melbourneDate() : "2026-08-10";
  const rows = programmeIndexRows(events);
  const hero = heroEvent(events, today);
  const indexHtml = rows.map(indexRowHtml).join("\n");
  const upcomingHtml = events.filter((event) => event.kind !== "private_booking" && event.status !== "cancelled" && event.eventDate >= today).map(upcomingRowHtml).join("\n");
  return <>
    <PageHeading title="Website export">Copy each block into the matching section of acidity.com.au&apos;s index.html and events.html. Everything is derived from the programme above - the website&apos;s formatting rules are applied here, not by hand.</PageHeading>
    <section className="panel"><h2>Homepage hero - next public event</h2>{hero ? <p><strong>{hero.title}</strong>{hero.artist ? ` — ${hero.artist}` : ""} · {cardDate(hero.eventDate)}{hero.startTime ? ` · ${hero.kind === "night_session" ? "Doors " : ""}${editorialTime(hero.startTime)}` : ""}{hero.genre ? ` · ${hero.genre}` : ""} · {hero.status === "ticketed" ? "Ticketed" : hero.status === "free_rsvp" ? "Free RSVP" : "Details TBA"}</p> : <p className="hint">No upcoming public event.</p>}</section>
    <section className="panel"><h2>Programme Index rows (index.html)</h2><pre>{indexHtml}</pre></section>
    <section className="panel"><h2>Upcoming lists (index.html availability + events.html)</h2><pre>{upcomingHtml}</pre></section>
    <section className="panel"><h2>Booking calendar data-events attribute (index.html)</h2><pre>{`data-events='${calendarDataAttribute(events)}'`}</pre></section>
    <p className="hint">Also available as JSON at <code>/api/website/programme</code> for a script or a future build step.</p>
  </>;
}
