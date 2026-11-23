import { ARCHIVE_FOLDER, findOrCreateFolder, syncFolderRecursive } from "../../../_lib/drive";
import { errorResponse, jsonResponse, requireSession } from "../../../_lib/http";
import type { PagesContext } from "../../../_lib/types";

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const session = await requireSession(context);
  if (typeof session !== "string") return session;
  const rawId = context.params["id"];
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return errorResponse("BAD_REQUEST", "Missing folder id.", 400);

  const archiveId = await findOrCreateFolder(context.env, ARCHIVE_FOLDER, undefined, null);
  if (!archiveId) {
    return errorResponse("DRIVE_ERROR", "Could not find or create the Travel Archive folder.", 502);
  }

  const movedCount = await syncFolderRecursive(context.env, id, archiveId);
  return jsonResponse({ ok: true, syncStatus: "synced", movedCount });
}
