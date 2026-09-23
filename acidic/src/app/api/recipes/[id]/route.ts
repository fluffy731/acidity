import { updateRecipe } from "@/lib/recipes/service";
import { handleError, json, readJson, requireManager, requireOrigin } from "@/lib/http";
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireManager();
    requireOrigin(request);
    return json({ recipe: await updateRecipe(user.id, (await params).id, await readJson(request)) });
  } catch (error) { return handleError(error); }
}
