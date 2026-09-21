"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/client-api";
import { LEDGER_CATEGORIES, LEDGER_KINDS, PAYMENT_METHODS } from "@/lib/accounting/vocab";
import { Message, errorMessage } from "./ui";

/** One ledger entry: a GST-inclusive total and whether it is GST-free. The split is computed
 * on the server, once, and stored. */
export function LedgerForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    try {
      const { entry } = await apiRequest<{ entry: { total: string; description: string } }>("/api/ledger", "POST", {
        entryDate: text("entryDate"), kind: text("kind"), category: text("category"), description: text("description"),
        total: Number(text("total")), gstFree: data.get("gstFree") === "on", paymentMethod: text("paymentMethod") || null,
        reference: text("reference") || null,
      });
      setSuccess(`Recorded ${entry.description}, $${entry.total}.`);
      form.reset();
      router.refresh();
    } catch (caught) { setError(errorMessage(caught)); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="panel entry-form"><h2>Record takings, a purchase or wages</h2>
    <div className="form-grid">
      <label>Date<input type="date" name="entryDate" required /></label>
      <label>Kind<select name="kind" defaultValue="income">{LEDGER_KINDS.map((kind) => <option key={kind} value={kind}>{kind}</option>)}</select></label>
      <label>Category<select name="category" defaultValue="bar_takings">{LEDGER_CATEGORIES.map((category) => <option key={category} value={category}>{category.replace(/_/g, " ")}</option>)}</select></label>
      <label>Total inc GST ($)<input name="total" type="number" min={0} step="0.01" required /></label>
      <label>Payment method<select name="paymentMethod" defaultValue=""><option value="">—</option>{PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method.replace(/_/g, " ")}</option>)}</select></label>
      <label>Reference<input name="reference" maxLength={120} /></label>
    </div>
    <label>Description<input name="description" maxLength={300} required /></label>
    <label className="check"><input type="checkbox" name="gstFree" /> GST-free (wages, rent without GST, fresh food inputs)</label>
    <Message error={error} success={success} />
    <div className="actions"><button disabled={busy}>{busy ? "Saving…" : "Record entry"}</button></div>
    <p className="hint">Wages must be the wages_payment category and GST-free. A mistake is voided by the owner, never edited.</p>
  </form>;
}
