import { driveFetch } from "../../_lib/drive";
import { errorResponse, requireSession } from "../../_lib/http";
import type { PagesContext } from "../../_lib/types";

/**
 * Stream-only file proxy. The Drive Range header is passed through untouched,
 * so <video> can seek without downloading the whole file. No Content-Disposition
 * unless the user explicitly taps Download (?download=1), and no-store so the
 * phone does not keep an offline media copy.
 */
export async function onRequestGet(context: PagesContext): Promise<Response> {
  const session = await requireSession(context);
  if (typeof session !== "string") return session;
  const url = new URL(context.request.url);
  const id = url.searchParams.get("id");
  if (!id) return errorResponse("BAD_REQUEST", "Missing file id.", 400);
  const download = url.searchParams.get("download") === "1";

  const range = context.request.headers.get("Range");
  const upstream = await driveFetch(
    context.env,
    `/drive/v3/files/${encodeURIComponent(id)}?alt=media`,
    { headers: range ? { Range: range } : {} },
  );
  if (!upstream) return errorResponse("DRIVE_NOT_CONNECTED", "Google Drive is not connected.", 503);
  if (!upstream.ok && upstream.status !== 206) {
    return errorResponse("DRIVE_ERROR", `Drive returned ${upstream.status} for this file.`, 502);
  }
  const headers = new Headers();
  const contentType = upstream.headers.get("Content-Type");
  if (contentType) headers.set("Content-Type", contentType);
  const contentRange = upstream.headers.get("Content-Range");
  if (contentRange) headers.set("Content-Range", contentRange);
  const contentLength = upstream.headers.get("Content-Length");
  if (contentLength) headers.set("Content-Length", contentLength);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "no-store");
  if (download) headers.set("Content-Disposition", "attachment");
  return new Response(upstream.body, { status: upstream.status, headers });
}
