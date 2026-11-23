import { moveItemToTrash } from "../../_lib/drive";
import { errorResponse, jsonResponse, requireSession } from "../../_lib/http";
import type { PagesContext } from "../../_lib/types";

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const session = await requireSession(context);
  if (typeof session !== "string") return session;

  let body: { fileIds?: string[]; folderIds?: string[] };
  try {
    body = (await context.request.json()) as { fileIds?: string[]; folderIds?: string[] };
  } catch {
    return errorResponse("BAD_REQUEST", "Invalid JSON body.", 400);
  }

  const fileIds = body.fileIds ?? [];
  const folderIds = body.folderIds ?? [];
  const allIds = [...fileIds, ...folderIds];

  if (allIds.length === 0) {
    return errorResponse("BAD_REQUEST", "No items specified to move to trash.", 400);
  }

  let count = 0;
  for (const id of allIds) {
    const success = await moveItemToTrash(context.env, id);
    if (success) count++;
  }

  return jsonResponse({ ok: true, count, total: allIds.length });
}
