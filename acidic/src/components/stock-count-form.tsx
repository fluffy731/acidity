"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/client-api";
import { Message, errorMessage } from "./ui";

/** A whole-bar count: one quantity per active line. Leave a line blank to skip it. */
export function StockCountForm({ items }: { items: { id: string; name: string; unit: string; parLevel: number }[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const lines = items.map((item) => ({ itemId: item.id, raw: String(data.get(`qty:${item.id}`) ?? "").trim() })).filter((line) => line.raw !== "").map((line) => ({ itemId: line.itemId, quantity: Number(line.raw) }));
    try {
      if (!lines.length) throw new Error("Enter at least one quantity.");
      const { count } = await apiRequest<{ count: { countDate: string } }>("/api/stock/counts", "POST", { countDate: String(data.get("countDate") ?? ""), note: String(data.get("note") ?? "").trim() || null, lines });
      setSuccess(`Recorded the ${count.countDate} count, ${lines.length} line${lines.length === 1 ? "" : "s"}.`);
      form.reset();
      router.refresh();
    } catch (caught) { setError(errorMessage(caught)); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="panel entry-form"><h2>Record a stocktake</h2>
    <div className="form-grid">
      <label>Count date<input type="date" name="countDate" required /></label>
      <label>Note<input name="note" maxLength={500} /></label>
    </div>
    <table><thead><tr><th>Item</th><th className="num">Par</th><th className="num">Counted</th></tr></thead><tbody>
      {items.map((item) => <tr key={item.id}><td>{item.name}</td><td className="num">{item.parLevel} {item.unit}</td><td className="num"><input name={`qty:${item.id}`} type="number" min={0} step="0.01" inputMode="decimal" style={{ width: "6.5rem" }} aria-label={`${item.name} counted`} /></td></tr>)}
    </tbody></table>
    <Message error={error} success={success} />
    <div className="actions"><button disabled={busy}>{busy ? "Saving…" : "Save count"}</button></div>
    <p className="hint">Record deliveries and waste between counts through the API for now (POST /api/stock/movements); usage is worked out from the difference.</p>
  </form>;
}
