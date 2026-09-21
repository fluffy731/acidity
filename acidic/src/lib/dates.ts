/** Acidity trades in Melbourne. Every "today", trading day and roster date is Melbourne local. */
export const VENUE_TZ = "Australia/Melbourne";

export function melbourneDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-AU", { timeZone: VENUE_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

/** 0 = Sunday ... 6 = Saturday, for a plain calendar date. */
export function dayOfWeek(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** The Monday that starts the roster week containing `date`. */
export function weekStart(date: string): string {
  const dow = dayOfWeek(date);
  return addDays(date, dow === 0 ? -6 : 1 - dow);
}

/** Minutes since midnight for "HH:MM"; "24:00" is allowed as an end time. */
export function toMinutes(hhmm: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!match) throw new Error(`Time must be HH:MM, received ${hhmm}.`);
  const hours = Number(match[1]), minutes = Number(match[2]);
  if (hours > 24 || minutes > 59 || (hours === 24 && minutes > 0)) throw new Error(`Time must be HH:MM, received ${hhmm}.`);
  return hours * 60 + minutes;
}

/** Australian financial year: 1 July - 30 June, labelled by the years it spans. */
export function financialYear(dateValue: string): string {
  const [year, month] = dateValue.split("-").map(Number);
  if (!year || !month) return "Unknown";
  const startYear = month >= 7 ? year : year - 1;
  return `FY${startYear}-${String((startYear + 1) % 100).padStart(2, "0")}`;
}

/** BAS quarter (Q1 = Jul-Sep, Q2 = Oct-Dec, Q3 = Jan-Mar, Q4 = Apr-Jun) as "FY2026-27 Q1"
 * with its inclusive date bounds. */
export function basQuarter(dateValue: string): { label: string; start: string; end: string } {
  const [year, month] = dateValue.split("-").map(Number);
  const fy = financialYear(dateValue);
  const quarter = month >= 7 ? Math.floor((month - 7) / 3) + 1 : Math.floor((month - 1) / 3) + 3;
  const startMonth = [7, 10, 1, 4][quarter - 1];
  const startYear = quarter <= 2 ? year : year;
  const endMonth = startMonth + 2;
  const endDay = new Date(Date.UTC(startYear, endMonth, 0)).getUTCDate();
  const pad = (n: number) => String(n).padStart(2, "0");
  return { label: `${fy} Q${quarter}`, start: `${startYear}-${pad(startMonth)}-01`, end: `${startYear}-${pad(endMonth)}-${pad(endDay)}` };
}
