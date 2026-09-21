import { z } from "zod";
import { currentUser } from "@/auth";
import { appMode, liveConfigured } from "./mode";
import { HttpError } from "./errors";
import type { Role } from "./auth/policy";
export { HttpError } from "./errors";

export function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
}

const RANK: Record<Role, number> = { staff: 1, manager: 2, owner: 3 };

/** Every live API derives identity from the session, never from the request body. */
export async function requireRole(minimum: Role = "staff") {
  if (appMode() !== "live" || !liveConfigured()) throw new HttpError(503, "Live services are not configured.");
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Acidic could not confirm you are signed in - usually a page left open past its sign-in. Reload, sign in again and repeat this: nothing was changed.");
  if (RANK[user.role as Role] < RANK[minimum]) throw new HttpError(403, `This action needs ${minimum} access.`);
  return user;
}
export const requireOwner = () => requireRole("owner");
export const requireManager = () => requireRole("manager");

export function requireOrigin(request: Request) {
  const expected = new URL(process.env.APP_URL ?? "http://invalid.local").origin;
  if (request.headers.get("origin") !== expected) throw new HttpError(403, "This request must come from Acidic.");
}

export async function readJson(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new HttpError(415, "Send JSON content.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Request body is required.");
  const decoder = new TextDecoder();
  let length = 0, text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 250_000) { await reader.cancel(); throw new HttpError(413, "Request is too large."); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    try { return JSON.parse(text); } catch { throw new HttpError(400, "Request contains invalid JSON."); }
  } finally { reader.releaseLock(); }
}

export function handleError(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  if (error instanceof z.ZodError) {
    const fields = error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message }));
    return json({ error: `Check the submitted fields: ${fields.map((f) => `${f.field || "value"} - ${f.message}`).join("; ")}`, fields }, 400);
  }
  // Never serialise database errors or connection strings into a response; do log them.
  console.error(error);
  return json({ error: "Acidic could not complete this request. Please try again." }, 503);
}
