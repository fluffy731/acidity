import { recordStockCount } from "@/lib/stock/service";
import { handleError, json, readJson, requireManager, requireOrigin } from "@/lib/http";
import { loadWorkspace } from "@/lib/data/source";
export async function GET() {
  try { await requireManager(); const { latestCount, previousCount } = await loadWorkspace(); return json({ latestCount, previousCount }); }
  catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  try { const user = await requireManager(); requireOrigin(request); return json({ count: await recordStockCount(user.id, await readJson(request)) }, 201); }
  catch (error) { return handleError(error); }
}
