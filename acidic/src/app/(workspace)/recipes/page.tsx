import { Kpi, PageHeading } from "@/components/ui";
import { RecipeBook } from "@/components/recipe-book";
import { isLive, loadWorkspace } from "@/lib/data/source";
import { requirePageRole } from "@/lib/page-access";
import { unlinkedIngredients } from "@/lib/recipes/engine";
export const dynamic = "force-dynamic";
export const metadata = { title: "Cocktails" };

export default async function Recipes() {
  // Anyone on shift can read a spec; only a manager changes one.
  const { manager } = await requirePageRole("staff");
  const { recipes, items } = await loadWorkspace();
  const active = recipes.filter((recipe) => recipe.active);
  const unlinked = unlinkedIngredients(active);
  const specced = active.filter((recipe) => recipe.lines.length).length;
  return <>
    <PageHeading title="Cocktails">The house list and the classics, with what each one pours. Linking an ingredient to a stock line is what lets a stocktake tell you a drink is about to run out.</PageHeading>
    <div className="kpis">
      <Kpi label="Drinks" value={String(active.length)} hint={`${active.filter((recipe) => recipe.kind === "house").length} house · ${active.filter((recipe) => recipe.kind === "classic").length} classic`} />
      <Kpi label="Specs written" value={`${specced} of ${active.length}`} hint={specced === active.length ? "All written up" : "The rest are names waiting for a spec"} />
      <Kpi label="Ingredients to link" value={String(unlinked.length)} hint={unlinked.length ? "Pick the bottle each one pours from" : "Every ingredient points at a stock line"} />
    </div>
    {isLive() && unlinked.length ? <section className="panel"><h2>Ingredients with no bottle chosen</h2>
      <table><thead><tr><th>Ingredient</th><th>Used by</th></tr></thead><tbody>
        {unlinked.slice(0, 15).map((entry) => <tr key={entry.ingredient}>
          <td>{entry.ingredient}</td>
          <td className="hint">{entry.recipes.slice(0, 5).join(", ")}{entry.recipes.length > 5 ? ` +${entry.recipes.length - 5}` : ""}</td>
        </tr>)}
      </tbody></table>
      <p className="hint">Usually the house pour: which gin is &quot;Gin&quot;. Open the drink below and choose the bottle on the ingredient.</p>
    </section> : null}
    <RecipeBook recipes={active} bottles={items.map((item) => ({ id: item.id, name: item.name }))} canEdit={manager && isLive()} />
  </>;
}
