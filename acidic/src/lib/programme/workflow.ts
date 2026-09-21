import { z } from "zod";
import { EVENT_KINDS, EVENT_STATUSES, type EventStatus } from "./vocab";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");

/** What the owner or manager may enter for an event. Prices are dollars at the boundary. */
export const eventInputSchema = z.object({
  eventDate: z.iso.date(),
  title: z.string().trim().min(1).max(200),
  artist: z.string().trim().max(200).nullable().default(null),
  genre: z.string().trim().max(120).nullable().default(null),
  kind: z.enum(EVENT_KINDS).default("night_session"),
  status: z.enum(EVENT_STATUSES).default("placeholder"),
  startTime: time.nullable().default(null),
  endTime: time.nullable().default(null),
  ticketUrl: z.union([z.url().max(500), z.literal("")]).nullable().default(null),
  priceFrom: z.number().min(0).max(100_000).nullable().default(null),
  priceTo: z.number().min(0).max(100_000).nullable().default(null),
  description: z.string().trim().max(2000).nullable().default(null),
  staffRequired: z.number().int().min(0).max(30).default(2),
}).strict().superRefine((value, ctx) => {
  const url = value.ticketUrl || null;
  if (url && !["ticketed", "free_rsvp"].includes(value.status)) ctx.addIssue({ code: "custom", path: ["ticketUrl"], message: "A booking link is only shown for a ticketed or free-RSVP event." });
  if (["ticketed", "free_rsvp"].includes(value.status) && !url) ctx.addIssue({ code: "custom", path: ["ticketUrl"], message: "A ticketed or RSVP event needs its working booking link - the website never shows Book Tickets without one." });
  if (value.priceFrom !== null && value.priceTo !== null && value.priceTo < value.priceFrom) ctx.addIssue({ code: "custom", path: ["priceTo"], message: "Price to must not be below price from." });
  if (value.kind === "private_booking" && !["private", "cancelled"].includes(value.status)) ctx.addIssue({ code: "custom", path: ["status"], message: "A private booking is always status private." });
});
export type EventInput = z.infer<typeof eventInputSchema>;

/** Allowed status moves. Nothing skips straight from a held date to ticketed without being
 * confirmed, and a cancelled record stays cancelled (make a new one). */
const TRANSITIONS: Record<EventStatus, readonly EventStatus[]> = {
  placeholder: ["confirmed", "private", "cancelled"],
  confirmed: ["ticketed", "free_rsvp", "placeholder", "cancelled"],
  ticketed: ["confirmed", "cancelled"],
  free_rsvp: ["confirmed", "cancelled"],
  private: ["cancelled"],
  cancelled: [],
};
export function canTransition(from: EventStatus, to: EventStatus): boolean {
  return from === to || TRANSITIONS[from].includes(to);
}

/** The calendar treats every non-cancelled event as an occupied date. */
export function occupiesDate(status: EventStatus): boolean { return status !== "cancelled"; }

/** Two public events on one date is a clash to warn about; a private booking on a gig night
 * is a hard conflict, because the venue cannot be both. */
export function dateConflict(existing: readonly { status: EventStatus; kind: string }[], incoming: { status: EventStatus; kind: string }): "none" | "warning" | "conflict" {
  const live = existing.filter((event) => occupiesDate(event.status));
  if (!live.length || !occupiesDate(incoming.status)) return "none";
  const privateInvolved = incoming.kind === "private_booking" || live.some((event) => event.kind === "private_booking");
  return privateInvolved ? "conflict" : "warning";
}
