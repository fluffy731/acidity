import { readFileSync } from "node:fs";
import postgres from "postgres";
import { z } from "zod";

// Loads data/stock.json and data/recipes.json into the live database. Stock first, then the
// recipe book, so an ingredient can be linked to the bottle it pours from in the same run.
//
//   node scripts/seed-bar.mjs            report what would change, then roll back
//   node scripts/seed-bar.mjs --apply    write it
//   ... --as "Solomon"                   attribute the audit entries to that profile
//
// A stock line is identified by name and a recipe by name, so re-running after an edit updates
// rather than duplicates. Nothing is ever deleted: a line dropped from a file stays in the
// database (retire it on the Stock screen instead). Recipe MEASURES are the exception - they
// are replaced as a set, because that is how a spec is edited.
//
// The app's own rules are the authority and are applied to both files by tests/bar-seed.test.ts
// in CI. This container has no TypeScript, so the schemas below repeat the shape only.

const argument = (flag) => { const index = process.argv.indexOf(flag); return index >= 0 ? process.argv[index + 1] : null; };
const apply = process.argv.includes("--apply");
const actorName = argument("--as");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Run this through the tools container, which has it.");
  process.exit(1);
}

const CATEGORIES = ["coffee", "tea", "beer", "wine", "sake", "spirits", "liqueur", "bitters", "mixers", "juice", "syrup", "produce", "milk_dairy", "food", "packaging", "other"];
const UNITS = ["each", "bottle", "can", "keg", "kg", "gram", "litre", "carton", "pack"];
const METHODS = ["shake", "dry_then_wet_shake", "stir", "build", "roll", "throw", "blend", "hot", "none"];
const MEASURES = ["ml", "dash", "bar_spoon", "each", "slice", "wedge", "leaf", "pinch", "top_up", "rinse"];

const stockSchema = z.object({
  $comment: z.array(z.string()).optional(),
  items: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    category: z.enum(CATEGORIES),
    unit: z.enum(UNITS),
    unitCost: z.number().min(0).max(100_000).default(0),
    parLevel: z.number().min(0).max(100_000).default(0),
    supplier: z.string().trim().max(120).nullable().default(null),
  }).strict()),
}).strict();

const recipeSchema = z.object({
  $comment: z.array(z.string()).optional(),
  recipes: z.array(z.object({
    name: z.string().trim().min(1).max(120),
    kind: z.enum(["house", "classic"]).default("house"),
    family: z.string().trim().max(60).optional(),
    glass: z.string().trim().max(60).optional(),
    method: z.enum(METHODS).default("none"),
    methodNote: z.string().trim().max(400).optional(),
    garnish: z.string().trim().max(200).optional(),
    menuPrice: z.number().min(0).max(1000).optional(),
    notes: z.string().trim().max(1000).optional(),
    lines: z.array(z.object({
      ingredient: z.string().trim().min(1).max(120),
      quantity: z.number().min(0).max(10_000).optional(),
      unit: z.enum(MEASURES).optional(),
      note: z.string().trim().max(200).optional(),
    }).strict()).max(40).default([]),
  }).strict()),
}).strict();

const load = (name, schema) => {
  let raw;
  try {
    raw = JSON.parse(readFileSync(new URL(`../data/${name}`, import.meta.url), "utf8"));
    return schema.parse(raw);
  } catch (error) {
    console.error(`Could not read data/${name}.\n`);
    for (const issue of error?.issues ?? []) {
      const [root, index, ...rest] = issue.path;
      const row = Array.isArray(raw?.[root]) ? raw[root][index] : undefined;
      const label = typeof row?.name === "string" ? `"${row.name}"` : `${root}[${index}]`;
      console.error(`  ${label}${rest.length ? ` ${rest.join(".")}` : ""}: ${issue.message}`);
    }
    if (!error?.issues) console.error(`  ${error.message}`);
    process.exit(1);
  }
};

const stock = load("stock.json", stockSchema);
const book = load("recipes.json", recipeSchema);

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const ROLLBACK = Symbol("dry run");
const tally = { itemsCreated: 0, itemsUpdated: 0, itemsSame: 0, recipesCreated: 0, recipesUpdated: 0, recipesSame: 0, linked: 0, unlinked: new Map() };

