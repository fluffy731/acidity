"use client";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/client-api";
import { specLine, type Recipe } from "@/lib/recipes/engine";
import { METHOD_LABEL, RECIPE_METHODS, RECIPE_UNITS, measure, type RecipeMethod, type RecipeUnit } from "@/lib/recipes/vocab";
import { Message, errorMessage } from "./ui";

type Bottle = { id: string; name: string };
type DraftLine = { ingredient: string; quantity: string; unit: string; itemId: string };

const blank: DraftLine = { ingredient: "", quantity: "", unit: "ml", itemId: "" };
const toDraft = (recipe: Recipe): DraftLine[] => recipe.lines.map((line) => ({
  ingredient: line.ingredient, quantity: line.quantity === null ? "" : String(line.quantity),
  unit: line.unit ?? "", itemId: line.itemId ?? "",
}));

/** The recipe book on a phone: search, tap a drink, read the spec. A manager can edit the
 *  measures and say which bottle each ingredient pours from - that link is what lets the
 *  stocktake know a drink is about to become unmakeable. */
export function RecipeBook({ recipes, bottles, canEdit }: { recipes: Recipe[]; bottles: Bottle[]; canEdit: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "house" | "classic" | "unspecified" | "unlinked">("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftLine[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return recipes.filter((recipe) => {
      if (filter === "house" || filter === "classic") { if (recipe.kind !== filter) return false; }
      if (filter === "unspecified" && recipe.lines.length) return false;
      if (filter === "unlinked" && !recipe.lines.some((line) => !line.itemId)) return false;
      if (!needle) return true;
      return recipe.name.toLowerCase().includes(needle) || recipe.lines.some((line) => line.ingredient.toLowerCase().includes(needle));
    });
  }, [recipes, query, filter]);

  const needSpec = recipes.filter((recipe) => !recipe.lines.length).length;

  function startEdit(recipe: Recipe) {
    setEditingId(recipe.id); setOpenId(recipe.id);
    setDraft(recipe.lines.length ? toDraft(recipe) : [{ ...blank }]);
    setError(""); setSuccess("");
  }
  const setLine = (index: number, patch: Partial<DraftLine>) =>
    setDraft((lines) => lines.map((line, position) => position === index ? { ...line, ...patch } : line));

  async function save(event: FormEvent<HTMLFormElement>, recipe: Recipe) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    const data = new FormData(event.currentTarget);
    try {
      const lines = draft
        .filter((line) => line.ingredient.trim())
        .map((line) => ({
          ingredient: line.ingredient.trim(),
          quantity: line.quantity.trim() === "" ? null : Number(line.quantity),
          unit: line.unit === "" ? null : line.unit as RecipeUnit,
          itemId: line.itemId === "" ? null : line.itemId,
          note: null,
        }));
      await apiRequest(`/api/recipes/${recipe.id}`, "PUT", {
        name: String(data.get("name") ?? "").trim(),
        kind: recipe.kind,
        family: recipe.family,
        glass: String(data.get("glass") ?? "").trim() || null,
        method: String(data.get("method") ?? "none"),
        methodNote: String(data.get("methodNote") ?? "").trim() || null,
        garnish: String(data.get("garnish") ?? "").trim() || null,
        menuPrice: recipe.menuPrice,
        notes: recipe.notes,
        active: true,
        lines,
      });
      setSuccess(`Saved ${recipe.name}.`); setEditingId(null); router.refresh();
    } catch (caught) { setError(errorMessage(caught)); } finally { setBusy(false); }
  }

  return <section className="panel recipe-book">
    <h2>Cocktails</h2>
    {needSpec ? <p className="hint warn-note">{needSpec} drink{needSpec === 1 ? " has" : "s have"} no spec written up yet.</p> : null}

    <div className="stock-filters">
      <input type="search" inputMode="search" placeholder="Search a drink or an ingredient…" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search recipes" />
    </div>
    <div className="chips" role="group" aria-label="Filter recipes">
      {([["all", "All"], ["house", "House"], ["classic", "Classics"], ["unspecified", "Needs a spec"], ["unlinked", "Needs linking"]] as const).map(([value, text]) =>
        <button key={value} type="button" className={`chip${filter === value ? " on" : ""}`} onClick={() => setFilter(value)}>{text}</button>)}
    </div>

    <Message error={error} success={success} />

    <ul className="recipe-list">
      {shown.map((recipe) => {
        const open = openId === recipe.id;
        const editing = canEdit && editingId === recipe.id;
        return <li key={recipe.id} className={`recipe-card${recipe.lines.length ? "" : " needs-cost"}`}>
          <button type="button" className="recipe-head" onClick={() => { setOpenId(open ? null : recipe.id); setEditingId(null); }} aria-expanded={open}>
            <span className="recipe-name">{recipe.name}</span>
            <span className="recipe-kind">{recipe.kind === "classic" ? "Classic" : "House"}</span>
          </button>
          {!open ? <p className="recipe-spec">{recipe.lines.length ? specLine(recipe) : "Spec to come"}</p> : null}

          {open && !editing ? <div className="recipe-detail">
            {recipe.lines.length ? <table><tbody>{recipe.lines.map((line) => <tr key={line.id}>
              <td>{line.ingredient}{line.note ? <span className="hint"> — {line.note}</span> : null}</td>
              <td className="num">{measure(line.quantity, line.unit)}</td>
              <td className="recipe-bottle">{line.itemId ? (bottles.find((bottle) => bottle.id === line.itemId)?.name ?? "linked") : <span className="unlinked">no bottle</span>}</td>
            </tr>)}</tbody></table> : <p className="hint">Nobody has written this one up yet.</p>}
            <dl className="recipe-meta">
              {recipe.method !== "none" ? <><dt>Method</dt><dd>{METHOD_LABEL[recipe.method as RecipeMethod]}{recipe.methodNote ? ` — ${recipe.methodNote}` : ""}</dd></> : null}
              {recipe.glass ? <><dt>Glass</dt><dd>{recipe.glass}</dd></> : null}
              {recipe.garnish ? <><dt>Garnish</dt><dd>{recipe.garnish}</dd></> : null}
              {recipe.notes ? <><dt>Note</dt><dd>{recipe.notes}</dd></> : null}
            </dl>
            {canEdit ? <div className="actions"><button type="button" className="secondary" onClick={() => startEdit(recipe)}>Edit spec</button></div> : null}
          </div> : null}

          {editing ? <form className="stock-form" onSubmit={(event) => save(event, recipe)}>
            <label>Name<input name="name" defaultValue={recipe.name} required maxLength={120} /></label>
            <div className="stock-form-grid">
              <label>Method<select name="method" defaultValue={recipe.method}>{RECIPE_METHODS.map((value) => <option key={value} value={value}>{METHOD_LABEL[value]}</option>)}</select></label>
              <label>Glass<input name="glass" defaultValue={recipe.glass ?? ""} maxLength={60} /></label>
            </div>
            <label>Timing / build note<input name="methodNote" defaultValue={recipe.methodNote ?? ""} maxLength={400} placeholder="Dry shake 15 secs, wet shake 30 secs" /></label>
            <label>Garnish<input name="garnish" defaultValue={recipe.garnish ?? ""} maxLength={200} /></label>

            <h3>Measures</h3>
            <ul className="draft-lines">
              {draft.map((line, index) => <li key={index} className="draft-line">
                <input aria-label={`Ingredient ${index + 1}`} placeholder="Ingredient" value={line.ingredient} onChange={(event) => setLine(index, { ingredient: event.target.value })} maxLength={120} />
                <input aria-label={`Amount ${index + 1}`} placeholder="45" inputMode="decimal" type="number" min={0} step="0.5" value={line.quantity} onChange={(event) => setLine(index, { quantity: event.target.value })} />
                <select aria-label={`Unit ${index + 1}`} value={line.unit} onChange={(event) => setLine(index, { unit: event.target.value })}>
                  <option value="">—</option>
                  {RECIPE_UNITS.map((value) => <option key={value} value={value}>{value.replace("_", " ")}</option>)}
                </select>
                <select aria-label={`Bottle ${index + 1}`} value={line.itemId} onChange={(event) => setLine(index, { itemId: event.target.value })}>
                  <option value="">Not linked</option>
                  {bottles.map((bottle) => <option key={bottle.id} value={bottle.id}>{bottle.name}</option>)}
                </select>
                <button type="button" className="secondary remove" onClick={() => setDraft((lines) => lines.filter((_, position) => position !== index))} aria-label={`Remove ingredient ${index + 1}`}>×</button>
              </li>)}
            </ul>
            <div className="actions">
              <button type="button" className="secondary" onClick={() => setDraft((lines) => [...lines, { ...blank }])}>Add ingredient</button>
              <button disabled={busy}>{busy ? "Saving…" : "Save spec"}</button>
              <button type="button" className="secondary" onClick={() => setEditingId(null)}>Cancel</button>
            </div>
          </form> : null}
        </li>;
      })}
    </ul>
    {!shown.length ? <p className="hint">Nothing matches that.</p> : null}
  </section>;
}
