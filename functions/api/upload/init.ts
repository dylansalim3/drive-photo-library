import {
  createResumableUploadSession,
  findOrCreateFolder,
  INBOX_FOLDER,
  resolveNestedFolderPath,
} from "../../_lib/drive";
import { errorResponse, jsonResponse, requireSession } from "../../_lib/http";
import type { PagesContext } from "../../_lib/types";

export interface InitUploadBody {
  fileName?: string;
  mimeType?: string;
  size?: number;
  folderId?: string;
  folderPath?: string;
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const session = await requireSession(context);
  if (typeof session !== "string") return session;

  let body: InitUploadBody;
  try {
    body = (await context.request.json()) as InitUploadBody;
  } catch {
    return errorResponse("BAD_REQUEST", "Expected JSON request body.", 400);
  }

  const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType.trim() : "";
  const size = typeof body.size === "number" && body.size >= 0 ? body.size : undefined;

  if (!fileName) {
    return errorResponse("BAD_REQUEST", "fileName is required.", 400);
  }
  if (!mimeType.startsWith("image/") && !mimeType.startsWith("video/")) {
    return errorResponse("BAD_REQUEST", "Only image and video uploads are supported.", 400);
  }

  const rawFolderId = body.folderId?.trim() || null;
  const rawFolderPath = body.folderPath?.trim() || null;

  let targetFolderId: string | null = rawFolderId;

  if (!targetFolderId && rawFolderPath) {
    const resolved = await resolveNestedFolderPath(context.env, rawFolderPath);
    targetFolderId = resolved?.id ?? null;
  }

  if (!targetFolderId) {
    targetFolderId = await findOrCreateFolder(context.env, INBOX_FOLDER, undefined, null);
  }

  if (!targetFolderId) {
    return errorResponse("DRIVE_ERROR", "Could not find or create destination upload folder.", 502);
  }

  try {
    const result = await createResumableUploadSession(context.env, {
      fileName,
      mimeType,
      size,
      parentFolderId: targetFolderId,
      uploadedBy: session,
    });

    if (!result || !result.uploadUrl) {
      return errorResponse("DRIVE_INIT_FAILED", "Failed to initiate resumable upload session with Google Drive.", 502);
    }

    return jsonResponse({
      ok: true,
      uploadUrl: result.uploadUrl,
      targetFolderId,
    });
  } catch (err) {
    return errorResponse(
      "SERVER_ERROR",
      err instanceof Error ? err.message : "Failed to create upload session.",
      500,
    );
  }
}
