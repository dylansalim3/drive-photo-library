import { decryptText, encryptText } from "./crypto";
import type { Breadcrumb, DriveFolderOut, Env, ImageMediaMetadata, VideoMediaMetadata } from "./types";

export const INBOX_FOLDER = "Travel Inbox";
export const ARCHIVE_FOLDER = "Travel Archive";
export const TRASH_FOLDER = "Travel Trash";
export const DEFAULT_ROOT_FOLDER_ID = "1XaVTeYnE79682ZTJzi7FYOH3D5siPZTb";

export async function getRootFolderId(env: Env): Promise<string | undefined> {
  try {
    const row = await env.DB.prepare(
      "SELECT value FROM app_settings WHERE key = 'root_folder_id'",
    ).first<{ value: string }>();
    if (row?.value?.trim()) return row.value.trim();
  } catch {}
  return env.DRIVE_ROOT_FOLDER_ID?.trim() || DEFAULT_ROOT_FOLDER_ID;
}

export async function getRootFolderName(env: Env): Promise<string | undefined> {
  try {
    const row = await env.DB.prepare(
      "SELECT value FROM app_settings WHERE key = 'root_folder_name'",
    ).first<{ value: string }>();
    if (row?.value?.trim()) return row.value.trim();
  } catch {}
  return undefined;
}

export async function setRootFolderConfig(
  env: Env,
  folderId: string,
  folderName?: string,
): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare(
    "INSERT INTO app_settings (key, value, updated_at) VALUES ('root_folder_id', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
  )
    .bind(folderId.trim(), now)
    .run();

  if (folderName) {
    await env.DB.prepare(
      "INSERT INTO app_settings (key, value, updated_at) VALUES ('root_folder_name', ?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at",
    )
      .bind(folderName.trim(), now)
      .run();
  }
}

export function extractFolderId(input: string): string {
  const trimmed = input.trim();
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch) return idParamMatch[1];
  return trimmed;
}

export async function verifyFolderAccess(
  env: Env,
  folderIdOrUrl: string,
): Promise<{ id: string; name: string } | null> {
  const folderId = extractFolderId(folderIdOrUrl);
  if (folderId === "root") {
    return { id: "root", name: "My Drive (Whole Drive)" };
  }
  const res = await driveFetch(
    env,
    `/drive/v3/files/${encodeURIComponent(folderId)}?fields=id,name,mimeType&supportsAllDrives=true`,
  );
  if (!res || !res.ok) {
    // Check if it's a Shared Drive (driveId)
    const driveRes = await driveFetch(
      env,
      `/drive/v3/drives/${encodeURIComponent(folderId)}?fields=id,name`,
    );
    if (driveRes && driveRes.ok) {
      const driveBody = (await driveRes.json()) as { id: string; name: string };
      return { id: driveBody.id, name: driveBody.name };
    }
    return null;
  }
  const body = (await res.json()) as { id: string; name: string; mimeType: string };
  if (body.mimeType !== "application/vnd.google-apps.folder") {
    throw new Error("The specified link/ID is a file, not a folder.");
  }
  return { id: body.id, name: body.name };
}

export async function getConnectedGoogleUser(
  env: Env,
): Promise<{ emailAddress?: string; displayName?: string } | null> {
  const res = await driveFetch(env, "/drive/v3/about?fields=user(displayName,emailAddress)");
  if (!res || !res.ok) return null;
  const body = (await res.json()) as { user?: { displayName?: string; emailAddress?: string } };
  return body.user ?? null;
}

export interface DriveTokenRow {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

export interface DriveFileRaw {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  parents?: string[];
  properties?: Record<string, string>;
  thumbnailLink?: string;
  imageMediaMetadata?: ImageMediaMetadata;
  videoMediaMetadata?: VideoMediaMetadata;
}

export interface DriveFileOut {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  syncStatus: "not-sync" | "synced" | "trash" | "unknown";
  uploadedBy?: string;
  isVideo: boolean;
  isImage: boolean;
  imageMediaMetadata?: ImageMediaMetadata;
  videoMediaMetadata?: VideoMediaMetadata;
}

export function toDriveFile(
  file: DriveFileRaw,
  archiveId?: string | null,
  rootId?: string | null,
  trashId?: string | null,
): DriveFileOut {
  const raw = file.properties?.["syncStatus"];
  const syncStatus: DriveFileOut["syncStatus"] =
    raw === "trash" || (trashId && file.parents?.includes(trashId))
      ? "trash"
      : raw === "not-sync"
        ? "not-sync"
        : raw === "synced"
          ? "synced"
          : (archiveId && file.parents?.includes(archiveId)) ||
              (rootId && file.parents?.includes(rootId))
            ? "synced"
            : "unknown";
  const uploadedBy = file.properties?.["uploadedBy"] || undefined;
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size,
    createdTime: file.createdTime,
    modifiedTime: file.modifiedTime,
    syncStatus,
    uploadedBy,
    isVideo: file.mimeType.startsWith("video/"),
    isImage: file.mimeType.startsWith("image/"),
    imageMediaMetadata: file.imageMediaMetadata,
    videoMediaMetadata: file.videoMediaMetadata,
  };
}

