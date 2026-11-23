import {
  ARCHIVE_FOLDER,
  findOrCreateFolder,
  getAccessToken,
  getBreadcrumbs,
  getRootFolderId,
  INBOX_FOLDER,
  listFolderFiles,
  listSubfolders,
  toDriveFile,
} from "../_lib/drive";
import { errorResponse, jsonResponse, requireSession } from "../_lib/http";
import type { Breadcrumb, DriveFolderOut, PagesContext } from "../_lib/types";

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
  const requestedFolderId = url.searchParams.get("folderId")?.trim();

  const rootParentId = await getRootFolderId(context.env);
  const inbox = await findOrCreateFolder(context.env, INBOX_FOLDER, rootParentId, null);
  const archive = await findOrCreateFolder(context.env, ARCHIVE_FOLDER, rootParentId, null);

  const defaultRootId = filter === "synced" ? (archive ?? inbox) : inbox;
  const defaultRootName = filter === "synced" ? ARCHIVE_FOLDER : INBOX_FOLDER;

  const currentFolderId = requestedFolderId || defaultRootId;
  if (!currentFolderId) {
    return errorResponse("DRIVE_ERROR", "Could not locate root folder.", 502);
  }

  let currentFolderName = defaultRootName;
  let breadcrumbs: Breadcrumb[] = [];

  if (currentFolderId === defaultRootId) {
    breadcrumbs = [{ id: currentFolderId, name: defaultRootName }];
  } else {
    breadcrumbs = await getBreadcrumbs(context.env, currentFolderId, defaultRootId);
    if (breadcrumbs.length > 0) {
      currentFolderName = breadcrumbs[breadcrumbs.length - 1].name;
    }
  }

  const rawSubfolders = (await listSubfolders(context.env, currentFolderId)) ?? [];
  const subfolders: DriveFolderOut[] = search
    ? rawSubfolders.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : rawSubfolders;

  const rawFiles = (await listFolderFiles(context.env, currentFolderId)) ?? [];
  const driveFiles = rawFiles.map((file) => toDriveFile(file, archive, rootParentId));
  const filteredFiles =
    filter === "not-sync"
      ? driveFiles.filter((f) => f.syncStatus === "not-sync")
      : filter === "synced"
        ? driveFiles.filter((f) => f.syncStatus === "synced")
        : driveFiles;

  const finalFiles = search
    ? filteredFiles.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()))
    : filteredFiles;

  return jsonResponse({
    currentFolderId,
    currentFolderName,
    breadcrumbs,
    subfolders,
    files: finalFiles,
    filter,
    inboxFolder: INBOX_FOLDER,
    archiveFolder: ARCHIVE_FOLDER,
    folderReady: true,
  });
}
