import { z } from "zod";
import { profitAndLoss, basSummary } from "@/lib/accounting/ledger";
import { loadWorkspace } from "@/lib/data/source";
import { melbourneDate } from "@/lib/dates";
import { handleError, json, requireManager } from "@/lib/http";
const query = z.object({ start: z.iso.date(), end: z.iso.date() }).refine((value) => value.start <= value.end, { message: "start must not be after end" });
export async function GET(request: Request) {
  try {
    await requireManager();
    const params = new URL(request.url).searchParams;
    const today = melbourneDate();
    const range = query.parse({ start: params.get("start") ?? `${today.slice(0, 7)}-01`, end: params.get("end") ?? today });
    const { ledger } = await loadWorkspace();
    return json({ profitAndLoss: profitAndLoss(ledger, range.start, range.end), bas: basSummary(ledger, range.end) });
  } catch (error) { return handleError(error); }
}
