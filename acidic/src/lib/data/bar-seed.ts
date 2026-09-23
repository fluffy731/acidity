import { z } from "zod";
import { stockItemInputSchema } from "@/lib/stock/engine";
import { RECIPE_KINDS, RECIPE_METHODS, RECIPE_UNITS } from "@/lib/recipes/vocab";

/** `data/stock.json`: the bar's countable lines. Each row is parsed with the same schema the
 *  Stock screen posts, so the file cannot hold an item the app would reject. */
export const stockSeedSchema = z.object({
  $comment: z.array(z.string()).optional(),
  items: z.array(stockItemInputSchema),
}).strict();

/** A measure as the file writes it. Unlike the API's version there is no `itemId`: the seed
 *  links an ingredient to a stock line by matching names, so the file stays readable by a
 *  bartender and nobody hand-copies UUIDs. */
export const seedRecipeLineSchema = z.object({
  ingredient: z.string().trim().min(1).max(120),
  quantity: z.number().min(0).max(10_000).optional(),
  unit: z.enum(RECIPE_UNITS).optional(),
  note: z.string().trim().max(200).optional(),
}).strict();

export const seedRecipeSchema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.enum(RECIPE_KINDS).default("house"),
  family: z.string().trim().max(60).optional(),
  glass: z.string().trim().max(60).optional(),
  method: z.enum(RECIPE_METHODS).default("none"),
  methodNote: z.string().trim().max(400).optional(),
  garnish: z.string().trim().max(200).optional(),
  menuPrice: z.number().min(0).max(1000).optional(),
  notes: z.string().trim().max(1000).optional(),
  lines: z.array(seedRecipeLineSchema).max(40).default([]),
}).strict();

export const recipeSeedSchema = z.object({
  $comment: z.array(z.string()).optional(),
  recipes: z.array(seedRecipeSchema),
}).strict();

export type StockSeed = z.infer<typeof stockSeedSchema>;
export type RecipeSeed = z.infer<typeof recipeSeedSchema>;

/** Problems about the list as a whole rather than any one row. A stock name appearing twice
 *  matters more here than elsewhere: it is the key the seed updates on, and the key a recipe
 *  ingredient links through. */
export function barSeedIssues(stock: StockSeed, recipes: RecipeSeed): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();
  for (const item of stock.items) {
    const key = item.name.trim().toLowerCase();
    if (seen.has(key)) issues.push(`Stock line "${item.name}" is listed twice - it is the name recipes link through, so it has to be unique.`);
    seen.add(key);
  }
  const named = new Set<string>();
  for (const recipe of recipes.recipes) {
    const key = recipe.name.trim().toLowerCase();
    if (named.has(key)) issues.push(`Recipe "${recipe.name}" is listed twice.`);
    named.add(key);
    const measures = new Set<string>();
    for (const line of recipe.lines) {
      const ingredient = line.ingredient.trim().toLowerCase();
      if (measures.has(ingredient)) issues.push(`${recipe.name}: "${line.ingredient}" appears twice in the same spec.`);
      measures.add(ingredient);
      if (line.quantity === undefined && line.unit !== "top_up" && line.unit !== "rinse" && line.unit !== undefined) {
        issues.push(`${recipe.name}: "${line.ingredient}" has a unit but no amount.`);
      }
    }
  }
  return issues;
}

/** Which ingredients find a bottle by name, and which are still someone's decision. */
export function linkReport(stock: StockSeed, recipes: RecipeSeed): { linked: number; unlinked: { ingredient: string; uses: number }[] } {
  const names = new Set(stock.items.map((item) => item.name.trim().toLowerCase()));
  const unlinked = new Map<string, { ingredient: string; uses: number }>();
  let linked = 0;
  for (const recipe of recipes.recipes) {
    for (const line of recipe.lines) {
      const key = line.ingredient.trim().toLowerCase();
      if (names.has(key)) { linked += 1; continue; }
      const entry = unlinked.get(key) ?? { ingredient: line.ingredient.trim(), uses: 0 };
      entry.uses += 1;
      unlinked.set(key, entry);
    }
  }
  return { linked, unlinked: [...unlinked.values()].sort((a, b) => b.uses - a.uses || a.ingredient.localeCompare(b.ingredient)) };
}
