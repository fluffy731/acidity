import Link from "next/link";
import { PageHeading, Status, currency, date } from "@/components/ui";
import { dailyTakings } from "@/lib/accounting/ledger";
import { loadWorkspace } from "@/lib/data/source";
export const dynamic = "force-dynamic";
export const metadata = { title: "Programme" };
export default async function Programme() {
  const { events, ledger } = await loadWorkspace();
  /** Income recorded on the event's date - the day's till, in exact cents. */
  const takingsOn = (eventDate: string) => dailyTakings(ledger, eventDate).total;
  return <>
    <PageHeading title="Programme" action={<Link className="button secondary" href="/programme/website">Website export</Link>}>Every date the venue is spoken for: gigs, day sessions and private bookings. Cancelled dates drop off the website automatically.</PageHeading>
    <section className="panel"><table><thead><tr><th>Date</th><th>Event</th><th>Artist / genre</th><th>Kind</th><th>Status</th><th>Time</th><th className="num">Staff</th><th className="num">Takings that day</th></tr></thead><tbody>
      {events.map((event) => <tr key={event.id}><td>{date(event.eventDate)}</td><td>{event.title}</td><td>{[event.artist, event.genre].filter(Boolean).join(" · ") || "—"}</td><td><Status value={event.kind} /></td><td><Status value={event.status} /></td><td>{event.startTime ?? "TBA"}</td><td className="num">{event.staffRequired}</td><td className="num">{takingsOn(event.eventDate) ? currency(takingsOn(event.eventDate)) : "—"}</td></tr>)}
    </tbody></table></section>
    <p className="hint">Rules the website relies on: a booking link is only ever shown for a ticketed or free-RSVP event; a private booking is never listed publicly; every non-cancelled date is occupied on the calendar. The API enforces all three.</p>
  </>;
}
