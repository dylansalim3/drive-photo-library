import { driveFetch, getAccessToken } from "../../_lib/drive";
import { errorResponse, requireSession } from "../../_lib/http";
import type { PagesContext } from "../../_lib/types";

/**
 * Thumbnails only. The phone never fetches a full file through this endpoint,
 * and responses are no-store so nothing is cached offline as media.
 */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const session = await requireSession(context);
  if (typeof session !== "string") return session;
  const id = new URL(context.request.url).searchParams.get("id");
  if (!id) return errorResponse("BAD_REQUEST", "Missing file id.", 400);

  const meta = await driveFetch(
    context.env,
    `/drive/v3/files/${encodeURIComponent(id)}?fields=${encodeURIComponent("id,thumbnailLink,mimeType")}`,
  );
  if (!meta) return errorResponse("DRIVE_NOT_CONNECTED", "Google Drive is not connected.", 503);
  if (!meta.ok) return errorResponse("DRIVE_ERROR", "Could not read file metadata.", 502);
  const metaBody = (await meta.json()) as { thumbnailLink?: string; mimeType?: string };
  if (!metaBody.thumbnailLink) {
    return errorResponse("NO_THUMBNAIL", "Drive has no thumbnail for this file.", 404);
  }
  // Thumbnail links accept the same Bearer token as the Drive API.
  const token = await getAccessToken(context.env);
  const tokenResponse = await fetch(metaBody.thumbnailLink, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!tokenResponse.ok) {
    return errorResponse("DRIVE_ERROR", "Could not fetch the thumbnail.", 502);
  }
  return new Response(tokenResponse.body, {
    status: 200,
    headers: {
      "Content-Type": tokenResponse.headers.get("Content-Type") ?? "image/jpeg",
      "Cache-Control": "no-store",
    },
  });
}
