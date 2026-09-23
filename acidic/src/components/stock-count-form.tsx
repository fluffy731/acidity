"use client";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/client-api";
import { Message, errorMessage } from "./ui";

type CountItem = { id: string; name: string; unit: string; parLevel: number; category: string };

const label = (value: string) => value.replace(/_/g, " ");
const today = () => new Date().toISOString().slice(0, 10);

/** A whole-bar count, done on a phone while walking the room. Quantities are held in state
 *  rather than in the form, so searching or collapsing a section never loses what was typed;
 *  a blank line is simply not counted. */
export function StockCountForm({ items }: { items: CountItem[] }) {
  const router = useRouter();
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = needle ? items.filter((item) => item.name.toLowerCase().includes(needle)) : items;
    const byCategory = new Map<string, CountItem[]>();
    for (const item of matching) byCategory.set(item.category, [...(byCategory.get(item.category) ?? []), item]);
    return [...byCategory.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [items, query]);

  const entered = Object.values(counts).filter((value) => value.trim() !== "").length;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    const data = new FormData(event.currentTarget);
    const lines = Object.entries(counts)
      .filter(([, value]) => value.trim() !== "")
      .map(([itemId, value]) => ({ itemId, quantity: Number(value) }));
    try {
      if (!lines.length) throw new Error("Enter at least one quantity.");
      const { count } = await apiRequest<{ count: { countDate: string } }>("/api/stock/counts", "POST", {
        countDate: String(data.get("countDate") ?? ""),
        note: String(data.get("note") ?? "").trim() || null,
        lines,
      });
      setSuccess(`Recorded the ${count.countDate} count, ${lines.length} line${lines.length === 1 ? "" : "s"}.`);
      setCounts({}); setOpen(false); router.refresh();
    } catch (caught) { setError(errorMessage(caught)); }
    finally { setBusy(false); }
  }

  // The form closes when a count is saved, so the confirmation has to live out here - otherwise
  // the sheet just vanishes and, on a phone, that reads as a failure.
  if (!open) return <section className="panel">
    <h2>Stocktake</h2>
    <Message success={success} />
    <p className="hint">Count the bar section by section. Anything you leave blank is simply not counted.</p>
    <button type="button" onClick={() => { setSuccess(""); setOpen(true); }} className="wide">Start a stocktake</button>
  </section>;

  return <form onSubmit={submit} className="panel entry-form">
    <h2>Record a stocktake</h2>
    <div className="form-grid">
      <label>Count date<input type="date" name="countDate" defaultValue={today()} required /></label>
      <label>Note<input name="note" maxLength={500} /></label>
    </div>
    <div className="stock-filters">
      <input type="search" inputMode="search" placeholder="Jump to a line…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search the count sheet" />
    </div>
    <p className="hint">{entered} of {items.length} counted</p>

    {groups.map(([category, lines]) => {
      const shut = collapsed[category] && !query;
      const done = lines.filter((item) => (counts[item.id] ?? "").trim() !== "").length;
      return <div key={category} className="count-group">
        <button type="button" className="count-group-head" onClick={() => setCollapsed((state) => ({ ...state, [category]: !state[category] }))} aria-expanded={!shut}>
          <span>{label(category)}</span>
          <span className="count-progress">{done}/{lines.length}</span>
        </button>
        {!shut ? <ul className="count-lines">
          {lines.map((item) => <li key={item.id} className="count-line">
            <span className="count-name">{item.name}<span className="hint"> · par {item.parLevel || "—"} {item.unit}</span></span>
            <input type="number" min={0} step="0.01" inputMode="decimal" aria-label={`${item.name} counted`}
              value={counts[item.id] ?? ""} onChange={(event) => setCounts((state) => ({ ...state, [item.id]: event.target.value }))} />
          </li>)}
        </ul> : null}
      </div>;
    })}
    {!groups.length ? <p className="hint">Nothing matches that.</p> : null}

    <Message error={error} success={success} />
    <div className="actions">
      <button disabled={busy || !entered}>{busy ? "Saving…" : `Save count (${entered})`}</button>
      <button type="button" className="secondary" onClick={() => setOpen(false)}>Close</button>
    </div>
    <p className="hint">Deliveries and waste are recorded on each line below; usage is the difference between two counts.</p>
  </form>;
}
