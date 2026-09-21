"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/client-api";
import { SHIFT_ROLES, SHIFT_STATUSES } from "@/lib/staffing/vocab";
import { Message, errorMessage } from "./ui";

export function ShiftForm({ staff }: { staff: { id: string; name: string; defaultRole: string }[] }) {
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
      const { shift } = await apiRequest<{ shift: { shiftDate: string; startTime: string; endTime: string } }>("/api/shifts", "POST", {
        staffId: text("staffId"), shiftDate: text("shiftDate"), startTime: text("startTime"), endTime: text("endTime"),
        role: text("role"), status: text("status"), breakMinutes: Number(text("breakMinutes") || 0), note: text("note") || null,
      });
      setSuccess(`Rostered ${shift.shiftDate} ${shift.startTime}–${shift.endTime}.`);
      form.reset();
      router.refresh();
    } catch (caught) { setError(errorMessage(caught)); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="panel entry-form"><h2>Add a shift</h2>
    <div className="form-grid">
      <label>Person<select name="staffId" required defaultValue="">{[<option key="" value="" disabled>Choose…</option>, ...staff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)]}</select></label>
      <label>Date<input type="date" name="shiftDate" required /></label>
      <label>Start (HH:MM)<input name="startTime" pattern="([01]\d|2[0-3]):[0-5]\d" placeholder="18:00" required /></label>
      <label>End (HH:MM, 24:00 = midnight)<input name="endTime" pattern="([01]\d|2[0-3]|24):[0-5]\d" placeholder="24:00" required /></label>
      <label>Role<select name="role" defaultValue="bartender">{SHIFT_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}</select></label>
      <label>Status<select name="status" defaultValue="rostered">{SHIFT_STATUSES.map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}</select></label>
      <label>Unpaid break (min)<input name="breakMinutes" type="number" min={0} max={240} defaultValue={0} /></label>
      <label>Note<input name="note" maxLength={300} /></label>
    </div>
    <Message error={error} success={success} />
    <div className="actions"><button disabled={busy}>{busy ? "Saving…" : "Add shift"}</button></div>
    <p className="hint">Overlapping shifts for the same person are refused. Mark a shift worked after the night so wages and coverage reflect what happened.</p>
  </form>;
}
