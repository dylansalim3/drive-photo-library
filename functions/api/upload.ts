import { driveFetch, findOrCreateFolder, INBOX_FOLDER, toDriveFile } from "../_lib/drive";
import { errorResponse, jsonResponse, requireSession } from "../_lib/http";
import type { PagesContext } from "../_lib/types";

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/**
 * One file per request, uploaded through the web. The server tags it
 * properties.syncStatus = "not-sync" (public properties, so the tag is
 * queryable) and puts it in Travel Inbox. The frontend queue uploads files
 * one at a time and only marks a file Confirmed when Drive confirms it.
 */
export async function onRequestPost(context: PagesContext): Promise<Response> {
  const session = await requireSession(context);
  if (typeof session !== "string") return session;

  let form: FormData;
  try {
    form = await context.request.formData();
  } catch {
    return errorResponse("BAD_REQUEST", "Expected multipart form data with a file field.", 400);
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return errorResponse("BAD_REQUEST", "No file was uploaded.", 400);
  }
  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    return errorResponse("BAD_REQUEST", "Only images and videos can be uploaded.", 400);
  }

  const inboxId = await findOrCreateFolder(context.env, INBOX_FOLDER);
  if (!inboxId) {
    return errorResponse("DRIVE_ERROR", "Could not find or create the Travel Inbox folder.", 502);
  }

  const boundary = `dpl-${crypto.randomUUID()}`;
  const metadata = JSON.stringify({
    name: file.name,
    parents: [inboxId],
    properties: { syncStatus: "not-sync" },
  });
  const header = new TextEncoder().encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n` +
      `--${boundary}\r\nContent-Type: ${file.type}\r\n\r\n`,
  );
  const footer = new TextEncoder().encode(`\r\n--${boundary}--`);
  const body = concatBytes([header, new Uint8Array(await file.arrayBuffer()), footer]);

  const upstream = await driveFetch(context.env, "/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body: body as unknown as BodyInit,
  });
  if (!upstream) return errorResponse("DRIVE_NOT_CONNECTED", "Google Drive is not connected.", 503);
  if (!upstream.ok) {
    let detail = "";
    try {
      detail = JSON.stringify(await upstream.json());
    } catch {
      detail = "";
    }
    return errorResponse(
      "DRIVE_UPLOAD_FAILED",
      `Drive rejected the upload (${upstream.status}). ${detail}`.trim(),
      502,
    );
  }
  const created = (await upstream.json()) as {
    id: string;
    name: string;
    mimeType: string;
    size?: string;
    createdTime?: string;
    modifiedTime?: string;
  };
  return jsonResponse({
    ok: true,
    file: toDriveFile({ ...created, properties: { syncStatus: "not-sync" } }),
  });
}
