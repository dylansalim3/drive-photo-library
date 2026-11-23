import { findOrCreateFolder, INBOX_FOLDER, resolveNestedFolderPath } from "../_lib/drive";
import { errorResponse, jsonResponse, requireSession } from "../_lib/http";
import type { PagesContext } from "../_lib/types";

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const session = await requireSession(context);
  if (typeof session !== "string") return session;

  let body: { name?: string; path?: string; parentId?: string };
  try {
    body = (await context.request.json()) as { name?: string; path?: string; parentId?: string };
  } catch {
    return errorResponse("BAD_REQUEST", "Expected JSON body with name or path.", 400);
  }

  const { name, path, parentId } = body;

  if (path && path.trim()) {
    const resolved = await resolveNestedFolderPath(context.env, path.trim(), parentId?.trim());
    if (!resolved) {
      return errorResponse("FOLDER_CREATION_FAILED", "Could not resolve or create nested folder path.", 502);
    }
    return jsonResponse({ ok: true, folder: resolved });
  }

  if (name && name.trim()) {
    const trimmed = name.trim();
    const targetParent = parentId?.trim() ?? (await findOrCreateFolder(context.env, INBOX_FOLDER, undefined, null));
    if (!targetParent) {
      return errorResponse("DRIVE_ERROR", "Could not find or create parent folder.", 502);
    }
    const folderId = await findOrCreateFolder(context.env, trimmed, targetParent, "not-sync");
    if (!folderId) {
      return errorResponse("FOLDER_CREATION_FAILED", "Could not create folder in Drive.", 502);
    }
    return jsonResponse({
      ok: true,
      folder: {
        id: folderId,
        name: trimmed,
        parentId: targetParent,
        path: trimmed,
      },
    });
  }

  return errorResponse("BAD_REQUEST", "Provide either name or path.", 400);
}
