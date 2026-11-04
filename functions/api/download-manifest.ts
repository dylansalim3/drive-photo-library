import { getAccessToken, listNotSyncFiles, toDriveFile } from "../_lib/drive";
import { errorResponse, jsonResponse, requireSession } from "../_lib/http";
import type { PagesContext } from "../_lib/types";

/**
 * Download-all, without zipping to the phone: a JSON manifest of not-sync
 * files with per-file proxied download links. Bulk media download is done
 * from a computer at home, where the user is also signed in to this app.
 */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const session = await requireSession(context);
  if (typeof session !== "string") return session;
  const token = await getAccessToken(context.env);
  if (!token) {
    return errorResponse("DRIVE_NOT_CONNECTED", "Google Drive is not connected.", 503);
  }
  const files = await listNotSyncFiles(context.env);
  if (!files) return errorResponse("DRIVE_ERROR", "Could not list not-sync files.", 502);
  const mapped = files.map((file) => toDriveFile(file));
  return jsonResponse({
    filter: "not-sync",
    count: mapped.length,
    generatedAt: new Date().toISOString(),
    note: "Bulk download is done from a computer at home, not from the phone. Open each downloadUrl while signed in to this app.",
    files: mapped.map((file) => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      downloadUrl: `/api/media/file?id=${encodeURIComponent(file.id)}&download=1`,
    })),
  });
}