async function readStoredTokens(env: Env): Promise<DriveTokenRow | null> {
  if (!env.GOOGLE_CLIENT_SECRET) return null;
  const row = await env.DB.prepare(
    "SELECT access_token, refresh_token, expires_at FROM drive_tokens WHERE id = 'default'",
  ).first<{ access_token: string; refresh_token: string; expires_at: number }>();
  if (!row) return null;
  try {
    return {
      access_token: await decryptText(env.GOOGLE_CLIENT_SECRET, row.access_token),
      refresh_token: await decryptText(env.GOOGLE_CLIENT_SECRET, row.refresh_token),
      expires_at: row.expires_at,
    };
  } catch {
    return null;
  }
}

async function storeTokens(env: Env, tokens: DriveTokenRow): Promise<void> {
  if (!env.GOOGLE_CLIENT_SECRET) return;
  const access = await encryptText(env.GOOGLE_CLIENT_SECRET, tokens.access_token);
  const refresh = await encryptText(env.GOOGLE_CLIENT_SECRET, tokens.refresh_token);
  await env.DB.prepare(
    `INSERT INTO drive_tokens (id, access_token, refresh_token, expires_at)
     VALUES ('default', ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET access_token = excluded.access_token,
       refresh_token = excluded.refresh_token, expires_at = excluded.expires_at`,
  )
    .bind(access, refresh, tokens.expires_at)
    .run();
}

async function refreshAccessToken(env: Env, tokens: DriveTokenRow): Promise<DriveTokenRow | null> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID ?? "",
      client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { access_token: string; refresh_token?: string; expires_in: number };
  const next: DriveTokenRow = {
    access_token: body.access_token,
    refresh_token: body.refresh_token ?? tokens.refresh_token,
    expires_at: Math.floor(Date.now() / 1000) + Math.max(60, body.expires_in - 60),
  };
  await storeTokens(env, next);
  return next;
}

/** Returns a usable Drive access token, or null when Drive is not connected. */
export async function getAccessToken(env: Env): Promise<string | null> {
  const tokens = await readStoredTokens(env);
  if (!tokens) return null;
  const now = Math.floor(Date.now() / 1000);
  if (tokens.expires_at > now + 60) return tokens.access_token;
  const refreshed = await refreshAccessToken(env, tokens);
  return refreshed?.access_token ?? null;
}

