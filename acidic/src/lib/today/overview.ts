/** The one screen that joins the four domains: what is on, who is rostered, what is running
 * low, and how the week is tracking. Pure - fed by the data source, tested with fixtures. */
import { addDays } from "@/lib/dates";
import { sumMoney } from "@/lib/money";
import { basSummary, profitAndLoss, type LedgerEntry } from "@/lib/accounting/ledger";
import { eventCoverage, rosterSummary, overlappingShifts, type Shift, type StaffMember } from "@/lib/staffing/roster";
import { reorderList, stockValue, type CountLine, type StockItem } from "@/lib/stock/engine";
import type { ProgrammeEvent } from "@/lib/programme/website-export";

export type OverviewEvent = ProgrammeEvent & { id: string; staffRequired: number };

export type Attention = { severity: "urgent" | "soon" | "note"; area: "programme" | "staffing" | "stock" | "accounting"; message: string; href: string };

export type Overview = {
  today: string;
  thisWeek: { events: OverviewEvent[]; coverage: ReturnType<typeof eventCoverage>; roster: ReturnType<typeof rosterSummary> };
  stock: { value: number; belowPar: ReturnType<typeof reorderList>; reorderValue: number; lastCount: string | null };
  money: { weekTakings: number; monthToDate: ReturnType<typeof profitAndLoss>; bas: ReturnType<typeof basSummary> };
  attention: Attention[];
};

export function buildOverview(input: { today: string; events: readonly OverviewEvent[]; shifts: readonly Shift[]; staff: readonly StaffMember[]; items: readonly StockItem[]; latestCount: { countDate: string; lines: CountLine[] } | null; ledger: readonly LedgerEntry[] }): Overview {
  const { today } = input;
  const weekEnd = addDays(today, 6);
  const events = input.events.filter((event) => event.status !== "cancelled" && event.eventDate >= today && event.eventDate <= weekEnd).sort((a, b) => a.eventDate.localeCompare(b.eventDate));
  const weekShifts = input.shifts.filter((shift) => shift.shiftDate >= today && shift.shiftDate <= weekEnd);
  const coverage = eventCoverage(events.filter((event) => event.kind !== "private_booking"), weekShifts);
  const roster = rosterSummary(weekShifts, input.staff);
  const belowPar = reorderList(input.items, input.latestCount?.lines ?? []);
  const reorderValue = sumMoney(belowPar.map((row) => row.orderValue));
  const monthStart = `${today.slice(0, 7)}-01`;
  const weekStartDate = addDays(today, -6);
  const money = {
    weekTakings: sumMoney(input.ledger.filter((entry) => !entry.voidedAt && entry.kind === "income" && entry.entryDate >= weekStartDate && entry.entryDate <= today).map((entry) => entry.total)),
    monthToDate: profitAndLoss(input.ledger, monthStart, today),
    bas: basSummary(input.ledger, today),
  };
  const attention: Attention[] = [];
  for (const row of coverage.filter((row) => row.short > 0)) attention.push({ severity: row.eventDate <= addDays(today, 1) ? "urgent" : "soon", area: "staffing", message: `${row.title} on ${row.eventDate} is ${row.short} short on the roster (${row.rostered}/${row.required}).`, href: "/staffing" });
  for (const [a] of overlappingShifts(weekShifts)) attention.push({ severity: "soon", area: "staffing", message: `Overlapping shifts for one person on ${a.shiftDate}.`, href: "/staffing" });
  for (const event of events.filter((event) => event.status === "placeholder" && event.eventDate <= addDays(today, 3))) attention.push({ severity: "soon", area: "programme", message: `${event.title} on ${event.eventDate} still has details TBA.`, href: "/programme" });
  if (belowPar.length) attention.push({ severity: belowPar.some((row) => row.onHand === 0) ? "urgent" : "soon", area: "stock", message: `${belowPar.length} line${belowPar.length === 1 ? "" : "s"} below par - order value $${reorderValue.toFixed(2)}.`, href: "/stock" });
  if (!input.latestCount || input.latestCount.countDate < addDays(today, -14)) attention.push({ severity: "note", area: "stock", message: input.latestCount ? `Last stocktake was ${input.latestCount.countDate}; count again this week.` : "No stocktake recorded yet.", href: "/stock" });
  if (today >= addDays(money.bas.end, -21)) attention.push({ severity: "note", area: "accounting", message: `${money.bas.label} ends ${money.bas.end}: net GST so far ${money.bas.netGst.toFixed(2)}.`, href: "/accounting" });
  const order = { urgent: 0, soon: 1, note: 2 };
  attention.sort((a, b) => order[a.severity] - order[b.severity]);
  return {
    today,
    thisWeek: { events, coverage, roster },
    stock: { value: stockValue(input.items, input.latestCount?.lines ?? []), belowPar, reorderValue, lastCount: input.latestCount?.countDate ?? null },
    money,
    attention,
  };
}
