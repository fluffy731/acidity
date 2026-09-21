import { recordStockMovement } from "@/lib/stock/service";
import { handleError, json, readJson, requireManager, requireOrigin } from "@/lib/http";
export async function POST(request: Request) {
  try { const user = await requireManager(); requireOrigin(request); return json({ movement: await recordStockMovement(user.id, await readJson(request)) }, 201); }
  catch (error) { return handleError(error); }
}