export async function driveFetch(
  env: Env,
  path: string,
  init: RequestInit = {},
): Promise<Response | null> {
  const token = await getAccessToken(env);
  if (!token) return null;

  // Seamlessly support Shared Drives and shared external folders
  let targetPath = path;
  if (targetPath.includes("/drive/v3/files") || targetPath.includes("/upload/drive/v3/files") || targetPath.includes("/drive/v3/drives")) {
    const separator = targetPath.includes("?") ? "&" : "?";
    if (!targetPath.includes("supportsAllDrives=")) {
      targetPath += `${separator}supportsAllDrives=true`;
    }
    const isList = (!init.method || init.method.toUpperCase() === "GET") &&
      (targetPath.startsWith("/drive/v3/files?") || targetPath === "/drive/v3/files");
    if (isList && !targetPath.includes("includeItemsFromAllDrives=")) {
      targetPath += `&includeItemsFromAllDrives=true`;
    }
  }

  const response = await fetch(`https://www.googleapis.com${targetPath}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
  return response;
}

function escapeDriveQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function listDriveFiles(
  env: Env,
  query: string,
): Promise<DriveFileRaw[] | null> {
  const response = await driveFetch(
    env,
    `/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(
      "files(id,name,mimeType,size,createdTime,modifiedTime,parents,properties,thumbnailLink,imageMediaMetadata,videoMediaMetadata)",
    )}&orderBy=createdTime desc&pageSize=100`,
  );
  if (!response || !response.ok) return null;
  const body = (await response.json()) as { files?: DriveFileRaw[] };
  return (body.files ?? []).filter(
    (file) => file.mimeType.startsWith("image/") || file.mimeType.startsWith("video/"),
  );
}

export async function findFolder(
  env: Env,
  name: string,
  parentId?: string | null,
): Promise<DriveFileRaw | null> {
  const parentIdTarget = parentId !== undefined ? parentId : await getRootFolderId(env);
  const parentClause = parentIdTarget ? ` and '${escapeDriveQuery(parentIdTarget)}' in parents` : "";
  const response = await driveFetch(
    env,
    `/drive/v3/files?q=${encodeURIComponent(
      `mimeType = 'application/vnd.google-apps.folder' and name = '${escapeDriveQuery(name)}' and trashed = false${parentClause}`,
    )}&fields=${encodeURIComponent("files(id,name,parents)")}&pageSize=10`,
  );
  if (!response || !response.ok) return null;
  const body = (await response.json()) as { files?: DriveFileRaw[] };
  return body.files?.[0] ?? null;
}

export async function findOrCreateFolder(
  env: Env,
  name: string,
  parentId?: string | null,
  syncStatus: string | null = "not-sync",
): Promise<string | null> {
  const parentIdTarget = parentId !== undefined ? parentId : await getRootFolderId(env);
  const existing = await findFolder(env, name, parentIdTarget);
  if (existing) return existing.id;
  const payload: { name: string; mimeType: string; parents?: string[]; properties?: Record<string, string> } = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentIdTarget) {
    payload.parents = [parentIdTarget];
  }
  if (syncStatus) {
    payload.properties = { syncStatus };
  }
  const response = await driveFetch(env, "/drive/v3/files", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response || !response.ok) return null;
  const body = (await response.json()) as { id?: string };
  return body.id ?? null;
}

export async function resolveNestedFolderPath(
  env: Env,
  path: string,
  rootParentId?: string,
): Promise<{ id: string; name: string; parentId: string; path: string } | null> {
  const segments = path
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);
  if (segments.length === 0) return null;

  let currentParentId = rootParentId ?? (await findOrCreateFolder(env, INBOX_FOLDER, undefined, null));
  if (!currentParentId) return null;

  let lastId = currentParentId;
  let lastName = "";
  let lastParent = currentParentId;

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const createdId = await findOrCreateFolder(env, seg, currentParentId, "not-sync");
    if (!createdId) return null;
    lastParent = currentParentId;
    lastId = createdId;
    lastName = seg;
    currentParentId = createdId;
  }

  return {
    id: lastId,
    name: lastName,
    parentId: lastParent,
    path: segments.join("/"),
  };
}

export async function listSubfolders(
  env: Env,
  parentId: string,
  includeTrash = false,
): Promise<DriveFolderOut[] | null> {
  const query = `mimeType = 'application/vnd.google-apps.folder' and '${escapeDriveQuery(parentId)}' in parents and trashed = false`;
  const response = await driveFetch(
    env,
    `/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(
      "files(id,name,parents,properties)",
    )}&orderBy=name asc&pageSize=100`,
  );
  if (!response || !response.ok) return null;
  const body = (await response.json()) as { files?: DriveFileRaw[] };
  const folders = (body.files ?? []).filter((f) => includeTrash || f.name !== TRASH_FOLDER);
  return folders.map((f) => {
    const raw = f.properties?.["syncStatus"];
    const syncStatus: DriveFolderOut["syncStatus"] =
      raw === "trash" ? "trash" : raw === "not-sync" ? "not-sync" : raw === "synced" ? "synced" : "unknown";
    return {
      id: f.id,
      name: f.name,
      parentId: f.parents?.[0],
      syncStatus,
    };
  });
}

export async function getBreadcrumbs(
  env: Env,
  currentFolderId: string,
  stopFolderId?: string,
): Promise<Breadcrumb[]> {
  const crumbs: Breadcrumb[] = [];
  let currId: string | null = currentFolderId;
  const maxDepth = 10;
  let depth = 0;

  while (currId && depth < maxDepth) {
    depth++;
    const res = await driveFetch(
      env,
      `/drive/v3/files/${encodeURIComponent(currId)}?fields=${encodeURIComponent("id,name,parents")}`,
    );
    if (!res || !res.ok) break;
    const f = (await res.json()) as { id: string; name: string; parents?: string[] };
    crumbs.unshift({ id: f.id, name: f.name });
    if (stopFolderId && f.id === stopFolderId) break;
    currId = f.parents?.[0] ?? null;
    if (!currId || (stopFolderId && currId === stopFolderId)) {
      if (currId && stopFolderId && currId === stopFolderId) {
        const stopRes = await driveFetch(
          env,
          `/drive/v3/files/${encodeURIComponent(stopFolderId)}?fields=${encodeURIComponent("id,name")}`,
        );
        if (stopRes && stopRes.ok) {
          const stopF = (await stopRes.json()) as { id: string; name: string };
          crumbs.unshift({ id: stopF.id, name: stopF.name });
        }
      }
      break;
    }
  }

  return crumbs;
}

export async function syncFolderRecursive(
  env: Env,
  folderId: string,
  archiveParentId: string,
): Promise<number> {
  let count = 0;

  const meta = await driveFetch(
    env,
    `/drive/v3/files/${encodeURIComponent(folderId)}?fields=${encodeURIComponent("id,parents")}`,
  );
  if (meta && meta.ok) {
    const metaBody = (await meta.json()) as { parents?: string[] };
    const removeParents = (metaBody.parents ?? []).filter((p) => p !== archiveParentId).join(",");
    const query = new URLSearchParams({ addParents: archiveParentId });
    if (removeParents) query.set("removeParents", removeParents);

    await driveFetch(
      env,
      `/drive/v3/files/${encodeURIComponent(folderId)}?${query.toString()}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ properties: { syncStatus: null } }),
      },
    );
    count++;
  }

  async function clearFolderItems(parent: string): Promise<void> {
    const response = await driveFetch(
      env,
      `/drive/v3/files?q=${encodeURIComponent(
        `'${escapeDriveQuery(parent)}' in parents and trashed = false`,
      )}&fields=${encodeURIComponent("files(id,mimeType,properties)")}&pageSize=100`,
    );
    if (!response || !response.ok) return;
    const body = (await response.json()) as { files?: { id: string; mimeType: string; properties?: Record<string, string> }[] };
    const items = body.files ?? [];

    for (const item of items) {
      if (item.properties?.["syncStatus"]) {
        await driveFetch(
          env,
          `/drive/v3/files/${encodeURIComponent(item.id)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ properties: { syncStatus: null } }),
          },
        );
        count++;
      }
      if (item.mimeType === "application/vnd.google-apps.folder") {
        await clearFolderItems(item.id);
      }
    }
  }

  await clearFolderItems(folderId);
  return count;
}

/** The exact Drive query for the not-sync filter, per the app contract. */
export async function listNotSyncFiles(env: Env): Promise<DriveFileRaw[] | null> {
  return listDriveFiles(env, "properties has { key='syncStatus' and value='not-sync' } and trashed = false");
}

export async function listFolderFiles(env: Env, folderId: string): Promise<DriveFileRaw[] | null> {
  return listDriveFiles(env, `'${folderId}' in parents and trashed = false`);
}

export async function listLibrary(
  env: Env,
  filter: "all" | "not-sync" | "synced",
  search: string,
): Promise<{ files: DriveFileOut[]; inboxId: string | null; archiveId: string | null } | null> {
  const rootId = await getRootFolderId(env);
  const inbox = await findFolder(env, INBOX_FOLDER, rootId);
  const archive = await findFolder(env, ARCHIVE_FOLDER, rootId);
  const searchClause = search ? ` and name contains '${escapeDriveQuery(search)}'` : "";

  if (filter === "not-sync") {
    const files = await listDriveFiles(
      env,
      `properties has { key='syncStatus' and value='not-sync' } and trashed = false${searchClause}`,
    );
    if (!files) return null;
    return {
      files: files.map((file) => toDriveFile(file, archive?.id, rootId)),
      inboxId: inbox?.id ?? null,
      archiveId: archive?.id ?? null,
    };
  }

  if (filter === "synced") {
    const parts: DriveFileRaw[] = [];
    if (archive) {
      const archiveFiles = await listFolderFiles(env, archive.id);
      if (archiveFiles) parts.push(...archiveFiles);
    }
    // Loose media files placed directly in the parent root folder outside this app
    if (rootId) {
      const rootFiles = await listFolderFiles(env, rootId);
      if (rootFiles) {
        parts.push(...rootFiles.filter((f) => f.properties?.["syncStatus"] !== "not-sync"));
      }
    }
    const seen = new Set<string>();
    const unique = parts.filter((file) => {
      if (seen.has(file.id)) return false;
      seen.add(file.id);
      return true;
    });
    const searched = search
      ? unique.filter((file) => file.name.toLowerCase().includes(search.toLowerCase()))
      : unique;
    searched.sort((a, b) => (b.createdTime ?? "").localeCompare(a.createdTime ?? ""));
    return {
      files: searched.map((file) => toDriveFile(file, archive?.id, rootId)),
      inboxId: inbox?.id ?? null,
      archiveId: archive?.id ?? null,
    };
  }

  // all: inbox + archive + loose files in parent root folder combined, de-duplicated, newest first.
  const parts: DriveFileRaw[] = [];
  if (inbox) {
    const inboxFiles = await listFolderFiles(env, inbox.id);
    if (!inboxFiles) return null;
    parts.push(...inboxFiles);
  }
  if (archive) {
    const archiveFiles = await listFolderFiles(env, archive.id);
    if (!archiveFiles) return null;
    parts.push(...archiveFiles);
  }
  if (rootId) {
    const rootFiles = await listFolderFiles(env, rootId);
    if (rootFiles) parts.push(...rootFiles);
  }
  const seen = new Set<string>();
  const merged = parts.filter((file) => {
    if (seen.has(file.id)) return false;
    seen.add(file.id);
    return true;
  });
  const searched = search
    ? merged.filter((file) => file.name.toLowerCase().includes(search.toLowerCase()))
    : merged;
  searched.sort((a, b) => (b.createdTime ?? "").localeCompare(a.createdTime ?? ""));
  return {
    files: searched.map((file) => toDriveFile(file, archive?.id, rootId)),
    inboxId: inbox?.id ?? null,
    archiveId: archive?.id ?? null,
  };
}

export interface TreeFileItem {
  id: string;
  name: string;
  path: string;
  size?: string;
  mimeType: string;
}

export async function getFolderTree(
  env: Env,
  folderId: string,
  basePath = "",
  maxDepth = 8,
): Promise<TreeFileItem[]> {
  if (maxDepth <= 0) return [];
  const results: TreeFileItem[] = [];

  const response = await driveFetch(
    env,
    `/drive/v3/files?q=${encodeURIComponent(
      `'${escapeDriveQuery(folderId)}' in parents and trashed = false`,
    )}&fields=${encodeURIComponent("files(id,name,mimeType,size,properties)")}&pageSize=100`,
  );
  if (!response || !response.ok) return results;
  const body = (await response.json()) as {
    files?: { id: string; name: string; mimeType: string; size?: string }[];
  };
  const items = body.files ?? [];

  const subfolders: { id: string; name: string }[] = [];

  for (const item of items) {
    if (item.mimeType === "application/vnd.google-apps.folder") {
      subfolders.push({ id: item.id, name: item.name });
    } else if (item.mimeType.startsWith("image/") || item.mimeType.startsWith("video/")) {
      const filePath = basePath ? `${basePath}/${item.name}` : item.name;
      results.push({
        id: item.id,
        name: item.name,
        path: filePath,
        size: item.size,
        mimeType: item.mimeType,
      });
    }
  }

  if (subfolders.length > 0) {
    const subPromises = subfolders.map((sf) => {
      const subPath = basePath ? `${basePath}/${sf.name}` : sf.name;
      return getFolderTree(env, sf.id, subPath, maxDepth - 1);
    });
    const subResults = await Promise.all(subPromises);
    for (const subList of subResults) {
      results.push(...subList);
    }
  }

  return results;
}

export async function getNotSyncTree(env: Env): Promise<TreeFileItem[]> {
  const rootId = await getRootFolderId(env);
  const inbox = await findFolder(env, INBOX_FOLDER, rootId);

  const treeItems: TreeFileItem[] = [];
  if (inbox) {
    const inboxTree = await getFolderTree(env, inbox.id, "");
    treeItems.push(...inboxTree);
  }

  const notSyncFiles = await listNotSyncFiles(env);
  const seenIds = new Set(treeItems.map((item) => item.id));

  if (notSyncFiles) {
    const missing = notSyncFiles.filter((f) => !seenIds.has(f.id));
    if (missing.length > 0) {
      const folderNameCache = new Map<string, string>();
      for (const f of missing) {
        const parentId = f.parents?.[0];
        let folderPath = "";
        if (parentId && parentId !== rootId && parentId !== inbox?.id) {
          if (!folderNameCache.has(parentId)) {
            const folderRes = await driveFetch(
              env,
              `/drive/v3/files/${encodeURIComponent(parentId)}?fields=name`,
            );
            if (folderRes && folderRes.ok) {
              const fb = (await folderRes.json()) as { name?: string };
              folderNameCache.set(parentId, fb.name ?? "Folder");
            } else {
              folderNameCache.set(parentId, "");
            }
          }
          folderPath = folderNameCache.get(parentId) || "";
        }
        treeItems.push({
          id: f.id,
          name: f.name,
          path: folderPath ? `${folderPath}/${f.name}` : f.name,
          size: f.size,
          mimeType: f.mimeType,
        });
      }
    }
  }

  return treeItems;
}

export async function createResumableUploadSession(
  env: Env,
  params: {
    fileName: string;
    mimeType: string;
    size?: number;
    parentFolderId: string;
    uploadedBy: string;
  },
): Promise<{ uploadUrl: string } | null> {
  const metadata = {
    name: params.fileName,
    parents: [params.parentFolderId],
    properties: {
      syncStatus: "not-sync",
      uploadedBy: params.uploadedBy,
    },
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json; charset=UTF-8",
    "X-Upload-Content-Type": params.mimeType,
  };
  if (params.size && params.size > 0) {
    headers["X-Upload-Content-Length"] = String(params.size);
  }

  const res = await driveFetch(
    env,
    "/upload/drive/v3/files?uploadType=resumable",
    {
      method: "POST",
      headers,
      body: JSON.stringify(metadata),
    },
  );

  if (!res || !res.ok) return null;
  const uploadUrl = res.headers.get("Location");
  if (!uploadUrl) return null;

  return { uploadUrl };
}

export async function findExistingDriveFile(
  env: Env,
  params: { md5?: string; fileName?: string; size?: number; folderId?: string }
): Promise<{ id: string; name: string; matchType: "md5" | "name_size" } | null> {
  const rootId = await getRootFolderId(env);
  const targetFolderId = params.folderId || (await findOrCreateFolder(env, INBOX_FOLDER, rootId, null));

  // 1. If MD5 provided, query globally within library
  if (params.md5) {
    const cleanMd5 = params.md5.toLowerCase().replace(/[^a-f0-9]/g, "");
    if (cleanMd5.length === 32) {
      const md5Query = `trashed = false and md5Checksum = '${cleanMd5}'`;
      const res = await driveFetch(
        env,
        `/drive/v3/files?q=${encodeURIComponent(md5Query)}&fields=${encodeURIComponent("files(id, name, md5Checksum, size)")}&pageSize=1`
      );
      if (res && res.ok) {
        const data = (await res.json()) as { files?: Array<{ id: string; name: string }> };
        if (data.files && data.files.length > 0) {
          return { id: data.files[0].id, name: data.files[0].name, matchType: "md5" };
        }
      }
    }
  }

  // 2. Fallback check: exact name and size in target folder or staging inbox
  if (params.fileName && params.size && params.size > 0 && targetFolderId) {
    const escapedName = params.fileName.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
    const nameQuery = `trashed = false and '${targetFolderId}' in parents and name = '${escapedName}'`;
    const res = await driveFetch(
      env,
      `/drive/v3/files?q=${encodeURIComponent(nameQuery)}&fields=${encodeURIComponent("files(id, name, size)")}&pageSize=1`
    );
    if (res && res.ok) {
      const data = (await res.json()) as { files?: Array<{ id: string; name: string; size?: string }> };
      if (data.files && data.files.length > 0) {
        const f = data.files[0];
        if (!f.size || parseInt(f.size, 10) === params.size) {
          return { id: f.id, name: f.name, matchType: "name_size" };
        }
      }
    }
  }

  return null;
}

export async function moveItemToTrash(
  env: Env,
  itemId: string,
): Promise<boolean> {
  const rootId = await getRootFolderId(env);
  const trashId = await findOrCreateFolder(env, TRASH_FOLDER, rootId, "trash");
  if (!trashId) return false;

  const meta = await driveFetch(
    env,
    `/drive/v3/files/${encodeURIComponent(itemId)}?fields=${encodeURIComponent("id,parents")}`,
  );
  if (!meta || !meta.ok) return false;
  const metaBody = (await meta.json()) as { parents?: string[] };
  const removeParents = (metaBody.parents ?? []).filter((p) => p !== trashId).join(",");

  const query = new URLSearchParams({ addParents: trashId });
  if (removeParents) query.set("removeParents", removeParents);

  const res = await driveFetch(
    env,
    `/drive/v3/files/${encodeURIComponent(itemId)}?${query.toString()}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { syncStatus: "trash" } }),
    },
  );
  return Boolean(res && res.ok);
}

