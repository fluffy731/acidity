import { createRecipe } from "@/lib/recipes/service";
import { handleError, json, readJson, requireManager, requireRole, requireOrigin } from "@/lib/http";
import { loadWorkspace } from "@/lib/data/source";
/** Anyone on shift can read a spec - that is the point of having them. Editing is a manager's. */
export async function GET() {
  try { await requireRole("staff"); return json({ recipes: (await loadWorkspace()).recipes }); }
  catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  try { const user = await requireManager(); requireOrigin(request); return json({ recipe: await createRecipe(user.id, await readJson(request)) }, 201); }
  catch (error) { return handleError(error); }
}
