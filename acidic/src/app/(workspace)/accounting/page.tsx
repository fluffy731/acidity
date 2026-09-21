import { Kpi, PageHeading, Status, currency, date } from "@/components/ui";
import { LedgerForm } from "@/components/ledger-form";
import { isLive, loadWorkspace } from "@/lib/data/source";
import { basSummary, profitAndLoss } from "@/lib/accounting/ledger";
import { melbourneDate } from "@/lib/dates";
import { requirePageRole } from "@/lib/page-access";
export const dynamic = "force-dynamic";
export const metadata = { title: "Money" };
export default async function Accounting() {
  await requirePageRole("manager");
  const { ledger } = await loadWorkspace();
  const today = process.env.ACIDIC_MODE === "live" ? melbourneDate() : "2026-08-10";
  const monthStart = `${today.slice(0, 7)}-01`;
  const pnl = profitAndLoss(ledger, monthStart, today);
  const bas = basSummary(ledger, today);
  return <>
    <PageHeading title="Money">Takings, purchases and wages in one ledger. Every figure below is derived from the entries; nothing is typed twice.</PageHeading>
    {isLive() ? <LedgerForm /> : null}
    <div className="kpis">
      <Kpi label="Income, month to date" value={currency(pnl.income)} hint="Ex GST" />
      <Kpi label="Cost of goods" value={currency(pnl.costOfGoods)} hint="Stock purchases" />
      <Kpi label="Wages" value={currency(pnl.wages)} />
      <Kpi label="Other expenses" value={currency(pnl.otherExpenses)} />
      <Kpi label="Net profit" value={currency(pnl.netProfit)} hint={`Gross ${currency(pnl.grossProfit)}`} />
    </div>
    <section className="panel" id="bas"><h2>{bas.label} - working BAS figures (cash basis)</h2><table><tbody>
      <tr><th>G1 Total sales (inc GST)</th><td className="num">{currency(bas.g1TotalSales)}</td></tr>
      <tr><th>G11 Non-capital purchases (inc GST)</th><td className="num">{currency(bas.g11NonCapitalPurchases)}</td></tr>
      <tr><th>1A GST on sales</th><td className="num">{currency(bas.oneAGstOnSales)}</td></tr>
      <tr><th>1B GST on purchases</th><td className="num">{currency(bas.oneBGstOnPurchases)}</td></tr>
      <tr><th>Net GST (1A − 1B)</th><td className="num"><strong>{currency(bas.netGst)}</strong></td></tr>
      <tr><th>W1 Total salary and wages</th><td className="num">{currency(bas.wagesW1)}</td></tr>
    </tbody></table><p className="hint">Quarter {date(bas.start)} – {date(bas.end)}. A working figure for the bookkeeper; not lodgement advice. PAYG withholding is not calculated.</p></section>
    <section className="panel"><h2>Month by category (ex GST)</h2><table><thead><tr><th>Category</th><th>Kind</th><th className="num">Total</th></tr></thead><tbody>{pnl.byCategory.map((row) => <tr key={`${row.kind}-${row.category}`}><td>{row.category.replace(/_/g, " ")}</td><td><Status value={row.kind} /></td><td className="num">{currency(row.total)}</td></tr>)}</tbody></table></section>
    <section className="panel" id="ledger"><h2>Ledger</h2><table><thead><tr><th>Date</th><th>Kind</th><th>Category</th><th>Description</th><th className="num">Total</th><th className="num">GST</th><th className="num">Ex GST</th></tr></thead><tbody>{ledger.map((entry) => <tr key={entry.id} style={entry.voidedAt ? { opacity: 0.45, textDecoration: "line-through" } : undefined}><td>{date(entry.entryDate)}</td><td><Status value={entry.kind} /></td><td>{entry.category.replace(/_/g, " ")}</td><td>{entry.description}</td><td className="num">{currency(entry.total)}</td><td className="num">{currency(entry.gst)}</td><td className="num">{currency(entry.subtotal)}</td></tr>)}</tbody></table></section>
  </>;
}