export async function restoreItemFromTrash(
  env: Env,
  itemId: string,
): Promise<boolean> {
  const rootId = await getRootFolderId(env);
  const inboxId = await findOrCreateFolder(env, INBOX_FOLDER, rootId, null);
  const trash = await findFolder(env, TRASH_FOLDER, rootId);
  if (!inboxId) return false;

  const meta = await driveFetch(
    env,
    `/drive/v3/files/${encodeURIComponent(itemId)}?fields=${encodeURIComponent("id,parents")}`,
  );
  if (!meta || !meta.ok) return false;
  const metaBody = (await meta.json()) as { parents?: string[] };
  const removeParents = (metaBody.parents ?? []).filter((p) => p === trash?.id).join(",");

  const query = new URLSearchParams({ addParents: inboxId });
  if (removeParents) query.set("removeParents", removeParents);

  const res = await driveFetch(
    env,
    `/drive/v3/files/${encodeURIComponent(itemId)}?${query.toString()}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ properties: { syncStatus: "not-sync" } }),
    },
  );
  return Boolean(res && res.ok);
}

export async function emptyTrashFolder(
  env: Env,
  olderThanDays?: number,
): Promise<{ deletedCount: number }> {
  const rootId = await getRootFolderId(env);
  const trash = await findFolder(env, TRASH_FOLDER, rootId);
  if (!trash) return { deletedCount: 0 };

  let query = `'${escapeDriveQuery(trash.id)}' in parents and trashed = false`;
  if (olderThanDays && olderThanDays > 0) {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000).toISOString();
    query += ` and modifiedTime < '${cutoff}'`;
  }

  const res = await driveFetch(
    env,
    `/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent("files(id,mimeType)")}&pageSize=100`,
  );
  if (!res || !res.ok) return { deletedCount: 0 };
  const body = (await res.json()) as { files?: { id: string; mimeType: string }[] };
  const items = body.files ?? [];
  let deletedCount = 0;

  for (const item of items) {
    const delRes = await driveFetch(env, `/drive/v3/files/${encodeURIComponent(item.id)}`, {
      method: "DELETE",
    });
    if (delRes && delRes.ok) {
      deletedCount++;
    }
  }

  return { deletedCount };
}

export async function getStorageQuotaAndBreakdown(env: Env): Promise<{
  limit?: string;
  usage?: string;
  usageInDrive?: string;
  usageInDriveTrash?: string;
  usagePercent?: number;
  stagingSize: number;
  stagingCount: number;
  archiveSize: number;
  archiveCount: number;
  trashSize: number;
  trashCount: number;
}> {
  const aboutRes = await driveFetch(env, "/drive/v3/about?fields=storageQuota");
  let limit: string | undefined;
  let usage: string | undefined;
  let usageInDrive: string | undefined;
  let usageInDriveTrash: string | undefined;
  let usagePercent: number | undefined;

  if (aboutRes && aboutRes.ok) {
    const aboutBody = (await aboutRes.json()) as {
      storageQuota?: {
        limit?: string;
        usage?: string;
        usageInDrive?: string;
        usageInDriveTrash?: string;
      };
    };
    if (aboutBody.storageQuota) {
      limit = aboutBody.storageQuota.limit;
      usage = aboutBody.storageQuota.usage;
      usageInDrive = aboutBody.storageQuota.usageInDrive;
      usageInDriveTrash = aboutBody.storageQuota.usageInDriveTrash;
      const numLimit = limit ? parseFloat(limit) : 0;
      const numUsage = usage ? parseFloat(usage) : 0;
      if (numLimit > 0) {
        usagePercent = Math.round((numUsage / numLimit) * 1000) / 10;
      }
    }
  }

  const rootId = await getRootFolderId(env);
  const inbox = await findFolder(env, INBOX_FOLDER, rootId);
  const archive = await findFolder(env, ARCHIVE_FOLDER, rootId);
  const trash = await findFolder(env, TRASH_FOLDER, rootId);

  async function getFolderStats(folderId?: string): Promise<{ size: number; count: number }> {
    if (!folderId) return { size: 0, count: 0 };
    const res = await driveFetch(
      env,
      `/drive/v3/files?q=${encodeURIComponent(`'${escapeDriveQuery(folderId)}' in parents and trashed = false`)}&fields=${encodeURIComponent("files(size,mimeType)")}&pageSize=100`,
    );
    if (!res || !res.ok) return { size: 0, count: 0 };
    const body = (await res.json()) as { files?: { size?: string; mimeType: string }[] };
    const files = (body.files ?? []).filter((f) => f.mimeType !== "application/vnd.google-apps.folder");
    let size = 0;
    for (const f of files) {
      if (f.size) size += parseInt(f.size, 10) || 0;
    }
    return { size, count: files.length };
  }

  const [stagingStats, archiveStats, trashStats] = await Promise.all([
    getFolderStats(inbox?.id),
    getFolderStats(archive?.id),
    getFolderStats(trash?.id),
  ]);

  return {
    limit,
    usage,
    usageInDrive,
    usageInDriveTrash,
    usagePercent,
    stagingSize: stagingStats.size,
    stagingCount: stagingStats.count,
    archiveSize: archiveStats.size,
    archiveCount: archiveStats.count,
    trashSize: trashStats.size,
    trashCount: trashStats.count,
  };
}

export interface DiscoveredSharedFolder {
  id: string;
  name: string;
  sharedBy?: string;
  canEdit: boolean;
}

export async function listSharedWithMeFolders(env: Env): Promise<DiscoveredSharedFolder[]> {
  try {
    const query = "sharedWithMe = true and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    const fields = "files(id,name,owners(displayName,emailAddress),capabilities(canAddChildren))";
    const response = await driveFetch(
      env,
      `/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=50&orderBy=name asc`,
    );
    if (!response || !response.ok) return [];
    const body = (await response.json()) as {
      files?: Array<{
        id: string;
        name: string;
        owners?: Array<{ displayName?: string; emailAddress?: string }>;
        capabilities?: { canAddChildren?: boolean };
      }>;
    };
    return (body.files ?? []).map((f) => {
      const owner = f.owners?.[0];
      let sharedBy: string | undefined;
      if (owner?.displayName && owner?.emailAddress) {
        sharedBy = `${owner.displayName} (${owner.emailAddress})`;
      } else {
        sharedBy = owner?.displayName || owner?.emailAddress;
      }
      return {
        id: f.id,
        name: f.name,
        sharedBy,
        canEdit: f.capabilities?.canAddChildren ?? false,
      };
    });
  } catch {
    return [];
  }
}

export async function listSharedDrives(env: Env): Promise<Array<{ id: string; name: string }>> {
  try {
    const response = await driveFetch(env, "/drive/v3/drives?pageSize=50");
    if (!response || !response.ok) return [];
    const body = (await response.json()) as { drives?: Array<{ id: string; name: string }> };
    return body.drives ?? [];
  } catch {
    return [];
  }
}

export async function listSelfFolders(env: Env): Promise<DiscoveredSharedFolder[]> {
  const selfFolders: DiscoveredSharedFolder[] = [
    {
      id: "root",
      name: "My Drive (Whole Drive)",
      sharedBy: "Personal Drive Root",
      canEdit: true,
    },
  ];
  try {
    const query = "('root' in parents or 'me' in owners) and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
    const fields = "files(id,name,capabilities(canAddChildren))";
    const response = await driveFetch(
      env,
      `/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=50&orderBy=name asc&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    );
    if (!response || !response.ok) return selfFolders;
    const body = (await response.json()) as {
      files?: Array<{
        id: string;
        name: string;
        capabilities?: { canAddChildren?: boolean };
      }>;
    };
    const seen = new Set<string>(["root"]);
    for (const f of body.files ?? []) {
      if (seen.has(f.id)) continue;
      seen.add(f.id);
      selfFolders.push({
        id: f.id,
        name: f.name,
        sharedBy: "My Drive",
        canEdit: f.capabilities?.canAddChildren ?? true,
      });
    }
    return selfFolders;
  } catch {
    return selfFolders;
  }
}

