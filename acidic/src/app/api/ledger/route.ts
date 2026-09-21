import { recordLedgerEntry } from "@/lib/accounting/service";
import { handleError, json, readJson, requireManager, requireOrigin } from "@/lib/http";
import { loadWorkspace } from "@/lib/data/source";
export async function GET() {
  try { await requireManager(); return json({ entries: (await loadWorkspace()).ledger }); }
  catch (error) { return handleError(error); }
}
export async function POST(request: Request) {
  try { const user = await requireManager(); requireOrigin(request); return json({ entry: await recordLedgerEntry(user.id, await readJson(request)) }, 201); }
  catch (error) { return handleError(error); }
}
