import Link from "next/link";
import { Kpi, PageHeading, Status, currency, date } from "@/components/ui";
import { loadWorkspace } from "@/lib/data/source";
import { melbourneDate } from "@/lib/dates";
import { buildOverview } from "@/lib/today/overview";
export const dynamic = "force-dynamic";
export const metadata = { title: "Today" };
export default async function Dashboard() {
  const workspace = await loadWorkspace();
  // The preview is seeded with August 2026; open it on the week that has data in it.
  const today = process.env.ACIDIC_MODE === "live" ? melbourneDate() : "2026-08-10";
  const view = buildOverview({ today, ...workspace });
  return <>
    <PageHeading title="Today">{date(today)} at Acidity - what is on, who is on, what is low, how the month is tracking.</PageHeading>
    {view.attention.length ? <section className="panel"><h2>Needs attention</h2><ul className="attention">{view.attention.map((item, index) => <li key={index} className={item.severity}><span>{item.message}</span><Link href={item.href}>Open</Link></li>)}</ul></section> : <section className="panel"><h2>Needs attention</h2><p className="hint">Nothing outstanding.</p></section>}
    <div className="kpis">
      <Kpi label="Takings, last 7 days" value={currency(view.money.weekTakings)} hint="GST-inclusive, through the till" />
      <Kpi label="Net profit, month to date" value={currency(view.money.monthToDate.netProfit)} hint={`Income ${currency(view.money.monthToDate.income)} ex GST`} />
      <Kpi label="Roster this week" value={`${view.thisWeek.roster.hours} h`} hint={`${currency(view.thisWeek.roster.cost)} base wages`} />
      <Kpi label="Stock on hand" value={currency(view.stock.value)} hint={view.stock.lastCount ? `Counted ${date(view.stock.lastCount)}` : "No count yet"} />
      <Kpi label={view.money.bas.label} value={currency(view.money.bas.netGst)} hint="Net GST so far this quarter" />
    </div>
    <section className="panel"><h2>This week&apos;s programme</h2><table><thead><tr><th>Date</th><th>Event</th><th>Status</th><th className="num">Staff</th></tr></thead><tbody>
      {view.thisWeek.events.map((event) => { const cover = view.thisWeek.coverage.find((row) => row.eventDate === event.eventDate && row.title === event.title); return <tr key={event.id}><td>{date(event.eventDate)}</td><td>{event.title}{event.artist ? ` — ${event.artist}` : ""}</td><td><Status value={event.status} /></td><td className="num">{cover ? `${cover.rostered}/${cover.required}` : "—"}</td></tr>; })}
      {!view.thisWeek.events.length ? <tr><td colSpan={4} className="hint">Nothing programmed in the next seven days.</td></tr> : null}
    </tbody></table></section>
    <section className="panel"><h2>Below par</h2>{view.stock.belowPar.length ? <table><thead><tr><th>Item</th><th className="num">On hand</th><th className="num">Par</th><th className="num">Order</th><th className="num">Value</th></tr></thead><tbody>{view.stock.belowPar.map((row) => <tr key={row.item.id}><td>{row.item.name}</td><td className="num">{row.onHand}</td><td className="num">{row.item.parLevel}</td><td className="num">{row.shortBy} {row.item.unit}</td><td className="num">{currency(row.orderValue)}</td></tr>)}</tbody></table> : <p className="hint">Everything is at or above par.</p>}</section>
  </>;
}
