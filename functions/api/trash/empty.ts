import { emptyTrashFolder } from "../../_lib/drive";
import { errorResponse, jsonResponse, requireSession } from "../../_lib/http";
import type { PagesContext } from "../../_lib/types";

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const session = await requireSession(context);
  if (typeof session !== "string") return session;

  let olderThanDays: number | undefined;
  try {
    const text = await context.request.text();
    if (text.trim()) {
      const body = JSON.parse(text) as { olderThanDays?: number };
      olderThanDays = body.olderThanDays;
    }
  } catch {}

  const result = await emptyTrashFolder(context.env, olderThanDays);
  return jsonResponse({ ok: true, deletedCount: result.deletedCount });
}
