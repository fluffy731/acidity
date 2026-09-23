import { updateStockItem } from "@/lib/stock/service";
import { handleError, json, readJson, requireManager, requireOrigin } from "@/lib/http";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireManager();
    requireOrigin(request);
    return json({ item: await updateStockItem(user.id, (await params).id, await readJson(request)) });
  } catch (error) { return handleError(error); }
}
