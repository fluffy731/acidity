import { createShift } from "@/lib/staffing/service";
import { handleError, json, readJson, requireManager, requireOrigin, requireRole } from "@/lib/http";
import { loadWorkspace } from "@/lib/data/source";
export async function GET() {
  try { await requireRole("staff"); return json({ shifts: (await loadWorkspace()).shifts }); }
  catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  try { const user = await requireManager(); requireOrigin(request); return json({ shift: await createShift(user.id, await readJson(request)) }, 201); }
  catch (error) { return handleError(error); }
}