try {
  const [actor] = actorName
    ? await sql`select id, name, role from users where lower(name) = lower(${actorName}) limit 1`
    : await sql`select id, name, role from users where role = 'owner' order by created_at limit 1`;
  if (!actor) {
    console.error(actorName ? `No sign-in profile called "${actorName}".` : "No owner profile exists yet. Create one with scripts/create-profile.mjs --role owner.");
    process.exit(1);
  }

  try {
    await sql.begin(async (tx) => {
      // ---- Stock lines ------------------------------------------------------------------
      for (const item of stock.items) {
        const row = { category: item.category, unit: item.unit, unitCost: item.unitCost.toFixed(2), parLevel: item.parLevel.toFixed(2), supplier: item.supplier };
        const [existing] = await tx`select id, name, category, unit, unit_cost as "unitCost", par_level as "parLevel", supplier from stock_items where lower(name) = lower(${item.name}) limit 1`;
        if (!existing) {
          const [created] = await tx`insert into stock_items (name, category, unit, unit_cost, par_level, supplier)
            values (${item.name}, ${row.category}, ${row.unit}, ${row.unitCost}, ${row.parLevel}, ${row.supplier}) returning id`;
          await tx`insert into audit_log (actor_id, entity, entity_id, action, detail_json) values (${actor.id}, 'stock_item', ${created.id}, 'created', ${sql.json({ name: item.name, source: "stock.json" })})`;
          tally.itemsCreated += 1;
          continue;
        }
        // Never overwrite a cost or par the owner has set with the file's placeholder zero.
        const keepCost = item.unitCost === 0 ? existing.unitCost : row.unitCost;
        const keepPar = item.parLevel === 0 ? existing.parLevel : row.parLevel;
        const changed = [];
        if (existing.name !== item.name) changed.push("name");
        if (existing.category !== row.category) changed.push("category");
        if (existing.unit !== row.unit) changed.push("unit");
        if (existing.unitCost !== keepCost) changed.push("unitCost");
        if (existing.parLevel !== keepPar) changed.push("parLevel");
        if ((existing.supplier ?? null) !== row.supplier) changed.push("supplier");
        if (!changed.length) { tally.itemsSame += 1; continue; }
        await tx`update stock_items set name = ${item.name}, category = ${row.category}, unit = ${row.unit},
          unit_cost = ${keepCost}, par_level = ${keepPar}, supplier = ${row.supplier}, updated_at = now() where id = ${existing.id}`;
        await tx`insert into audit_log (actor_id, entity, entity_id, action, detail_json) values (${actor.id}, 'stock_item', ${existing.id}, 'edited', ${sql.json({ name: item.name, source: "stock.json", fields: changed })})`;
        tally.itemsUpdated += 1;
      }

      // ---- Recipes ----------------------------------------------------------------------
      const bottles = new Map((await tx`select id, name from stock_items`).map((row) => [row.name.trim().toLowerCase(), row.id]));
      // The link tally describes the whole recipe book, not just the rows this run rewrote.
      for (const recipe of book.recipes) {
        for (const line of recipe.lines) {
          if (bottles.has(line.ingredient.trim().toLowerCase())) tally.linked += 1;
          else tally.unlinked.set(line.ingredient, (tally.unlinked.get(line.ingredient) ?? 0) + 1);
        }
      }
      for (const recipe of book.recipes) {
        const values = {
          kind: recipe.kind, family: recipe.family ?? null, glass: recipe.glass ?? null,
          method: recipe.method, methodNote: recipe.methodNote ?? null, garnish: recipe.garnish ?? null,
          menuPrice: recipe.menuPrice === undefined ? null : recipe.menuPrice.toFixed(2),
          notes: recipe.notes ?? null,
        };
        const [existing] = await tx`select id, name, kind, family, glass, method, method_note as "methodNote",
          garnish, menu_price as "menuPrice", notes from recipes where lower(name) = lower(${recipe.name}) limit 1`;
        // Only report a change when there is one: the measures are rewritten every run, so
        // without this every recipe would read as edited forever.
        const wanted = [recipe.name, values.kind, values.family, values.glass, values.method, values.methodNote, values.garnish, values.menuPrice, values.notes];
        const current = existing ? [existing.name, existing.kind, existing.family, existing.glass, existing.method, existing.methodNote, existing.garnish, existing.menuPrice, existing.notes] : null;
        const spec = (lines) => lines.map((line) => `${line.ingredient}|${line.quantity ?? ""}|${line.unit ?? ""}|${line.note ?? ""}`).join("~");
        const wantedSpec = spec(recipe.lines.map((line) => ({ ...line, quantity: line.quantity === undefined ? null : line.quantity.toFixed(2), unit: line.unit ?? null, note: line.note ?? null })));
        const currentSpec = existing ? spec(await tx`select ingredient, quantity, unit, note from recipe_lines where recipe_id = ${existing.id} order by position`) : "";
        const unchanged = existing && currentSpec === wantedSpec && current.every((value, index) => (value ?? null) === (wanted[index] ?? null));
        if (unchanged) { tally.recipesSame += 1; continue; }
        let recipeId;
        if (existing) {
          await tx`update recipes set name = ${recipe.name}, kind = ${values.kind}, family = ${values.family},
            glass = ${values.glass}, method = ${values.method}, method_note = ${values.methodNote},
            garnish = ${values.garnish}, menu_price = ${values.menuPrice}, notes = ${values.notes},
            updated_at = now() where id = ${existing.id}`;
          recipeId = existing.id;
          tally.recipesUpdated += 1;
        } else {
          const [created] = await tx`insert into recipes (name, kind, family, glass, method, method_note, garnish, menu_price, notes, created_by)
            values (${recipe.name}, ${values.kind}, ${values.family}, ${values.glass}, ${values.method},
                    ${values.methodNote}, ${values.garnish}, ${values.menuPrice}, ${values.notes}, ${actor.id}) returning id`;
          recipeId = created.id;
          tally.recipesCreated += 1;
        }
        await tx`delete from recipe_lines where recipe_id = ${recipeId}`;
        for (const [position, line] of recipe.lines.entries()) {
          const itemId = bottles.get(line.ingredient.trim().toLowerCase()) ?? null;
          await tx`insert into recipe_lines (recipe_id, position, ingredient, quantity, unit, item_id, note)
            values (${recipeId}, ${position}, ${line.ingredient},
                    ${line.quantity === undefined ? null : line.quantity.toFixed(2)},
                    ${line.unit ?? null}, ${itemId}, ${line.note ?? null})`;
        }
        await tx`insert into audit_log (actor_id, entity, entity_id, action, detail_json) values (${actor.id}, 'recipe', ${recipeId},
          ${existing ? "edited" : "created"}, ${sql.json({ name: recipe.name, lines: recipe.lines.length, source: "recipes.json" })})`;
      }
      if (!apply) throw ROLLBACK;
    });
  } catch (error) {
    if (error !== ROLLBACK) throw error;
  }

  console.log(`Bar reference data, attributed to ${actor.name} (${actor.role}).\n`);
  console.log(`  Stock    ${tally.itemsCreated} to create, ${tally.itemsUpdated} to update, ${tally.itemsSame} already correct`);
  console.log(`  Recipes  ${tally.recipesCreated} to create, ${tally.recipesUpdated} to update, ${tally.recipesSame} already correct`);
  console.log(`  Measures ${tally.linked} linked to a bottle, ${[...tally.unlinked.values()].reduce((a, b) => a + b, 0)} still to link`);
  if (tally.unlinked.size) {
    console.log("\n  Pick the house pour for these on the Recipes screen:");
    for (const [ingredient, uses] of [...tally.unlinked].sort((a, b) => b[1] - a[1])) console.log(`    ${ingredient.padEnd(20)} ${uses} drink${uses === 1 ? "" : "s"}`);
  }
  console.log(apply
    ? "\nWritten. Open Stock to set costs and par levels - nothing is costed until you do."
    : "\nNothing was written. Re-run with --apply to keep it.");
} catch (error) {
  console.error(`\nThe bar data was not loaded: ${error.message}`);
  console.error("Nothing was written - the whole load runs in one transaction. Check that the migrations are applied.");
  process.exitCode = 1;
} finally {
  await sql.end();
}
