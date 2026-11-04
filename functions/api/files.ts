import { getAccessToken, listLibrary } from "../_lib/drive";
import { errorResponse, jsonResponse, requireSession } from "../_lib/http";
import type { PagesContext } from "../_lib/types";

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const session = await requireSession(context);
  if (typeof session !== "string") return session;
  const token = await getAccessToken(context.env);
  if (!token) {
    return errorResponse("DRIVE_NOT_CONNECTED", "Google Drive is not connected. Connect Drive first.", 503);
  }
  const url = new URL(context.request.url);
  const rawFilter = url.searchParams.get("filter") ?? "not-sync";
  const filter = rawFilter === "all" || rawFilter === "synced" ? rawFilter : "not-sync";
  const search = url.searchParams.get("search") ?? "";
  const result = await listLibrary(context.env, filter, search);
  if (!result) {
    return errorResponse("DRIVE_ERROR", "Could not list Drive files.", 502);
  }
  return jsonResponse({
    files: result.files,
    filter,
    inboxFolder: "Travel Inbox",
    archiveFolder: "Travel Archive",
    folderReady: result.inboxId !== null || result.archiveId !== null,
  });
}
