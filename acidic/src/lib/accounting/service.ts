import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { auditLog, ledgerEntries } from "@/db/schema";
import { HttpError } from "@/lib/errors";
import { ledgerInputSchema, ledgerSplit } from "./ledger";

export async function recordLedgerEntry(actorId: string, raw: unknown) {
  const input = ledgerInputSchema.parse(raw);
  const split = ledgerSplit(input);
  return db().transaction(async (tx) => {
    const [row] = await tx.insert(ledgerEntries).values({
      entryDate: input.entryDate, kind: input.kind, category: input.category, description: input.description,
      total: split.total.toFixed(2), gst: split.gst.toFixed(2), subtotal: split.subtotal.toFixed(2),
      gstFree: input.gstFree || input.kind === "wages" ? 1 : 0, paymentMethod: input.paymentMethod, eventId: input.eventId, reference: input.reference, recordedBy: actorId,
    }).returning();
    await tx.insert(auditLog).values({ actorId, entity: "ledger_entry", entityId: row.id, action: "recorded", detailJson: { kind: row.kind, category: row.category, total: row.total } });
    return row;
  });
}

const voidSchema = z.object({ reason: z.string().trim().min(3).max(300) }).strict();

/** Entries are never deleted or edited in place: a mistake is voided with a reason and the
 * correct entry recorded again, so the ledger always explains itself. */
export async function voidLedgerEntry(actorId: string, id: string, raw: unknown) {
  const { reason } = voidSchema.parse(raw);
  return db().transaction(async (tx) => {
    const [current] = await tx.select().from(ledgerEntries).where(eq(ledgerEntries.id, id)).for("update");
    if (!current) throw new HttpError(404, "That entry no longer exists.");
    if (current.voidedAt) throw new HttpError(409, "That entry is already void.");
    const [row] = await tx.update(ledgerEntries).set({ voidedAt: new Date(), voidReason: reason, updatedAt: new Date() }).where(eq(ledgerEntries.id, id)).returning();
    await tx.insert(auditLog).values({ actorId, entity: "ledger_entry", entityId: id, action: "voided", detailJson: { reason } });
    return row;
  });
}
