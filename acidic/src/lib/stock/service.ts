import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLog, stockCountLines, stockCounts, stockItems, stockMovements } from "@/db/schema";
import { HttpError } from "@/lib/errors";
import { stockCountInputSchema, stockItemInputSchema, stockItemUpdateSchema, stockMovementInputSchema } from "./engine";

export async function createStockItem(actorId: string, raw: unknown) {
  const input = stockItemInputSchema.parse(raw);
  return db().transaction(async (tx) => {
    const [row] = await tx.insert(stockItems).values({ ...input, unitCost: input.unitCost.toFixed(2), parLevel: input.parLevel.toFixed(2) }).onConflictDoNothing().returning();
    if (!row) throw new HttpError(409, "A stock line with that name already exists.");
    await tx.insert(auditLog).values({ actorId, entity: "stock_item", entityId: row.id, action: "created", detailJson: { name: row.name } });
    return row;
  });
}

/** Edit a stock line: cost, par, supplier, name, or retire it. The numbers a bar actually
 *  maintains are the cost and the par level, and both are typed on a phone behind the bar. */
export async function updateStockItem(actorId: string, id: string, raw: unknown) {
  const input = stockItemUpdateSchema.parse(raw);
  return db().transaction(async (tx) => {
    const [current] = await tx.select().from(stockItems).where(eq(stockItems.id, id)).for("update");
    if (!current) throw new HttpError(404, "That stock line no longer exists.");
    const patch: Record<string, unknown> = { updatedAt: new Date() };
    if (input.name !== undefined) patch.name = input.name;
    if (input.category !== undefined) patch.category = input.category;
    if (input.unit !== undefined) patch.unit = input.unit;
    if (input.supplier !== undefined) patch.supplier = input.supplier;
    if (input.unitCost !== undefined) patch.unitCost = input.unitCost.toFixed(2);
    if (input.parLevel !== undefined) patch.parLevel = input.parLevel.toFixed(2);
    if (input.active !== undefined) patch.active = input.active ? 1 : 0;
    const [row] = await tx.update(stockItems).set(patch).where(eq(stockItems.id, id)).returning();
    await tx.insert(auditLog).values({ actorId, entity: "stock_item", entityId: id, action: "edited", detailJson: { name: row.name, fields: Object.keys(patch).filter((key) => key !== "updatedAt") } });
    return row;
  });
}

export async function recordStockCount(actorId: string, raw: unknown) {
  const input = stockCountInputSchema.parse(raw);
  return db().transaction(async (tx) => {
    const known = new Set((await tx.select({ id: stockItems.id }).from(stockItems)).map((row) => row.id));
    const unknown = input.lines.find((line) => !known.has(line.itemId));
    if (unknown) throw new HttpError(400, "One of the counted lines is not a known stock item.");
    const [count] = await tx.insert(stockCounts).values({ countDate: input.countDate, note: input.note, countedBy: actorId }).returning();
    await tx.insert(stockCountLines).values(input.lines.map((line) => ({ countId: count.id, itemId: line.itemId, quantity: line.quantity.toFixed(2) })));
    await tx.insert(auditLog).values({ actorId, entity: "stock_count", entityId: count.id, action: "recorded", detailJson: { countDate: count.countDate, lines: input.lines.length } });
    return count;
  });
}

export async function recordStockMovement(actorId: string, raw: unknown) {
  const input = stockMovementInputSchema.parse(raw);
  return db().transaction(async (tx) => {
    const [item] = await tx.select({ id: stockItems.id }).from(stockItems).where(eq(stockItems.id, input.itemId));
    if (!item) throw new HttpError(404, "That stock item does not exist.");
    const [row] = await tx.insert(stockMovements).values({ ...input, quantity: input.quantity.toFixed(2), recordedBy: actorId }).returning();
    await tx.insert(auditLog).values({ actorId, entity: "stock_movement", entityId: row.id, action: row.kind, detailJson: { itemId: row.itemId, quantity: row.quantity } });
    return row;
  });
}
