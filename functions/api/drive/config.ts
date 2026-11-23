import {
  DEFAULT_ROOT_FOLDER_ID,
  extractFolderId,
  getConnectedGoogleUser,
  getRootFolderId,
  getRootFolderName,
  listSelfFolders,
  listSharedDrives,
  listSharedWithMeFolders,
  searchAccessibleFolders,
  setRootFolderConfig,
  verifyFolderAccess,
} from "../../_lib/drive";
import { errorResponse, jsonResponse, requireSessionUser } from "../../_lib/http";
import type { PagesContext } from "../../_lib/types";

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const user = await requireSessionUser(context);
  if ("status" in user) return user;

  const url = new URL(context.request.url);
  const search = url.searchParams.get("search")?.trim() || "";

  const [rootFolderId, rootFolderName, googleUser, selfFolders, sharedFolders, sharedDrives, searchResults] =
    await Promise.all([
      getRootFolderId(context.env),
      getRootFolderName(context.env),
      getConnectedGoogleUser(context.env),
      listSelfFolders(context.env),
      listSharedWithMeFolders(context.env),
      listSharedDrives(context.env),
      search ? searchAccessibleFolders(context.env, search) : Promise.resolve([]),
    ]);

  return jsonResponse({
    ok: true,
    rootFolderId,
    rootFolderName,
    googleEmail: googleUser?.emailAddress,
    googleDisplayName: googleUser?.displayName,
    selfFolders,
    sharedFolders,
    sharedDrives,
    searchResults,
  });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const user = await requireSessionUser(context);
  if ("status" in user) return user;

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
