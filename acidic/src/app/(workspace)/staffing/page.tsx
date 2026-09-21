import { Kpi, PageHeading, Status, currency, date } from "@/components/ui";
import { ShiftForm } from "@/components/shift-form";
import { isLive, loadWorkspace } from "@/lib/data/source";
import { requirePageRole } from "@/lib/page-access";
import { eventCoverage, overlappingShifts, paidHours, rosterSummary, shiftCost } from "@/lib/staffing/roster";
export const dynamic = "force-dynamic";
export const metadata = { title: "Roster" };
export default async function Staffing() {
  // Everyone reads the roster; only managers see what it costs or anyone's rate.
  const { manager } = await requirePageRole("staff");
  const { shifts, staff, events } = await loadWorkspace();
  const summary = rosterSummary(shifts, staff);
  const worked = rosterSummary(shifts, staff, ["worked"]);
  const coverage = eventCoverage(events.filter((event) => event.kind !== "private_booking"), shifts);
  const clashes = overlappingShifts(shifts);
  const byId = new Map(staff.map((member) => [member.id, member]));
  return <>
    <PageHeading title="Roster">{manager ? "Who is on, what it costs at base rate, and whether every gig night has the people it needs." : "Who is on, and whether every gig night has the people it needs."}</PageHeading>
    {isLive() && manager ? <ShiftForm staff={staff.filter((member) => member.active).map((member) => ({ id: member.id, name: member.name, defaultRole: member.defaultRole }))} /> : null}
    <div className="kpis">
      <Kpi label="Rostered hours" value={`${summary.hours} h`} hint={`${summary.shifts} shifts`} />
      {manager ? <Kpi label="Rostered cost" value={currency(summary.cost)} hint="Base hourly rate only - no penalty rates" /> : null}
      {manager ? <Kpi label="Worked so far" value={currency(worked.cost)} hint={`${worked.hours} h marked worked`} /> : <Kpi label="Worked so far" value={`${worked.hours} h`} />}
      <Kpi label="Nights short" value={String(coverage.filter((row) => row.short > 0).length)} hint="Events below required staff" />
    </div>
    {clashes.length ? <p className="message error">{clashes.length} overlapping shift{clashes.length === 1 ? "" : "s"} for the same person - fix before publishing the roster.</p> : null}
    <section className="panel"><h2>Coverage by event</h2><table><thead><tr><th>Date</th><th>Event</th><th className="num">Required</th><th className="num">Rostered</th><th>State</th></tr></thead><tbody>{coverage.map((row) => <tr key={`${row.eventDate}-${row.title}`}><td>{date(row.eventDate)}</td><td>{row.title}</td><td className="num">{row.required}</td><td className="num">{row.rostered}</td><td>{row.short ? <span className="status status-no_show">{row.short} short</span> : <span className="status status-worked">Covered</span>}</td></tr>)}</tbody></table></section>
    <section className="panel"><h2>Shifts</h2><table><thead><tr><th>Date</th><th>Person</th><th>Role</th><th>Hours</th><th>Status</th><th className="num">Paid h</th>{manager ? <th className="num">Cost</th> : null}</tr></thead><tbody>{shifts.map((shift) => { const member = byId.get(shift.staffId); return <tr key={shift.id}><td>{date(shift.shiftDate)}</td><td>{member?.name ?? "?"}</td><td>{shift.role}</td><td>{shift.startTime}–{shift.endTime}{shift.breakMinutes ? ` (${shift.breakMinutes}m break)` : ""}</td><td><Status value={shift.status} /></td><td className="num">{paidHours(shift)}</td>{manager ? <td className="num">{member ? currency(shiftCost(shift, member)) : "—"}</td> : null}</tr>; })}</tbody></table></section>
    {manager ? <section className="panel"><h2>By person</h2><table><thead><tr><th>Person</th><th>Type</th><th className="num">Rate</th><th className="num">Hours</th><th className="num">Cost</th></tr></thead><tbody>{summary.byStaff.map((row) => <tr key={row.staff.id}><td>{row.staff.name}</td><td>{row.staff.employmentType.replace(/_/g, " ")}</td><td className="num">{currency(row.staff.hourlyRate)}/h</td><td className="num">{row.hours}</td><td className="num">{currency(row.cost)}</td></tr>)}</tbody></table></section> : null}
  </>;
}