export async function searchAccessibleFolders(env: Env, searchQuery: string): Promise<DiscoveredSharedFolder[]> {
  const trimmed = searchQuery.trim();
  if (!trimmed) return [];
  try {
    const query = `mimeType = 'application/vnd.google-apps.folder' and trashed = false and name contains '${escapeDriveQuery(trimmed)}'`;
    const fields = "files(id,name,owners(displayName,emailAddress),capabilities(canAddChildren))";
    const response = await driveFetch(
      env,
      `/drive/v3/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&pageSize=30&orderBy=name asc&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    );
    if (!response || !response.ok) return [];
    const body = (await response.json()) as {
      files?: Array<{
        id: string;
        name: string;
        owners?: Array<{ displayName?: string; emailAddress?: string }>;
        capabilities?: { canAddChildren?: boolean };
      }>;
    };
    return (body.files ?? []).map((f) => {
      const owner = f.owners?.[0];
      let sharedBy: string | undefined;
      if (owner?.displayName && owner?.emailAddress) {
        sharedBy = `${owner.displayName} (${owner.emailAddress})`;
      } else {
        sharedBy = owner?.displayName || owner?.emailAddress || "Google Drive";
      }
      return {
        id: f.id,
        name: f.name,
        sharedBy,
        canEdit: f.capabilities?.canAddChildren ?? false,
      };
    });
  } catch {
    return [];
  }
}



