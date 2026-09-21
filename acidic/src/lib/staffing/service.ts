import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLog, shifts, staffMembers } from "@/db/schema";
import { HttpError } from "@/lib/errors";
import { overlappingShifts, shiftInputSchema, staffInputSchema } from "./roster";

export async function createStaffMember(actorId: string, raw: unknown) {
  const input = staffInputSchema.parse(raw);
  return db().transaction(async (tx) => {
    const [row] = await tx.insert(staffMembers).values({ ...input, hourlyRate: input.hourlyRate.toFixed(2) }).returning();
    await tx.insert(auditLog).values({ actorId, entity: "staff_member", entityId: row.id, action: "created", detailJson: { name: row.name } });
    return row;
  });
}

export async function createShift(actorId: string, raw: unknown) {
  const input = shiftInputSchema.parse(raw);
  return db().transaction(async (tx) => {
    const [member] = await tx.select({ id: staffMembers.id, active: staffMembers.active }).from(staffMembers).where(eq(staffMembers.id, input.staffId));
    if (!member || member.active !== 1) throw new HttpError(404, "That staff member is not active.");
    const sameDay = await tx.select().from(shifts).where(and(eq(shifts.staffId, input.staffId), eq(shifts.shiftDate, input.shiftDate)));
    if (overlappingShifts([...sameDay, input]).length) throw new HttpError(409, "That person already has a shift overlapping those hours.");
    const [row] = await tx.insert(shifts).values({ ...input, createdBy: actorId }).returning();
    await tx.insert(auditLog).values({ actorId, entity: "shift", entityId: row.id, action: "created", detailJson: { shiftDate: row.shiftDate, staffId: row.staffId } });
    return row;
  });
}

export async function updateShift(actorId: string, id: string, raw: unknown) {
  const input = shiftInputSchema.parse(raw);
  return db().transaction(async (tx) => {
    const [current] = await tx.select().from(shifts).where(eq(shifts.id, id)).for("update");
    if (!current) throw new HttpError(404, "That shift no longer exists.");
    const others = await tx.select().from(shifts).where(and(eq(shifts.staffId, input.staffId), eq(shifts.shiftDate, input.shiftDate), ne(shifts.id, id)));
    if (overlappingShifts([...others, input]).length) throw new HttpError(409, "That person already has a shift overlapping those hours.");
    const [row] = await tx.update(shifts).set({ ...input, updatedAt: new Date() }).where(eq(shifts.id, id)).returning();
    await tx.insert(auditLog).values({ actorId, entity: "shift", entityId: id, action: current.status === input.status ? "edited" : `status:${current.status}->${input.status}`, detailJson: {} });
    return row;
  });
}
