export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function readApiResponse<T>(response: Response, fallback: string): Promise<T> {
  const text = await response.text();
  let result: { error?: string } | null = null;
  try { result = text ? JSON.parse(text) as { error?: string } : null; } catch { /* a proxy may return an HTML error page */ }
  if (!response.ok) {
    if (result?.error) throw new ApiError(result.error, response.status);
    if ([502, 503, 504].includes(response.status)) throw new ApiError("The connection ended before Acidic confirmed the action. Refresh before retrying; the change may already be saved.", response.status);
    throw new ApiError(fallback, response.status);
  }
  if (!result) throw new ApiError("Acidic saved no readable confirmation. Refresh before retrying.", response.status);
  return result as T;
}
export async function apiRequest<T>(url: string, method = "GET", body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { method, cache: "no-store", credentials: "same-origin", ...(body === undefined ? {} : { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }) });
  } catch { throw new ApiError("Connection interrupted. Reload before retrying, to check whether the change was saved.", 0); }
  return readApiResponse<T>(response, "Acidic could not complete this request. Please try again.");
}
