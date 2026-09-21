import { createStaffMember } from "@/lib/staffing/service";
import { handleError, json, readJson, requireManager, requireOrigin, requireRole } from "@/lib/http";
import { loadWorkspace } from "@/lib/data/source";
export async function GET() {
  try { await requireRole("staff"); return json({ staff: (await loadWorkspace()).staff }); }
  catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  try { const user = await requireManager(); requireOrigin(request); return json({ member: await createStaffMember(user.id, await readJson(request)) }, 201); }
  catch (error) { return handleError(error); }
}
