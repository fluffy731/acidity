import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLog, events } from "@/db/schema";
import { HttpError } from "@/lib/errors";
import { canTransition, dateConflict, eventInputSchema } from "./workflow";
import type { EventStatus } from "./vocab";

const toRow = (input: ReturnType<typeof eventInputSchema.parse>) => ({
  eventDate: input.eventDate, title: input.title, artist: input.artist, genre: input.genre, kind: input.kind, status: input.status,
  startTime: input.startTime, endTime: input.endTime, ticketUrl: input.ticketUrl || null,
  priceFrom: input.priceFrom === null ? null : input.priceFrom.toFixed(2), priceTo: input.priceTo === null ? null : input.priceTo.toFixed(2),
  description: input.description, staffRequired: input.staffRequired,
});

export async function createEvent(actorId: string, raw: unknown) {
  const input = eventInputSchema.parse(raw);
  return db().transaction(async (tx) => {
    const sameDay = await tx.select({ status: events.status, kind: events.kind }).from(events).where(eq(events.eventDate, input.eventDate));
    if (dateConflict(sameDay.map((row) => ({ status: row.status as EventStatus, kind: row.kind })), input) === "conflict") throw new HttpError(409, "That date already has a booking the venue cannot share. Cancel it first, or choose another date.");
    const [row] = await tx.insert(events).values({ ...toRow(input), createdBy: actorId }).returning();
    await tx.insert(auditLog).values({ actorId, entity: "event", entityId: row.id, action: "created", detailJson: { title: row.title, eventDate: row.eventDate, status: row.status } });
    return row;
  });
}

export async function updateEvent(actorId: string, id: string, raw: unknown) {
  const input = eventInputSchema.parse(raw);
  return db().transaction(async (tx) => {
    const [current] = await tx.select().from(events).where(eq(events.id, id)).for("update");
    if (!current) throw new HttpError(404, "That event no longer exists.");
    if (!canTransition(current.status as EventStatus, input.status)) throw new HttpError(409, `An event cannot move from ${current.status} to ${input.status}.`);
    const sameDay = await tx.select({ status: events.status, kind: events.kind }).from(events).where(and(eq(events.eventDate, input.eventDate), ne(events.id, id)));
    if (dateConflict(sameDay.map((row) => ({ status: row.status as EventStatus, kind: row.kind })), input) === "conflict") throw new HttpError(409, "That date already has a booking the venue cannot share.");
    const [row] = await tx.update(events).set({ ...toRow(input), updatedAt: new Date() }).where(eq(events.id, id)).returning();
    await tx.insert(auditLog).values({ actorId, entity: "event", entityId: id, action: current.status === input.status ? "edited" : `status:${current.status}->${input.status}`, detailJson: { title: row.title } });
    return row;
  });
}
