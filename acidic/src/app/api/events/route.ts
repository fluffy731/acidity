import { createEvent } from "@/lib/programme/service";
import { handleError, json, readJson, requireManager, requireOrigin } from "@/lib/http";
import { loadWorkspace } from "@/lib/data/source";
export async function GET() {
  try { await requireManager(); return json({ events: (await loadWorkspace()).events }); }
  catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  try { const user = await requireManager(); requireOrigin(request); return json({ event: await createEvent(user.id, await readJson(request)) }, 201); }
  catch (error) { return handleError(error); }
}
