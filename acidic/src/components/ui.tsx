import type { ReactNode } from "react";

export function PageHeading({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return <div className="page-heading"><div><h1>{title}</h1>{children ? <p>{children}</p> : null}</div>{action}</div>;
}
const LABELS: Record<string, string> = {
  placeholder: "Details TBA", confirmed: "Confirmed", ticketed: "Ticketed", free_rsvp: "Free RSVP", private: "Private", cancelled: "Cancelled",
  rostered: "Rostered", worked: "Worked", no_show: "No show", income: "Income", expense: "Expense", wages: "Wages",
  night_session: "Night session", day_programme: "Day programme", private_booking: "Private booking",
};
export function Status({ value }: { value: string }) {
  return <span className={`status status-${value}`}>{LABELS[value] ?? value.replace(/_/g, " ")}</span>;
}
export function Message({ error, success }: { error?: string; success?: string }) {
  return <>{error ? <p className="message error" role="alert">{error}</p> : null}{success ? <p className="message success" role="status">{success}</p> : null}</>;
}
export const currency = (value: number) => new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(value);
/** Plain dates render in UTC (exactly as stored); timestamps in Melbourne time. Both server
 * and client then agree, so there can be no hydration mismatch near midnight. */
export const date = (value: string) => new Intl.DateTimeFormat("en-AU", { dateStyle: "medium", timeZone: /^\d{4}-\d{2}-\d{2}$/.test(value) ? "UTC" : "Australia/Melbourne" }).format(new Date(value));
export function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <article className="kpi"><span className="kpi-label">{label}</span><strong className="kpi-value">{value}</strong>{hint ? <span className="kpi-hint">{hint}</span> : null}</article>;
}
export function errorMessage(error: unknown) { return error instanceof Error ? error.message : "Something went wrong. Please try again."; }
