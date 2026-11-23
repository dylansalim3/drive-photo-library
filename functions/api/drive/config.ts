import {
  DEFAULT_ROOT_FOLDER_ID,
  extractFolderId,
  getConnectedGoogleUser,
  getRootFolderId,
  getRootFolderName,
  setRootFolderConfig,
  verifyFolderAccess,
} from "../../_lib/drive";
import { errorResponse, jsonResponse, requireAdmin, requireSessionUser } from "../../_lib/http";
import type { PagesContext } from "../../_lib/types";

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const user = await requireSessionUser(context);
  if ("status" in user) return user;

  const rootFolderId = await getRootFolderId(context.env);
  const rootFolderName = await getRootFolderName(context.env);
  const googleUser = await getConnectedGoogleUser(context.env);

  return jsonResponse({
    rootFolderId,
    rootFolderName,
    googleEmail: googleUser?.emailAddress,
    googleDisplayName: googleUser?.displayName,
  });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const admin = await requireAdmin(context);
  if ("status" in admin) return admin;

  let body: { folderInput?: unknown; resetDefault?: boolean };
  try {
    body = (await context.request.json()) as typeof body;
  } catch {
    return errorResponse("BAD_REQUEST", "Expected JSON with folderInput.", 400);
  }

  if (body.resetDefault) {
    await setRootFolderConfig(context.env, DEFAULT_ROOT_FOLDER_ID, "Default Root Library");
    return jsonResponse({
      ok: true,
      rootFolderId: DEFAULT_ROOT_FOLDER_ID,
      rootFolderName: "Default Root Library",
      message: "Reset to default library root folder.",
    });
  }

  const folderInput = typeof body.folderInput === "string" ? body.folderInput.trim() : "";
  if (!folderInput) {
    return errorResponse("BAD_REQUEST", "Please provide a Google Drive folder URL or ID.", 400);
  }

  const folderId = extractFolderId(folderInput);
  try {
    const verified = await verifyFolderAccess(context.env, folderId);
    if (!verified) {
      const googleUser = await getConnectedGoogleUser(context.env);
      const emailNotice = googleUser?.emailAddress
        ? ` with '${googleUser.emailAddress}' as Editor`
        : " with Editor permissions";
      return errorResponse(
        "FOLDER_ACCESS_DENIED",
        `Could not access folder. Please make sure the folder is shared${emailNotice}.`,
        400,
      );
    }

    await setRootFolderConfig(context.env, verified.id, verified.name);
    return jsonResponse({
      ok: true,
      rootFolderId: verified.id,
      rootFolderName: verified.name,
      message: `Root folder connected to '${verified.name}'.`,
    });
  } catch (err) {
    return errorResponse(
      "FOLDER_ERROR",
      err instanceof Error ? err.message : "Failed to verify folder access.",
      400,
    );
  }
}
