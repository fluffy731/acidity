"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/client-api";
import { EVENT_KINDS, EVENT_STATUSES } from "@/lib/programme/vocab";
import { Message, errorMessage } from "./ui";

/** New event, straight to POST /api/events. The server's Zod schema is the contract; this form
 * only shapes the fields. The same pattern serves stock counts, shifts and ledger entries. */
export function EventForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const text = (name: string) => String(data.get(name) ?? "").trim();
    const optional = (name: string) => text(name) || null;
    const number = (name: string) => (text(name) ? Number(text(name)) : null);
    try {
      const { event: saved } = await apiRequest<{ event: { title: string; eventDate: string } }>("/api/events", "POST", {
        eventDate: text("eventDate"), title: text("title"), artist: optional("artist"), genre: optional("genre"),
        kind: text("kind"), status: text("status"), startTime: optional("startTime"), endTime: optional("endTime"),
        ticketUrl: optional("ticketUrl"), priceFrom: number("priceFrom"), priceTo: number("priceTo"),
        description: optional("description"), staffRequired: Number(text("staffRequired") || 2),
      });
      setSuccess(`Saved ${saved.title} on ${saved.eventDate}.`);
      form.reset();
      router.refresh();
    } catch (caught) { setError(errorMessage(caught)); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="panel entry-form"><h2>Add an event</h2>
    <div className="form-grid">
      <label>Date<input type="date" name="eventDate" required /></label>
      <label>Title<input name="title" maxLength={200} required /></label>
      <label>Artist<input name="artist" maxLength={200} /></label>
      <label>Genre<input name="genre" maxLength={120} /></label>
      <label>Kind<select name="kind" defaultValue="night_session">{EVENT_KINDS.map((kind) => <option key={kind} value={kind}>{kind.replace(/_/g, " ")}</option>)}</select></label>
      <label>Status<select name="status" defaultValue="placeholder">{EVENT_STATUSES.filter((status) => status !== "cancelled").map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}</select></label>
      <label>Start (HH:MM)<input name="startTime" pattern="([01]\d|2[0-3]):[0-5]\d" placeholder="19:30" /></label>
      <label>End (HH:MM)<input name="endTime" pattern="([01]\d|2[0-3]):[0-5]\d" /></label>
      <label>Booking link (ticketed / RSVP only)<input name="ticketUrl" type="url" maxLength={500} /></label>
      <label>Staff required<input name="staffRequired" type="number" min={0} max={30} defaultValue={2} /></label>
      <label>Price from ($)<input name="priceFrom" type="number" min={0} step="0.01" /></label>
      <label>Price to ($)<input name="priceTo" type="number" min={0} step="0.01" /></label>
    </div>
    <label>Description<textarea name="description" maxLength={2000} rows={2} /></label>
    <Message error={error} success={success} />
    <div className="actions"><button disabled={busy}>{busy ? "Saving…" : "Save event"}</button></div>
    <p className="hint">A booking link is only accepted with a ticketed or free-RSVP status, and those statuses require one. A private booking is always status private.</p>
  </form>;
}
