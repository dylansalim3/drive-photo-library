import { findExistingDriveFile } from "../../_lib/drive";
import { errorResponse, jsonResponse, requireSession } from "../../_lib/http";
import type { PagesContext } from "../../_lib/types";

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const session = await requireSession(context);
  if (typeof session !== "string") return session;

  const url = new URL(context.request.url);
  const md5 = url.searchParams.get("md5")?.trim().toLowerCase() || undefined;
  const fileName = url.searchParams.get("fileName")?.trim() || undefined;
  const sizeStr = url.searchParams.get("size");
  const folderId = url.searchParams.get("folderId")?.trim() || undefined;
  const size = sizeStr ? parseInt(sizeStr, 10) : undefined;

  if (!md5 && (!fileName || !size)) {
    return errorResponse("BAD_REQUEST", "Provide either 'md5' or both 'fileName' and 'size'.", 400);
  }

  try {
    const existing = await findExistingDriveFile(context.env, { md5, fileName, size, folderId });
    if (existing) {
      return jsonResponse({
        ok: true,
        exists: true,
        fileId: existing.id,
        fileName: existing.name,
        matchType: existing.matchType,
      });
    }

    return jsonResponse({
      ok: true,
      exists: false,
    });
  } catch (err) {
    return errorResponse(
      "SERVER_ERROR",
      err instanceof Error ? err.message : "Failed to check file existence.",
      500
    );
  }
}
