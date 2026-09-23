"use client";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/client-api";
import { STOCK_CATEGORIES, STOCK_UNITS } from "@/lib/stock/vocab";
import { Message, currency, errorMessage } from "./ui";

export type EditableItem = {
  id: string; name: string; category: string; unit: string; unitCost: number;
  parLevel: number; supplier: string | null; onHand: number | null; usedBy: string[];
};

const label = (value: string) => value.replace(/_/g, " ");
const today = () => new Date().toISOString().slice(0, 10);

/** The stock list as it is actually used: on a phone, behind the bar, one line at a time.
 *  Every line opens in place - cost and par are the two numbers that decide the reorder list,
 *  and a delivery or a breakage is two taps rather than a trip to a laptop. */
export function StockEditor({ items, canEdit }: { items: EditableItem[]; canEdit: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [mode, setMode] = useState<"edit" | "delivery" | "waste">("edit");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((item) =>
      (category === "all" || item.category === category) &&
      (category !== "__nocost" || item.unitCost === 0) &&
      (!needle || item.name.toLowerCase().includes(needle) || item.supplier?.toLowerCase().includes(needle)));
  }, [items, query, category]);

  const missingCost = items.filter((item) => item.unitCost === 0).length;

  function open(id: string, next: "edit" | "delivery" | "waste") {
    setError(""); setSuccess("");
    if (openId === id && mode === next) { setOpenId(null); return; }
    setOpenId(id); setMode(next);
  }

  async function save(event: FormEvent<HTMLFormElement>, item: EditableItem) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    const data = new FormData(event.currentTarget);
    const number = (key: string) => { const raw = String(data.get(key) ?? "").trim(); return raw === "" ? undefined : Number(raw); };
    try {
      await apiRequest(`/api/stock/items/${item.id}`, "PATCH", {
        name: String(data.get("name") ?? "").trim(),
        category: String(data.get("category") ?? ""),
        unit: String(data.get("unit") ?? ""),
        unitCost: number("unitCost") ?? 0,
        parLevel: number("parLevel") ?? 0,
        supplier: String(data.get("supplier") ?? "").trim() || null,
        active: data.get("active") === "on",
      });
      setSuccess(`Saved ${item.name}.`); setOpenId(null); router.refresh();
    } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(false); }
  }

  async function move(event: FormEvent<HTMLFormElement>, item: EditableItem, kind: "delivery" | "waste") {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    const data = new FormData(event.currentTarget);
    try {
      const quantity = Number(String(data.get("quantity") ?? "").trim());
      if (!Number.isFinite(quantity) || quantity <= 0) throw new Error("Enter how many units.");
      await apiRequest("/api/stock/movements", "POST", {
        itemId: item.id, movementDate: String(data.get("movementDate") ?? today()), kind, quantity,
        note: String(data.get("note") ?? "").trim() || null,
      });
      setSuccess(`Recorded ${quantity} ${item.unit} ${kind === "delivery" ? "delivered" : "wasted"} - ${item.name}.`);
      setOpenId(null); router.refresh();
    } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(false); }
  }

  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await apiRequest("/api/stock/items", "POST", {
        name: String(data.get("name") ?? "").trim(),
        category: String(data.get("category") ?? "other"),
        unit: String(data.get("unit") ?? "bottle"),
        unitCost: Number(String(data.get("unitCost") ?? "0") || 0),
        parLevel: Number(String(data.get("parLevel") ?? "0") || 0),
        supplier: String(data.get("supplier") ?? "").trim() || null,
      });
      setSuccess("Stock line added."); form.reset(); setAdding(false); router.refresh();
    } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(false); }
  }

  return <section className="panel stock-editor">
    <h2>Stock lines</h2>
    {missingCost ? <p className="hint warn-note">{missingCost} line{missingCost === 1 ? " has" : "s have"} no unit cost yet, so stock value and the reorder list are understated. <button type="button" className="linklike" onClick={() => setCategory("__nocost")}>Show them</button></p> : null}

    <div className="stock-filters">
      <input type="search" inputMode="search" placeholder="Search a line…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search stock lines" />
      <select value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Filter by category">
        <option value="all">All categories</option>
        <option value="__nocost">Needs a cost</option>
        {STOCK_CATEGORIES.map((value) => <option key={value} value={value}>{label(value)}</option>)}
      </select>
    </div>

    <Message error={error} success={success} />

    <ul className="stock-list">
      {shown.map((item) => <li key={item.id} className={`stock-card${item.unitCost === 0 ? " needs-cost" : ""}`}>
        <div className="stock-card-head">
          <span className="stock-name">{item.name}</span>
          <span className="stock-cat">{label(item.category)}</span>
        </div>
        <div className="stock-figures">
          <span><strong>{item.unitCost === 0 ? "—" : currency(item.unitCost)}</strong> per {item.unit}</span>
          <span>par <strong>{item.parLevel || "—"}</strong></span>
          <span>on hand <strong>{item.onHand ?? "—"}</strong></span>
        </div>
        {item.usedBy.length ? <p className="stock-used">Pours: {item.usedBy.slice(0, 4).join(", ")}{item.usedBy.length > 4 ? ` +${item.usedBy.length - 4}` : ""}</p> : null}
        {canEdit ? <div className="stock-actions">
          <button type="button" className="secondary" onClick={() => open(item.id, "edit")} aria-expanded={openId === item.id && mode === "edit"}>Edit</button>
          <button type="button" className="secondary" onClick={() => open(item.id, "delivery")}>+ Delivery</button>
          <button type="button" className="secondary" onClick={() => open(item.id, "waste")}>− Waste</button>
        </div> : null}

        {canEdit && openId === item.id && mode === "edit" ? <form className="stock-form" onSubmit={(event) => save(event, item)}>
          <label>Name<input name="name" defaultValue={item.name} required maxLength={120} /></label>
          <div className="stock-form-grid">
            <label>Unit cost (incl GST)<input name="unitCost" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={item.unitCost || ""} placeholder="0.00" /></label>
            <label>Par level<input name="parLevel" type="number" min={0} step="0.01" inputMode="decimal" defaultValue={item.parLevel || ""} placeholder="0" /></label>
            <label>Counted in<select name="unit" defaultValue={item.unit}>{STOCK_UNITS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label>Category<select name="category" defaultValue={item.category}>{STOCK_CATEGORIES.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
          </div>
          <label>Supplier<input name="supplier" defaultValue={item.supplier ?? ""} maxLength={120} /></label>
          <label className="check"><input type="checkbox" name="active" defaultChecked /> Still stocked</label>
          <div className="actions"><button disabled={busy}>{busy ? "Saving…" : "Save"}</button><button type="button" className="secondary" onClick={() => setOpenId(null)}>Cancel</button></div>
        </form> : null}

        {canEdit && openId === item.id && mode !== "edit" ? <form className="stock-form" onSubmit={(event) => move(event, item, mode)}>
          <div className="stock-form-grid">
            <label>{mode === "delivery" ? "Units delivered" : "Units wasted"}<input name="quantity" type="number" min={0} step="0.01" inputMode="decimal" required autoFocus /></label>
            <label>Date<input name="movementDate" type="date" defaultValue={today()} required /></label>
          </div>
          <label>Note<input name="note" maxLength={500} placeholder={mode === "waste" ? "Broken, spilled, out of date…" : "Invoice number…"} /></label>
          <div className="actions"><button disabled={busy}>{busy ? "Saving…" : mode === "delivery" ? "Record delivery" : "Record waste"}</button><button type="button" className="secondary" onClick={() => setOpenId(null)}>Cancel</button></div>
        </form> : null}
      </li>)}
    </ul>
    {!shown.length ? <p className="hint">Nothing matches that.</p> : null}

    {canEdit ? <div className="stock-add">
      {adding ? <form className="stock-form" onSubmit={add}>
        <h3>New stock line</h3>
        <label>Name<input name="name" required maxLength={120} autoFocus /></label>
        <div className="stock-form-grid">
          <label>Unit cost<input name="unitCost" type="number" min={0} step="0.01" inputMode="decimal" placeholder="0.00" /></label>
          <label>Par level<input name="parLevel" type="number" min={0} step="0.01" inputMode="decimal" placeholder="0" /></label>
          <label>Counted in<select name="unit" defaultValue="bottle">{STOCK_UNITS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>Category<select name="category" defaultValue="spirits">{STOCK_CATEGORIES.map((value) => <option key={value} value={value}>{label(value)}</option>)}</select></label>
        </div>
        <label>Supplier<input name="supplier" maxLength={120} /></label>
        <div className="actions"><button disabled={busy}>{busy ? "Saving…" : "Add line"}</button><button type="button" className="secondary" onClick={() => setAdding(false)}>Cancel</button></div>
      </form> : <button type="button" onClick={() => { setAdding(true); setError(""); setSuccess(""); }}>Add a stock line</button>}
    </div> : null}
  </section>;
}
