import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLog, recipeLines, recipes, stockItems } from "@/db/schema";
import { HttpError } from "@/lib/errors";
import { recipeInputSchema, type RecipeLineInput } from "./engine";

/** Lines are replaced wholesale rather than patched one by one: a spec is edited as a whole
 *  card ("45ml not 35ml, and drop the bitters"), and replacing inside the transaction means a
 *  half-applied recipe can never be read. */
async function writeLines(tx: Parameters<Parameters<ReturnType<typeof db>["transaction"]>[0]>[0], recipeId: string, lines: readonly RecipeLineInput[]) {
  await tx.delete(recipeLines).where(eq(recipeLines.recipeId, recipeId));
  if (!lines.length) return;
  const itemIds = [...new Set(lines.map((line) => line.itemId).filter((id): id is string => Boolean(id)))];
  if (itemIds.length) {
    const known = new Set((await tx.select({ id: stockItems.id }).from(stockItems)).map((row) => row.id));
    const missing = itemIds.find((id) => !known.has(id));
    if (missing) throw new HttpError(400, "One of the ingredients points at a stock line that does not exist.");
  }
  await tx.insert(recipeLines).values(lines.map((line, index) => ({
    recipeId, position: index, ingredient: line.ingredient,
    quantity: line.quantity === null ? null : line.quantity.toFixed(2),
    unit: line.unit, itemId: line.itemId, note: line.note,
  })));
}

export async function createRecipe(actorId: string, raw: unknown) {
  const input = recipeInputSchema.parse(raw);
  return db().transaction(async (tx) => {
    const [row] = await tx.insert(recipes).values({
      name: input.name, kind: input.kind, family: input.family, glass: input.glass,
      method: input.method, methodNote: input.methodNote, garnish: input.garnish,
      menuPrice: input.menuPrice === null ? null : input.menuPrice.toFixed(2),
      notes: input.notes, active: input.active ? 1 : 0, createdBy: actorId,
    }).onConflictDoNothing().returning();
    if (!row) throw new HttpError(409, "A recipe with that name already exists.");
    await writeLines(tx, row.id, input.lines);
    await tx.insert(auditLog).values({ actorId, entity: "recipe", entityId: row.id, action: "created", detailJson: { name: row.name, lines: input.lines.length } });
    return row;
  });
}

export async function updateRecipe(actorId: string, id: string, raw: unknown) {
  const input = recipeInputSchema.parse(raw);
  return db().transaction(async (tx) => {
    const [current] = await tx.select().from(recipes).where(eq(recipes.id, id)).for("update");
    if (!current) throw new HttpError(404, "That recipe no longer exists.");
    const [row] = await tx.update(recipes).set({
      name: input.name, kind: input.kind, family: input.family, glass: input.glass,
      method: input.method, methodNote: input.methodNote, garnish: input.garnish,
      menuPrice: input.menuPrice === null ? null : input.menuPrice.toFixed(2),
      notes: input.notes, active: input.active ? 1 : 0, updatedAt: new Date(),
    }).where(eq(recipes.id, id)).returning();
    await writeLines(tx, id, input.lines);
    await tx.insert(auditLog).values({ actorId, entity: "recipe", entityId: id, action: "edited", detailJson: { name: row.name, lines: input.lines.length } });
    return row;
  });
}

/** Everything needed to show the recipe book, newest conventions first: house list by family,
 *  then classics, each alphabetical. */
export async function listRecipes() {
  const database = db();
  const [recipeRows, lineRows] = await Promise.all([
    database.select().from(recipes).orderBy(asc(recipes.kind), asc(recipes.name)),
    database.select().from(recipeLines).orderBy(asc(recipeLines.recipeId), asc(recipeLines.position)),
  ]);
  return recipeRows.map((row) => ({
    id: row.id, name: row.name, kind: row.kind, family: row.family, glass: row.glass,
    method: row.method, methodNote: row.methodNote, garnish: row.garnish,
    menuPrice: row.menuPrice === null ? null : Number(row.menuPrice),
    notes: row.notes, active: row.active === 1,
    lines: lineRows.filter((line) => line.recipeId === row.id).map((line) => ({
      id: line.id, ingredient: line.ingredient,
      quantity: line.quantity === null ? null : Number(line.quantity),
      unit: line.unit as never, itemId: line.itemId, note: line.note,
    })),
  }));
}
