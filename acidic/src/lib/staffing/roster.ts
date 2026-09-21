import { z } from "zod";
import { toMinutes } from "@/lib/dates";
import { fromCents, sumMoney, toCents } from "@/lib/money";
import { EMPLOYMENT_TYPES, SHIFT_ROLES, SHIFT_STATUSES } from "./vocab";

const time = z.string().regex(/^([01]\d|2[0-3]|24):[0-5]\d$/, "Use HH:MM");

export const staffInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  defaultRole: z.enum(SHIFT_ROLES),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  hourlyRate: z.number().min(0).max(1000),
}).strict();
export type StaffInput = z.infer<typeof staffInputSchema>;

export const shiftInputSchema = z.object({
  staffId: z.uuid(),
  shiftDate: z.iso.date(),
  startTime: time,
  endTime: time,
  role: z.enum(SHIFT_ROLES),
  status: z.enum(SHIFT_STATUSES).default("rostered"),
  breakMinutes: z.number().int().min(0).max(240).default(0),
  note: z.string().trim().max(300).nullable().default(null),
}).strict().superRefine((value, ctx) => {
  // The regex issues above are continuable, so a malformed time still reaches here; skip the
  // arithmetic rather than let toMinutes throw a 503 for a typo.
  if (!/^([01]\d|2[0-3]|24):[0-5]\d$/.test(value.startTime) || !/^([01]\d|2[0-3]|24):[0-5]\d$/.test(value.endTime)) return;
  const length = shiftMinutes(value);
  if (length <= 0) ctx.addIssue({ code: "custom", path: ["endTime"], message: "A shift must end after it starts (use 24:00 for midnight)." });
  if (length > 14 * 60) ctx.addIssue({ code: "custom", path: ["endTime"], message: "A shift longer than 14 hours needs to be split." });
  if (value.breakMinutes >= length) ctx.addIssue({ code: "custom", path: ["breakMinutes"], message: "The break cannot be as long as the shift." });
});
export type ShiftInput = z.infer<typeof shiftInputSchema>;

export type Shift = { staffId: string; shiftDate: string; startTime: string; endTime: string; role: string; status: string; breakMinutes: number };
export type StaffMember = { id: string; name: string; hourlyRate: number; employmentType: string };

export function shiftMinutes(shift: Pick<Shift, "startTime" | "endTime">): number {
  return toMinutes(shift.endTime) - toMinutes(shift.startTime);
}
/** Paid minutes: the shift less its unpaid break. */
export function paidMinutes(shift: Shift): number {
  return Math.max(shiftMinutes(shift) - shift.breakMinutes, 0);
}
/** Paid hours to two decimals - a display figure; cost is computed from minutes. */
export function paidHours(shift: Shift): number {
  return Math.round((paidMinutes(shift) / 60) * 100) / 100;
}
/** Base cost of a shift in dollars, from paid minutes × rate in cents, half up - never from
 * the display-rounded hours (10:00-17:20 at $34 is $249.33, not $249.22). No penalty rates
 * or loadings are applied - see ACIDIC_DECISIONS.md D3. */
export function shiftCost(shift: Shift, staff: StaffMember): number {
  return fromCents(Math.round((toCents(staff.hourlyRate) * paidMinutes(shift)) / 60));
}

export type RosterSummary = { hours: number; cost: number; shifts: number; byStaff: { staff: StaffMember; hours: number; cost: number; shifts: number }[] };

/** Rostered (or worked) hours and cost across a set of shifts. Cancelled and no-show shifts
 * cost nothing; `statuses` narrows to e.g. ["worked"] for the wages that actually happened. */
export function rosterSummary(shifts: readonly Shift[], staff: readonly StaffMember[], statuses: readonly string[] = ["rostered", "confirmed", "worked"]): RosterSummary {
  const byId = new Map(staff.map((member) => [member.id, member]));
  const counted = shifts.filter((shift) => statuses.includes(shift.status) && byId.has(shift.staffId));
  const byStaff = staff.map((member) => {
    const own = counted.filter((shift) => shift.staffId === member.id);
    return { staff: member, hours: round2(own.reduce((sum, shift) => sum + paidHours(shift), 0)), cost: sumMoney(own.map((shift) => shiftCost(shift, member))), shifts: own.length };
  }).filter((row) => row.shifts > 0);
  return { hours: round2(byStaff.reduce((sum, row) => sum + row.hours, 0)), cost: sumMoney(byStaff.map((row) => row.cost)), shifts: counted.length, byStaff };
}

/** Two shifts for the same person on the same date that overlap in time. */
export function overlappingShifts(shifts: readonly Shift[]): [Shift, Shift][] {
  const clashes: [Shift, Shift][] = [];
  const live = shifts.filter((shift) => shift.status !== "cancelled");
  for (let i = 0; i < live.length; i++) for (let j = i + 1; j < live.length; j++) {
    const a = live[i], b = live[j];
    if (a.staffId !== b.staffId || a.shiftDate !== b.shiftDate) continue;
    if (toMinutes(a.startTime) < toMinutes(b.endTime) && toMinutes(b.startTime) < toMinutes(a.endTime)) clashes.push([a, b]);
  }
  return clashes;
}

export type Coverage = { eventDate: string; title: string; required: number; rostered: number; short: number };

/** Each event night against the roster: how many people are on that date versus how many
 * the event says it needs. The Today view turns a shortfall into the first thing to fix. */
export function eventCoverage(events: readonly { eventDate: string; title: string; staffRequired: number; status: string }[], shifts: readonly Shift[]): Coverage[] {
  return events.filter((event) => event.status !== "cancelled").map((event) => {
    const rostered = new Set(shifts.filter((shift) => shift.shiftDate === event.eventDate && !["cancelled", "no_show"].includes(shift.status)).map((shift) => shift.staffId)).size;
    return { eventDate: event.eventDate, title: event.title, required: event.staffRequired, rostered, short: Math.max(event.staffRequired - rostered, 0) };
  });
}

function round2(value: number) { return Math.round(value * 100) / 100; }
