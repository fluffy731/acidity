import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { barSeedIssues, linkReport, recipeSeedSchema, stockSeedSchema } from "@/lib/data/bar-seed";
import { unlinkedIngredients, specLine, isSpecified, type Recipe } from "@/lib/recipes/engine";
import { measure } from "@/lib/recipes/vocab";

const read = (name: string) => JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url), "utf8"));

describe("the bar reference data", () => {
  const stock = stockSeedSchema.parse(read("stock.json"));
  const recipes = recipeSeedSchema.parse(read("recipes.json"));

  it("holds stock lines the Stock screen would accept", () => {
    expect(stock.items.length).toBeGreaterThan(50);
  });

  it("has unique names and no measure entered twice in one spec", () => {
    expect(barSeedIssues(stock, recipes)).toEqual([]);
  });

  it("leaves every cost and par at zero for the owner to set", () => {
    // A guessed cost silently corrupts stock value, the reorder list and the P&L.
    for (const item of stock.items) expect(item.unitCost, item.name).toBe(0);
  });

  it("links most measures to a bottle by name, leaving only the house-pour choices", () => {
    const { linked, unlinked } = linkReport(stock, recipes);
    expect(linked).toBeGreaterThan(100);
    // What is left should be generic pours, not typos: each is used by more than one drink
    // or is a house preparation.
    expect(unlinked.map((entry) => entry.ingredient)).toContain("Gin");
  });

  it("carries both the house list and the classics", () => {
    const kinds = new Set(recipes.recipes.map((recipe) => recipe.kind));
    expect(kinds).toEqual(new Set(["house", "classic"]));
    expect(recipes.recipes.filter((recipe) => recipe.kind === "classic").length).toBeGreaterThan(15);
  });

  it("keeps a drink with no spec yet, rather than inventing one", () => {
    const blank = recipes.recipes.filter((recipe) => !recipe.lines.length);
    expect(blank.length).toBeGreaterThan(0);
    for (const recipe of blank) expect(recipe.method).toBe("none");
  });

  it("rejects a measure with a unit nobody uses", () => {
    expect(() => recipeSeedSchema.parse({ recipes: [{ name: "X", lines: [{ ingredient: "Gin", quantity: 30, unit: "shot" }] }] })).toThrow();
  });

  it("rejects a stock line in a category that is not in the vocabulary", () => {
    expect(() => stockSeedSchema.parse({ items: [{ name: "X", category: "grog", unit: "bottle", unitCost: 0 }] })).toThrow();
  });
});

describe("reading a spec", () => {
  const drink: Recipe = {
    id: "r1", name: "Negroni", kind: "classic", family: null, glass: "Rocks", method: "stir",
    methodNote: null, garnish: "Orange peel", menuPrice: null, notes: null, active: true,
    lines: [
      { id: "l1", ingredient: "Gin", quantity: 30, unit: "ml", itemId: null, note: null },
      { id: "l2", ingredient: "Campari", quantity: 30, unit: "ml", itemId: "i1", note: null },
      { id: "l3", ingredient: "Soda Water", quantity: null, unit: "top_up", itemId: null, note: null },
    ],
  };
  it("writes measures the way the bar says them", () => {
    expect(measure(45, "ml")).toBe("45ml");
    expect(measure(2, "dash")).toBe("2 dashes");
    expect(measure(1, "dash")).toBe("1 dash");
    expect(measure(1, "bar_spoon")).toBe("1 bar spoon");
    expect(measure(null, "top_up")).toBe("top up");
    expect(measure(null, "rinse")).toBe("rinse");
    expect(measure(3, "each")).toBe("3");
  });
  it("reads as one line on a phone", () => {
    expect(specLine(drink)).toBe("Gin 30ml · Campari 30ml · Soda Water top up");
    expect(isSpecified(drink)).toBe(true);
    expect(isSpecified({ lines: [] })).toBe(false);
  });
  it("names what still needs a bottle chosen, busiest first", () => {
    const report = unlinkedIngredients([drink, { ...drink, id: "r2", name: "Gimlet", lines: [drink.lines[0]] }]);
    expect(report[0]).toEqual({ ingredient: "Gin", recipes: ["Gimlet", "Negroni"] });
    expect(report.map((entry) => entry.ingredient)).not.toContain("Campari");
  });
  it("ignores a retired recipe when listing what needs linking", () => {
    expect(unlinkedIngredients([{ ...drink, active: false }])).toEqual([]);
  });
});
