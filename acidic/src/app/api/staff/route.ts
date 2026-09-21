import { createStaffMember } from "@/lib/staffing/service";
import { handleError, json, readJson, requireManager, requireOrigin, requireRole } from "@/lib/http";
import { loadWorkspace } from "@/lib/data/source";
/** Staff see who works here and their roles; only managers see anyone's hourly rate. */
export async function GET() {
  try {
    const user = await requireRole("staff");
    const { staff } = await loadWorkspace();
    const manager = ["owner", "manager"].includes(user.role);
    return json({ staff: manager ? staff : staff.map(({ hourlyRate, ...member }) => (void hourlyRate, member)) });
  } catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  try { const user = await requireManager(); requireOrigin(request); return json({ member: await createStaffMember(user.id, await readJson(request)) }, 201); }
  catch (error) { return handleError(error); }
}
