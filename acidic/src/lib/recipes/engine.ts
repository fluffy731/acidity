import { z } from "zod";
import { RECIPE_KINDS, RECIPE_METHODS, RECIPE_UNITS, measure, type RecipeUnit } from "./vocab";

/** One line of a spec: what goes in, how much, and - once someone links it - which stock line
 *  it draws down. `ingredient` is always written out, because a bar knows "peach liqueur"
 *  before it knows which bottle it buys, and the spec has to read correctly either way. */
export const recipeLineInputSchema = z.object({
  ingredient: z.string().trim().min(1).max(120),
  quantity: z.number().min(0).max(10_000).nullable().default(null),
  unit: z.enum(RECIPE_UNITS).nullable().default(null),
  itemId: z.uuid().nullable().default(null),
  note: z.string().trim().max(200).nullable().default(null),
}).strict();
export type RecipeLineInput = z.infer<typeof recipeLineInputSchema>;

export const recipeInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  kind: z.enum(RECIPE_KINDS).default("house"),
  family: z.string().trim().max(60).nullable().default(null),
  glass: z.string().trim().max(60).nullable().default(null),
  method: z.enum(RECIPE_METHODS).default("none"),
  methodNote: z.string().trim().max(400).nullable().default(null),
  garnish: z.string().trim().max(200).nullable().default(null),
  menuPrice: z.number().min(0).max(1000).nullable().default(null),
  notes: z.string().trim().max(1000).nullable().default(null),
  active: z.boolean().default(true),
  lines: z.array(recipeLineInputSchema).max(40).default([]),
}).strict();
export type RecipeInput = z.infer<typeof recipeInputSchema>;

export type RecipeLine = { id: string; ingredient: string; quantity: number | null; unit: RecipeUnit | null; itemId: string | null; note: string | null };
export type Recipe = {
  id: string; name: string; kind: string; family: string | null; glass: string | null;
  method: string; methodNote: string | null; garnish: string | null; menuPrice: number | null;
  notes: string | null; active: boolean; lines: RecipeLine[];
};

/** "Gin 35ml · Peach liqueur 10ml · Lemon juice 15ml" - the one-line build for a phone. */
export function specLine(recipe: Pick<Recipe, "lines">): string {
  return recipe.lines.map((line) => [line.ingredient, measure(line.quantity, line.unit)].filter(Boolean).join(" ")).join(" · ");
}

/** A recipe with nothing in it is a name someone wrote down to fill in later - worth showing
 *  as unfinished rather than pretending it is a drink the bar can make. */
export function isSpecified(recipe: Pick<Recipe, "lines">): boolean { return recipe.lines.length > 0; }

/** Every ingredient across the list that no stock line covers yet. This is the bridge between
 *  the recipe book and the stocktake: if a drink needs Suze and nothing on the shelf is Suze,
 *  the bar cannot make it and nobody finds out until a guest orders one. */
export function unlinkedIngredients(recipes: readonly Recipe[]): { ingredient: string; recipes: string[] }[] {
  const byIngredient = new Map<string, { ingredient: string; recipes: Set<string> }>();
  for (const recipe of recipes) {
    if (!recipe.active) continue;
    for (const line of recipe.lines) {
      if (line.itemId) continue;
      const key = line.ingredient.trim().toLowerCase();
      const entry = byIngredient.get(key) ?? { ingredient: line.ingredient.trim(), recipes: new Set<string>() };
      entry.recipes.add(recipe.name);
      byIngredient.set(key, entry);
    }
  }
  return [...byIngredient.values()]
    .map((entry) => ({ ingredient: entry.ingredient, recipes: [...entry.recipes].sort() }))
    .sort((a, b) => b.recipes.length - a.recipes.length || a.ingredient.localeCompare(b.ingredient));
}

/** Which drinks a stock line is used by - shown against an item so nobody retires a bottle
 *  that four cocktails depend on. */
export function recipesUsingItem(recipes: readonly Recipe[], itemId: string): string[] {
  return recipes.filter((recipe) => recipe.active && recipe.lines.some((line) => line.itemId === itemId)).map((recipe) => recipe.name).sort();
}
