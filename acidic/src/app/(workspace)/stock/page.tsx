import { Kpi, PageHeading, currency, date } from "@/components/ui";
import { StockCountForm } from "@/components/stock-count-form";
import { StockEditor } from "@/components/stock-editor";
import { recipesUsingItem } from "@/lib/recipes/engine";
import { isLive, loadWorkspace } from "@/lib/data/source";
import { sumMoney } from "@/lib/money";
import { requirePageRole } from "@/lib/page-access";
import { costOfGoods, reorderList, stockValue, usageBetweenCounts } from "@/lib/stock/engine";
export const dynamic = "force-dynamic";
export const metadata = { title: "Stock" };
export default async function Stock() {
  const { manager } = await requirePageRole("manager");
  const { items, latestCount, previousCount, movements, recipes } = await loadWorkspace();
  const latestLines = latestCount?.lines ?? [];
  const reorder = reorderList(items, latestLines);
  const usage = previousCount && latestCount ? usageBetweenCounts(items, previousCount.lines, latestCount.lines, movements) : [];
  const cogs = costOfGoods(usage);
  return <>
    <PageHeading title="Stock">Count the bar, record deliveries and waste, and let the difference tell you what was used. Sales are never entered per item.</PageHeading>
    {isLive() ? <StockCountForm items={items.map((item) => ({ id: item.id, name: item.name, unit: item.unit, parLevel: item.parLevel, category: item.category }))} /> : null}
    <div className="kpis">
      <Kpi label="On hand at cost" value={currency(stockValue(items, latestLines))} hint={latestCount ? `Counted ${date(latestCount.countDate)}` : "No count yet"} />
      <Kpi label="Reorder to par" value={currency(sumMoney(reorder.map((row) => row.orderValue)))} hint={`${reorder.length} line${reorder.length === 1 ? "" : "s"} below par`} />
      <Kpi label="Used since last count" value={currency(cogs.usedValue)} hint={previousCount ? `Since ${date(previousCount.countDate)}` : "Needs two counts"} />
      <Kpi label="Waste at cost" value={currency(cogs.wasteValue)} />
    </div>
    <section className="panel" id="reorder"><h2>Reorder list</h2>{reorder.length ? <table><thead><tr><th>Item</th><th>Category</th><th className="num">On hand</th><th className="num">Par</th><th className="num">Order</th><th className="num">Value</th></tr></thead><tbody>{reorder.map((row) => <tr key={row.item.id}><td>{row.item.name}</td><td>{row.item.category.replace(/_/g, " ")}</td><td className="num">{row.onHand}</td><td className="num">{row.item.parLevel}</td><td className="num">{row.shortBy} {row.item.unit}</td><td className="num">{currency(row.orderValue)}</td></tr>)}</tbody></table> : <p className="hint">Everything is at or above par.</p>}</section>
    <section className="panel" id="usage"><h2>Usage between the last two counts</h2>{usage.length ? <table><thead><tr><th>Item</th><th className="num">Opening</th><th className="num">Delivered</th><th className="num">Waste</th><th className="num">Closing</th><th className="num">Used</th><th className="num">Value</th></tr></thead><tbody>{usage.map((row) => <tr key={row.item.id}><td>{row.item.name}</td><td className="num">{row.opening}</td><td className="num">{row.delivered}</td><td className="num">{row.wasted}</td><td className="num">{row.closing}</td><td className="num">{row.used}{row.used < 0 ? " ⚠" : ""}</td><td className="num">{currency(row.usedValue)}</td></tr>)}</tbody></table> : <p className="hint">Usage appears once two counts have been recorded.</p>}<p className="hint">A negative &quot;used&quot; figure means more was counted than the deliveries explain - a miscount or a delivery not yet recorded.</p></section>
    <StockEditor canEdit={manager && isLive()} items={items.map((item) => ({
      id: item.id, name: item.name, category: item.category, unit: item.unit, unitCost: item.unitCost,
      parLevel: item.parLevel, supplier: item.supplier,
      onHand: latestLines.find((line) => line.itemId === item.id)?.quantity ?? null,
      usedBy: recipesUsingItem(recipes, item.id),
    }))} />
  </>;
}
