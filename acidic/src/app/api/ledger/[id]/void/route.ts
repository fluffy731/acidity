import { voidLedgerEntry } from "@/lib/accounting/service";
import { handleError, json, readJson, requireOrigin, requireOwner } from "@/lib/http";
type Context = { params: Promise<{ id: string }> };
/** Voiding money is the owner's call. */
export async function POST(request: Request, context: Context) {
  try { const user = await requireOwner(); requireOrigin(request); return json({ entry: await voidLedgerEntry(user.id, (await context.params).id, await readJson(request)) }); }
  catch (error) { return handleError(error); }
}
