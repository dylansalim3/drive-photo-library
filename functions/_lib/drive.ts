import { decryptText, encryptText } from "./crypto";
import type { Env } from "./types";

export const INBOX_FOLDER = "Travel Inbox";
export const ARCHIVE_FOLDER = "Travel Archive";
export const DEFAULT_ROOT_FOLDER_ID = "1XaVTeYnE79682ZTJzi7FYOH3D5siPZTb";

export function getRootFolderId(env: Env): string | undefined {
  return env.DRIVE_ROOT_FOLDER_ID?.trim() || DEFAULT_ROOT_FOLDER_ID;
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
}

export interface DriveFileOut {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  syncStatus: "not-sync" | "synced" | "unknown";
  isVideo: boolean;
  isImage: boolean;
}

export function toDriveFile(
  file: DriveFileRaw,
  archiveId?: string | null,
  rootId?: string | null,
): DriveFileOut {
  const raw = file.properties?.["syncStatus"];
  const syncStatus: DriveFileOut["syncStatus"] =
    raw === "not-sync"
      ? "not-sync"
      : raw === "synced"
        ? "synced"
        : (archiveId && file.parents?.includes(archiveId)) ||
            (rootId && file.parents?.includes(rootId))
          ? "synced"
          : "unknown";
  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: file.size,
    createdTime: file.createdTime,
    modifiedTime: file.modifiedTime,
    syncStatus,
    isVideo: file.mimeType.startsWith("video/"),
    isImage: file.mimeType.startsWith("image/"),
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
  const response = await fetch(`https://www.googleapis.com${path}`, {
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
      "files(id,name,mimeType,size,createdTime,modifiedTime,parents,properties,thumbnailLink)",
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
  const parentIdTarget = parentId !== undefined ? parentId : getRootFolderId(env);
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
): Promise<string | null> {
  const parentIdTarget = parentId !== undefined ? parentId : getRootFolderId(env);
  const existing = await findFolder(env, name, parentIdTarget);
  if (existing) return existing.id;
  const payload: { name: string; mimeType: string; parents?: string[] } = {
    name,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentIdTarget) {
    payload.parents = [parentIdTarget];
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
  const rootId = getRootFolderId(env);
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
