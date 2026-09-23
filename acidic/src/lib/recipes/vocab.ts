/** House recipes are Acidity's own list; classics are the ones any guest can ask for and the
 *  bar is expected to make. Both are kept here so the stock list can be checked against
 *  everything the bar actually pours, not just what is printed on the menu. */
export const RECIPE_KINDS = ["house", "classic"] as const;
export type RecipeKind = (typeof RECIPE_KINDS)[number];

/** How a drink is built, in the words a spec card uses. */
export const RECIPE_METHODS = ["shake", "dry_then_wet_shake", "stir", "build", "roll", "throw", "blend", "hot", "none"] as const;
export type RecipeMethod = (typeof RECIPE_METHODS)[number];

export const METHOD_LABEL: Record<RecipeMethod, string> = {
  shake: "Shake", dry_then_wet_shake: "Dry then wet shake", stir: "Stir", build: "Build in glass",
  roll: "Roll", throw: "Throw", blend: "Blend", hot: "Build hot", none: "Method TBC",
};

/** Measures as a spec sheet writes them. `top_up` and `rinse` carry no number. */
export const RECIPE_UNITS = ["ml", "dash", "bar_spoon", "each", "slice", "wedge", "leaf", "pinch", "top_up", "rinse"] as const;
export type RecipeUnit = (typeof RECIPE_UNITS)[number];

/** Singular and plural, written out: "dashes" and "leaves" do not fall out of a rule. */
const UNIT_LABEL: Record<RecipeUnit, { one: string; many: string }> = {
  ml: { one: "ml", many: "ml" },
  dash: { one: "dash", many: "dashes" },
  bar_spoon: { one: "bar spoon", many: "bar spoons" },
  each: { one: "", many: "" },
  slice: { one: "slice", many: "slices" },
  wedge: { one: "wedge", many: "wedges" },
  leaf: { one: "leaf", many: "leaves" },
  pinch: { one: "pinch", many: "pinches" },
  top_up: { one: "top up", many: "top up" },
  rinse: { one: "rinse", many: "rinse" },
};

/** "45ml", "2 dashes", "top up" - one measure, the way it reads behind the bar. */
export function measure(quantity: number | null, unit: RecipeUnit | null): string {
  if (!unit) return quantity === null ? "" : String(quantity);
  if (unit === "top_up" || unit === "rinse") return UNIT_LABEL[unit].one;
  if (quantity === null) return UNIT_LABEL[unit].one;
  if (unit === "ml") return `${quantity}ml`;
  if (unit === "each") return String(quantity);
  return `${quantity} ${quantity === 1 ? UNIT_LABEL[unit].one : UNIT_LABEL[unit].many}`;
}
