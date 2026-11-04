import { ARCHIVE_FOLDER, driveFetch, findOrCreateFolder } from "../../../_lib/drive";
import { errorResponse, jsonResponse, requireSession } from "../../../_lib/http";
import type { PagesContext } from "../../../_lib/types";

/**
 * Clears the not-sync tag and moves the file to Travel Archive. Drive removes
 * a custom property when it is patched with null; if a Drive account rejects
 * that, the fallback stores syncStatus=synced, which the not-sync filter
 * still excludes.
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const session = await requireSession(context);
  if (typeof session !== "string") return session;
  const rawId = context.params["id"];
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!id) return errorResponse("BAD_REQUEST", "Missing file id.", 400);

  const archiveId = await findOrCreateFolder(context.env, ARCHIVE_FOLDER);
  if (!archiveId) {
    return errorResponse("DRIVE_ERROR", "Could not find or create the Travel Archive folder.", 502);
  }

  const meta = await driveFetch(
    context.env,
    `/drive/v3/files/${encodeURIComponent(id)}?fields=${encodeURIComponent("id,parents")}`,
  );
  if (!meta) return errorResponse("DRIVE_NOT_CONNECTED", "Google Drive is not connected.", 503);
  if (!meta.ok) return errorResponse("DRIVE_ERROR", "Could not read the file to mark it synced.", 502);
  const metaBody = (await meta.json()) as { parents?: string[] };
  const removeParents = (metaBody.parents ?? []).filter((parent) => parent !== archiveId).join(",");

  const patch = async (properties: Record<string, string | null>): Promise<Response | null> => {
    const query = new URLSearchParams({ addParents: archiveId });
    if (removeParents) query.set("removeParents", removeParents);
    return driveFetch(
      context.env,
      `/drive/v3/files/${encodeURIComponent(id)}?${query.toString()}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ properties }),
      },
    );
  };

  let updated = await patch({ syncStatus: null });
  if (!updated || !updated.ok) {
    updated = await patch({ syncStatus: "synced" });
  }
  if (!updated || !updated.ok) {
    return errorResponse("DRIVE_ERROR", "Drive could not mark this file as synced.", 502);
  }
  return jsonResponse({ ok: true, syncStatus: "synced" });
}
