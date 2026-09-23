import { z } from "zod";
import { multiplyMoney, sumMoney } from "@/lib/money";
import { MOVEMENT_KINDS, STOCK_CATEGORIES, STOCK_UNITS } from "./vocab";

export const stockItemInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  category: z.enum(STOCK_CATEGORIES),
  unit: z.enum(STOCK_UNITS),
  unitCost: z.number().min(0).max(100_000),
  parLevel: z.number().min(0).max(100_000).default(0),
  supplier: z.string().trim().max(120).nullable().default(null),
}).strict();
export type StockItemInput = z.infer<typeof stockItemInputSchema>;

/** An edit from the Stock screen: send only what changed. `active: false` retires a line -
 *  it keeps its history and leaves the count sheet, the reorder list and the stock value.
 *  Written out rather than derived with `.partial()`, because partial keeps the create
 *  schema's defaults: a request that set only the cost would arrive carrying parLevel 0 and
 *  supplier null and quietly wipe both. */
export const stockItemUpdateSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  category: z.enum(STOCK_CATEGORIES).optional(),
  unit: z.enum(STOCK_UNITS).optional(),
  unitCost: z.number().min(0).max(100_000).optional(),
  parLevel: z.number().min(0).max(100_000).optional(),
  supplier: z.string().trim().max(120).nullable().optional(),
  active: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, { message: "Nothing to change." });
export type StockItemUpdate = z.infer<typeof stockItemUpdateSchema>;

export const stockCountInputSchema = z.object({
  countDate: z.iso.date(),
  note: z.string().trim().max(500).nullable().default(null),
  lines: z.array(z.object({ itemId: z.uuid(), quantity: z.number().min(0).max(1_000_000) }).strict()).min(1).max(500),
}).strict().refine((value) => new Set(value.lines.map((line) => line.itemId)).size === value.lines.length, { message: "Each item may appear once in a count.", path: ["lines"] });
export type StockCountInput = z.infer<typeof stockCountInputSchema>;

export const stockMovementInputSchema = z.object({
  itemId: z.uuid(),
  movementDate: z.iso.date(),
  kind: z.enum(MOVEMENT_KINDS),
  quantity: z.number().positive().max(1_000_000),
  note: z.string().trim().max(500).nullable().default(null),
}).strict();
export type StockMovementInput = z.infer<typeof stockMovementInputSchema>;

export type StockItem = { id: string; name: string; category: string; unit: string; unitCost: number; parLevel: number };
export type CountLine = { itemId: string; quantity: number };
export type Movement = { itemId: string; kind: "delivery" | "waste" | "adjustment"; quantity: number };

/** The value of what is on the shelf, at supplier cost, in cents-exact money. */
export function stockValue(items: readonly StockItem[], lines: readonly CountLine[]): number {
  const byId = new Map(items.map((item) => [item.id, item]));
  return sumMoney(lines.map((line) => { const item = byId.get(line.itemId); return item ? multiplyMoney(item.unitCost, line.quantity) : 0; }));
}

export type UsageLine = { item: StockItem; opening: number; delivered: number; wasted: number; adjusted: number; closing: number; used: number; usedValue: number };

/** Usage between two counts: opening + deliveries - waste - adjustments - closing = what was
 * sold or is unaccounted for. Negative usage means more was counted than can be explained -
 * a miscount or a missed delivery, surfaced rather than hidden. */
export function usageBetweenCounts(items: readonly StockItem[], opening: readonly CountLine[], closing: readonly CountLine[], movements: readonly Movement[]): UsageLine[] {
  const open = new Map(opening.map((line) => [line.itemId, line.quantity]));
  const close = new Map(closing.map((line) => [line.itemId, line.quantity]));
  return items.map((item) => {
    const own = movements.filter((movement) => movement.itemId === item.id);
    const sum = (kind: Movement["kind"]) => round2(own.filter((m) => m.kind === kind).reduce((total, m) => total + m.quantity, 0));
    const delivered = sum("delivery"), wasted = sum("waste"), adjusted = sum("adjustment");
    const openingQty = open.get(item.id) ?? 0, closingQty = close.get(item.id) ?? 0;
    const used = round2(openingQty + delivered - wasted - adjusted - closingQty);
    return { item, opening: openingQty, delivered, wasted, adjusted, closing: closingQty, used, usedValue: multiplyMoney(item.unitCost, Math.max(used, 0)) };
  });
}

/** Cost of goods for the period: the value of everything used, plus waste at cost. */
export function costOfGoods(usage: readonly UsageLine[]): { usedValue: number; wasteValue: number } {
  return { usedValue: sumMoney(usage.map((line) => line.usedValue)), wasteValue: sumMoney(usage.map((line) => multiplyMoney(line.item.unitCost, line.wasted))) };
}

export type Reorder = { item: StockItem; onHand: number; shortBy: number; orderValue: number };

/** Everything below par, with how much to order to get back to par and what that costs. */
export function reorderList(items: readonly StockItem[], latest: readonly CountLine[]): Reorder[] {
  const onHand = new Map(latest.map((line) => [line.itemId, line.quantity]));
  return items
    .map((item) => ({ item, onHand: onHand.get(item.id) ?? 0 }))
    .filter(({ item, onHand: qty }) => item.parLevel > 0 && qty < item.parLevel)
    .map(({ item, onHand: qty }) => { const shortBy = round2(item.parLevel - qty); return { item, onHand: qty, shortBy, orderValue: multiplyMoney(item.unitCost, shortBy) }; })
    .sort((a, b) => b.orderValue - a.orderValue);
}

function round2(value: number) { return Math.round(value * 100) / 100; }
