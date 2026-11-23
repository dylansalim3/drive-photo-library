export type Filter = "all" | "not-sync" | "synced";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  syncStatus: "not-sync" | "synced" | "unknown";
  uploadedBy?: string;
  isVideo: boolean;
  isImage: boolean;
}

export interface AuthStatus {
  configured: boolean;
  authenticated: boolean;
  driveConnected: boolean;
  driveError?: string;
  username?: string;
  role?: string;
  rootFolderId?: string;
  rootFolderName?: string;
  googleEmail?: string;
  googleDisplayName?: string;
}

export interface DriveConfigResponse {
  rootFolderId: string;
  rootFolderName?: string;
  googleEmail?: string;
  googleDisplayName?: string;
}

export interface AppUser {
  id: number;
  username: string;
  role: string;
  createdAt: number;
}

export interface Breadcrumb {
  id: string;
  name: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  parentId?: string;
  itemCount?: number;
  syncStatus: "not-sync" | "synced" | "unknown";
}

export interface FilesResponse {
  currentFolderId: string;
  currentFolderName: string;
  breadcrumbs: Breadcrumb[];
  subfolders: DriveFolder[];
  files: DriveFile[];
  filter: Filter;
  inboxFolder: string;
  archiveFolder: string;
  folderReady: boolean;
}

export interface ManifestFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  downloadUrl: string;
}

export interface ManifestResponse {
  filter: Filter;
  count: number;
  generatedAt: string;
  note: string;
  files: ManifestFile[];
}

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

async function readError(response: Response): Promise<ApiError> {
  let code = "REQUEST_FAILED";
  let message = `Request failed (${response.status})`;
  try {
    const body = (await response.json()) as { error?: string; message?: string };
    if (body.error) code = body.error;
    if (body.message) message = body.message;
  } catch {
    // Keep the generic message when the body is not JSON.
  }
  return new ApiError(code, message, response.status);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as T;
}

export async function getStatus(): Promise<AuthStatus> {
  return request<AuthStatus>("/api/auth/status");
}

export async function login(username: string, password: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

export async function logout(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/auth/logout", { method: "POST" });
}

export async function listFiles(filter: Filter, search: string, folderId?: string): Promise<FilesResponse> {
  const params = new URLSearchParams({ filter });
  if (search.trim()) params.set("search", search.trim());
  if (folderId) params.set("folderId", folderId);
  return request<FilesResponse>(`/api/files?${params.toString()}`);
}

export async function createFolder(
  nameOrPath: string,
  parentId?: string,
): Promise<{ ok: boolean; folder: DriveFolder }> {
  const isPath = nameOrPath.includes("/");
  return request<{ ok: boolean; folder: DriveFolder }>("/api/folders", {
    method: "POST",
    body: JSON.stringify(isPath ? { path: nameOrPath, parentId } : { name: nameOrPath, parentId }),
  });
}

export async function markFolderSynced(id: string): Promise<{ ok: boolean; syncStatus: string; movedCount: number }> {
  return request<{ ok: boolean; syncStatus: string; movedCount: number }>(
    `/api/folders/${encodeURIComponent(id)}/mark-synced`,
    { method: "POST" },
  );
}

export async function getManifest(): Promise<ManifestResponse> {
  return request<ManifestResponse>("/api/download-manifest?filter=not-sync");
}

export async function markSynced(id: string): Promise<{ ok: boolean; syncStatus: string }> {
  return request<{ ok: boolean; syncStatus: string }>(`/api/files/${encodeURIComponent(id)}/mark-synced`, {
    method: "POST",
  });
}

/** Real upload progress via XHR. Resolves only when the server confirms the Drive file. */
export function uploadFile(
  file: File,
  onProgress: (percent: number, processing: boolean) => void,
  folderId?: string,
  folderPath?: string,
): Promise<{ ok: boolean; file: DriveFile }> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    if (folderId) form.append("folderId", folderId);
    if (folderPath) form.append("folderPath", folderPath);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.withCredentials = true;
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent, percent >= 100);
      }
    };
    xhr.onload = () => {
      try {
        const body = JSON.parse(xhr.responseText) as
          | { ok: boolean; file: DriveFile }
          | { error?: string; message?: string };
        if (xhr.status >= 200 && xhr.status < 300 && "file" in body) {
          resolve(body as { ok: boolean; file: DriveFile });
        } else {
          const err = body as { error?: string; message?: string };
          reject(new ApiError(err.error ?? "UPLOAD_FAILED", err.message ?? `Upload failed (${xhr.status})`, xhr.status));
        }
      } catch {
        reject(new ApiError("UPLOAD_FAILED", `Upload failed (${xhr.status})`, xhr.status));
      }
    };
    xhr.onerror = () => reject(new ApiError("UPLOAD_FAILED", "Upload failed: network error", 0));
    xhr.send(form);
  });
}

export function formatBytes(value?: string): string {
  const bytes = Number(value ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatDate(value?: string): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export async function listAppUsers(): Promise<AppUser[]> {
  const data = await request<{ ok: boolean; users: AppUser[] }>("/api/users");
  return data.users;
}

export async function createAppUser(
  username: string,
  pass: string,
  role: string = "user",
): Promise<AppUser> {
  const data = await request<{ ok: boolean; user: AppUser }>("/api/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password: pass, role }),
  });
  return data.user;
}

export async function deleteAppUser(id: number): Promise<void> {
  await request<{ ok: boolean }>(`/api/users/${id}`, {
    method: "DELETE",
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await request<{ ok: boolean }>("/api/users/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function getDriveConfig(): Promise<DriveConfigResponse> {
  return request<DriveConfigResponse>("/api/drive/config");
}

export async function setSharedRootFolder(folderInput: string): Promise<{
  ok: boolean;
  rootFolderId: string;
  rootFolderName: string;
  message: string;
}> {
  return request<{
    ok: boolean;
    rootFolderId: string;
    rootFolderName: string;
    message: string;
  }>("/api/drive/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ folderInput }),
  });
}

export async function resetRootFolder(): Promise<{
  ok: boolean;
  rootFolderId: string;
  rootFolderName: string;
  message: string;
}> {
  return request<{
    ok: boolean;
    rootFolderId: string;
    rootFolderName: string;
    message: string;
  }>("/api/drive/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resetDefault: true }),
  });
}

export interface TreeFileItem {
  id: string;
  name: string;
  path: string;
  size?: string;
  mimeType: string;
}

export interface TreeResponse {
  ok: boolean;
  folderId?: string;
  folderName: string;
  count: number;
  items: TreeFileItem[];
}

export async function getFileTree(options?: {
  folderId?: string;
  filter?: "not-sync" | "all" | "synced";
}): Promise<TreeResponse> {
  const params = new URLSearchParams();
  if (options?.folderId) params.set("folderId", options.folderId);
  if (options?.filter) params.set("filter", options.filter);
  const qs = params.toString();
  return request<TreeResponse>(`/api/tree${qs ? `?${qs}` : ""}`);
}
