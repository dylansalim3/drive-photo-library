import { getStorageQuotaAndBreakdown } from "../_lib/drive";
import { errorResponse, jsonResponse, requireSession } from "../_lib/http";
import type { PagesContext } from "../_lib/types";

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const session = await requireSession(context);
  if (typeof session !== "string") return session;

  try {
    const breakdown = await getStorageQuotaAndBreakdown(context.env);
    return jsonResponse({
      ok: true,
      ...breakdown,
    });
  } catch (err) {
    return errorResponse(
      "STORAGE_ERROR",
      err instanceof Error ? err.message : "Failed to fetch storage usage.",
      502,
    );
  }
}
