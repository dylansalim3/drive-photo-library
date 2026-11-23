import {
  driveFetch,
  getFolderTree,
  getNotSyncTree,
  getRootFolderId,
  getRootFolderName,
} from "../_lib/drive";
import { errorResponse, jsonResponse, requireSession } from "../_lib/http";
import type { PagesContext } from "../_lib/types";

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const session = await requireSession(context);
  if (typeof session !== "string") return session;

  const url = new URL(context.request.url);
  const filter = url.searchParams.get("filter");
  const folderIdParam = url.searchParams.get("folderId")?.trim();

  // If filter is "not-sync", get recursive tree of all pending files
  if (filter === "not-sync") {
    try {
      const items = await getNotSyncTree(context.env);
      return jsonResponse({
        ok: true,
        filter: "not-sync",
        count: items.length,
        folderName: "Pending Vacation Sync",
        items,
      });
    } catch (err) {
      return errorResponse(
        "TREE_ERROR",
        err instanceof Error ? err.message : "Failed to load pending files tree.",
        500,
      );
    }
  }

  // If specific folder requested or root folder
  const rootId = await getRootFolderId(context.env);
  const targetFolderId = folderIdParam || rootId;

  if (!targetFolderId) {
    return errorResponse("NOT_FOUND", "Folder ID not found.", 404);
  }

  try {
    let folderName = "Photos & Videos";
    if (targetFolderId === rootId) {
      folderName = (await getRootFolderName(context.env)) || "Library Root";
    } else {
      const res = await driveFetch(
        context.env,
        `/drive/v3/files/${encodeURIComponent(targetFolderId)}?fields=name`,
      );
      if (res && res.ok) {
        const body = (await res.json()) as { name?: string };
        if (body.name) folderName = body.name;
      }
    }

    const items = await getFolderTree(context.env, targetFolderId);
    return jsonResponse({
      ok: true,
      folderId: targetFolderId,
      folderName,
      count: items.length,
      items,
    });
  } catch (err) {
    return errorResponse(
      "TREE_ERROR",
      err instanceof Error ? err.message : "Failed to build folder tree.",
      500,
    );
  }
}
