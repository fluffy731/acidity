import { updateEvent } from "@/lib/programme/service";
import { handleError, json, readJson, requireManager, requireOrigin } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  try { const user = await requireManager(); requireOrigin(request); return json({ event: await updateEvent(user.id, (await context.params).id, await readJson(request)) }); }
  catch (error) { return handleError(error); }
}
