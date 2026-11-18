import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  RiCheckLine,
  RiCloseLine,
  RiDownloadLine,
  RiFolderLine,
  RiImageLine,
  RiLogoutBoxLine,
  RiRefreshLine,
  RiSearchLine,
  RiVideoLine,
} from "@remixicon/react";
import { Avatar } from "@/components/base/avatar/avatar";
import { Chip } from "@/components/base/badges/chip";
import { Button } from "@/components/base/buttons/button";
import { Divider } from "@/components/base/divider/divider";
import { FileUpload } from "@/components/base/file-upload/file-upload";
import { Input } from "@/components/base/input/input";
import { Tab, TabList, Tabs } from "@/components/base/tabs/tabs";
import {
  ApiError,
  formatBytes,
  formatDate,
  getManifest,
  getStatus,
  listFiles,
  login,
  logout,
  markSynced,
  uploadFile,
  type AuthStatus,
  type DriveFile,
  type Filter,
} from "./api";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif", "gif", "avif", "bmp", "tiff"] as const;
const VIDEO_EXTENSIONS = [
  "mp4", "mov", "m4v", "mkv", "avi", "webm", "3gp", "3g2", "m2ts", "mts", "wmv",
] as const;

type QueueStatus = "queued" | "uploading" | "processing" | "confirmed" | "failed";

interface QueueItem {
  key: string;
  file: File;
  status: QueueStatus;
  progress: number;
  error?: string;
  driveId?: string;
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-border-error-default bg-background-tertiary-error p-3">
      <p className="text-body-medium text-text-error-primary">{message}</p>
    </div>
  );
}

function Notice({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-3xl border border-border-button-default bg-background-primary-default p-4">
      <p className="text-title-3-semibold text-text-primary">{title}</p>
      <div className="mt-2 flex flex-col gap-2 text-body-regular text-text-secondary">{children}</div>
    </div>
  );
}

function LoginScreen({ status, onLoggedIn }: { status: AuthStatus; onLoggedIn: () => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(username, password);
      onLoggedIn();
    } catch (err) {
      if (err instanceof ApiError && err.code === "NOT_CONFIGURED") {
        setError(
          "Login is not configured yet. The site owner must set APP_USER and APP_PASS as Cloudflare Pages secrets and redeploy. No login will succeed until then.",
        );
      } else if (err instanceof ApiError && err.status === 401) {
        setError("Wrong username or password.");
      } else {
        setError(err instanceof Error ? err.message : "Login failed.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-8">
      <p className="text-title-1-medium text-text-primary">Drive Photo Library</p>
      <p className="mt-2 text-body-regular text-text-secondary">
        Stream-only viewer for your Drive photos and videos. Nothing downloads to this phone unless you
        tap Download.
      </p>
      <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
        <Input
          label="Username"
          placeholder="Username"
          autoComplete="username"
          value={username}
          onChange={setUsername}
          isRequired
        />
        <Input
          label="Password"
          placeholder="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={setPassword}
          isRequired
        />
        {error && <ErrorBanner message={error} />}
        {!status.configured && (
          <Notice title="Setup needed">
            <p>
              This site has no login configured yet. Set the APP_USER and APP_PASS Pages secrets, then
              redeploy. This screen will never pretend a login succeeded.
            </p>
          </Notice>
        )}
        <Button type="submit" variant="primary" disabled={busy || !username || !password}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </main>
  );
}

function DriveSetupScreen({ status, onRetry }: { status: AuthStatus; onRetry: () => void }) {
  const notConfigured = status.driveError === "NOT_CONFIGURED";
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-8">
      <p className="text-title-1-medium text-text-primary">Connect Google Drive</p>
      <p className="mt-2 text-body-regular text-text-secondary">
        You are signed in, but no Drive library is connected yet. The library appears only after a real
        Drive connection — this screen does not show sample photos.
      </p>
      <div className="mt-6 flex flex-col gap-4">
        {notConfigured ? (
          <Notice title="Google credentials not configured">
            <p>
              Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET as Cloudflare Pages secrets and redeploy,
              then connect Drive. The Google OAuth redirect to register is:
            </p>
            <p className="text-body-medium text-text-primary">
              https://drive-photo-library.pages.dev/api/auth/drive/callback
            </p>
          </Notice>
        ) : (
          <Notice title="Drive not connected">
            <p>Connect your Google account to read and upload to your Drive Travel folders.</p>
            <p>
              The app asks for Drive access because photos batch-uploaded outside this app still need
              to be readable here. Google tokens stay on the server; the browser only holds a session
              cookie.
            </p>
          </Notice>
        )}
        {!notConfigured && (
          <Button
            variant="primary"
            onClick={() => {
              window.location.href = "/api/auth/drive/connect";
            }}
          >
            Connect Google Drive
          </Button>
        )}
        <Button variant="secondary" leadingIcon={RiRefreshLine} onClick={onRetry}>
          Check again
        </Button>
      </div>
    </main>
  );
}

function QueueChip({ status }: { status: QueueStatus }) {
  if (status === "confirmed") return <Chip variant="caption" color="lime">Confirmed</Chip>;
  if (status === "failed") return <Chip variant="caption" color="rose">Failed</Chip>;
  if (status === "processing") return <Chip variant="caption" color="yellow">Processing</Chip>;
  if (status === "uploading") return <Chip variant="caption" color="blue">Uploading</Chip>;
  return <Chip variant="caption" color="soft">Queued</Chip>;
}

export default function App() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("not-sync");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selected, setSelected] = useState<DriveFile | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [manifestBusy, setManifestBusy] = useState(false);
  const [manifestNotice, setManifestNotice] = useState<string | null>(null);
  const queueProcessing = useRef(false);

  const refreshStatus = useCallback(async () => {
    try {
      setStatus(await getStatus());
      setStatusError(null);
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : "Could not check login status.");
    }
  }, []);

  useEffect(() => {
    void refreshStatus();
  }, [refreshStatus]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  const refreshFiles = useCallback(async () => {
    if (!status?.authenticated || !status.driveConnected) return;
    setLoadingFiles(true);
    try {
      const data = await listFiles(filter, debouncedSearch);
      setFiles(data.files);
      setFilesError(null);
    } catch (err) {
      if (err instanceof ApiError && err.code === "DRIVE_NOT_CONNECTED") {
        void refreshStatus();
        setFilesError("Drive is not connected. Connect Drive to see your library.");
      } else {
        setFilesError(err instanceof Error ? err.message : "Could not load files.");
      }
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  }, [status?.authenticated, status?.driveConnected, filter, debouncedSearch, refreshStatus]);

  useEffect(() => {
    void refreshFiles();
  }, [refreshFiles]);

  // Sequential queue: one real upload at a time, in the order picked.
  useEffect(() => {
    if (queueProcessing.current) return;
    const next = queue.find((item) => item.status === "queued");
    if (!next) return;
    queueProcessing.current = true;
    setQueue((current) =>
      current.map((item) => (item.key === next.key ? { ...item, status: "uploading", progress: 0 } : item)),
    );
    void uploadFile(next.file, (percent, processing) => {
      setQueue((current) =>
        current.map((item) =>
          item.key === next.key
            ? { ...item, status: processing ? "processing" : "uploading", progress: percent }
            : item,
        ),
      );
    })
      .then((result) => {
        setQueue((current) =>
          current.map((item) =>
            item.key === next.key
              ? { ...item, status: "confirmed", progress: 100, driveId: result.file.id }
              : item,
          ),
        );
        setUploadNotice(
          `${next.file.name} is confirmed in Drive, tagged not-sync. It is safe to include it in your home download list.`,
        );
        void refreshFiles();
      })
      .catch((err: unknown) => {
        setQueue((current) =>
          current.map((item) =>
            item.key === next.key
              ? { ...item, status: "failed", error: err instanceof Error ? err.message : "Upload failed." }
              : item,
          ),
        );
      })
      .finally(() => {
        queueProcessing.current = false;
      });
  }, [queue, refreshFiles]);

  // Prefetch the neighbours of the open file so the next tap opens instantly
  // on a slow connection. Browser cache only — nothing is saved offline, and
  // videos are skipped (they already use preload="metadata").
  useEffect(() => {
    if (!selected) return;
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    if (connection?.saveData) return;
    const index = files.findIndex((file) => file.id === selected.id);
    if (index === -1) return;
    for (const neighbour of [files[index - 1], files[index + 1]]) {
      if (!neighbour || neighbour.isVideo) continue;
      const image = new Image();
      image.src = `/api/media/file?id=${encodeURIComponent(neighbour.id)}`;
    }
  }, [selected, files]);

  const addToQueue = useCallback((picked: File[]) => {
    setUploadNotice(null);
    setQueue((current) => [
      ...current,
      ...picked.map((file, index) => ({
        key: `${Date.now()}-${index}-${file.name}-${file.size}`,
        file,
        status: "queued" as QueueStatus,
        progress: 0,
      })),
    ]);
  }, []);

  const handleMarkAllSynced = async () => {
    const notSync = files.filter((file) => file.syncStatus === "not-sync");
    if (notSync.length === 0) return;
    setMarking(true);
    try {
      for (const file of notSync) {
        await markSynced(file.id);
      }
      setUploadNotice(`${notSync.length} file(s) marked as synced and moved to Travel Archive.`);
      await refreshFiles();
    } catch (err) {
      setUploadNotice(err instanceof Error ? err.message : "Could not mark all files as synced.");
    } finally {
      setMarking(false);
    }
  };

  const handleDownloadManifest = async () => {
    setManifestBusy(true);
    setManifestNotice(null);
    try {
      const manifest = await getManifest();
      const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "drive-not-sync-manifest.json";
      anchor.click();
      URL.revokeObjectURL(url);
      setManifestNotice(
        `Manifest saved (${manifest.count} not-sync file(s)). This JSON is only the list — download the actual photos and videos from a computer at home, not from this phone.`,
      );
    } catch (err) {
      setManifestNotice(err instanceof Error ? err.message : "Could not download the manifest.");
    } finally {
      setManifestBusy(false);
    }
  };

  if (!status) {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4">
        <p className="text-body-regular text-text-secondary">{statusError ?? "Loading…"}</p>
      </main>
    );
  }

  if (!status.authenticated) {
    return <LoginScreen status={status} onLoggedIn={() => void refreshStatus()} />;
  }

  if (!status.driveConnected) {
    return <DriveSetupScreen status={status} onRetry={() => void refreshStatus()} />;
  }

  const confirmedCount = queue.filter((item) => item.status === "confirmed").length;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-8 pt-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar initials="D" size="md" />
          <div>
            <p className="text-title-2-medium text-text-primary">Drive Photo Library</p>
            <p className="text-body-2-regular text-text-secondary">Stream-only · no auto-download</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="small"
          iconOnly
          leadingIcon={RiLogoutBoxLine}
          aria-label="Sign out"
          onClick={() => {
            void logout().finally(() => void refreshStatus());
          }}
        />
      </header>

      <Divider className="my-4" />

      <section aria-label="Upload">
        <p className="text-title-3-semibold text-text-primary">Upload from this trip</p>
        <p className="mt-1 text-body-2-regular text-text-secondary">
          Pick photos and videos. Uploads through this page go to Travel Inbox and are tagged not-sync.
          Files you batch-upload from your computer do not get the tag.
        </p>
        <div className="mt-3">
          <FileUpload
            multiple
            onFilesSelected={addToQueue}
            allowedExtensions={[...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]}
            maxBytes={1024 * 1024 * 1024}
          />
        </div>
        {queue.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-body-medium text-text-primary">
              Upload queue{confirmedCount > 0 ? ` · ${confirmedCount} confirmed` : ""}
            </p>
            {queue.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border-button-default bg-background-primary-default p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-body-medium text-text-primary">{item.file.name}</p>
                  <p className="text-body-2-regular text-text-secondary">
                    {formatBytes(String(item.file.size))}
                    {item.status === "uploading" ? ` · ${item.progress}%` : ""}
                    {item.status === "processing" ? " · Processing in Drive…" : ""}
                    {item.error ? ` · ${item.error}` : ""}
                  </p>
                </div>
                <QueueChip status={item.status} />
              </div>
            ))}
          </div>
        )}
        {uploadNotice && (
          <div className="mt-3">
            <Notice title="Upload update">
              <p>{uploadNotice}</p>
            </Notice>
          </div>
        )}
      </section>

      <Divider className="my-4" />

      <section aria-label="Library">
        <div className="flex items-center justify-between gap-3">
          <p className="text-title-3-semibold text-text-primary">Library</p>
          <Button variant="secondary" size="small" leadingIcon={RiRefreshLine} onClick={() => void refreshFiles()}>
            Refresh
          </Button>
        </div>

        <div className="mt-3">
          <Input
            label="Search by name"
            placeholder="Search by name"
            leadingIcon={RiSearchLine}
            value={search}
            onChange={setSearch}
          />
        </div>

        <div className="mt-3">
          <Tabs
            selectedKey={filter}
            onSelectionChange={(key) => setFilter(key as Filter)}
            aria-label="Library filter"
          >
            <TabList aria-label="Library filter">
              <Tab id="not-sync">Not-sync</Tab>
              <Tab id="synced">Synced</Tab>
              <Tab id="all">All</Tab>
            </TabList>
          </Tabs>
        </div>

        {filter === "not-sync" && (
          <div className="mt-4">
            <Notice title="Download at home, not from this phone">
              <p>
                Bulk download is done from a computer at home. From here you can save the not-sync
                manifest (the file list) and download single files. The manifest needs your login on
                that computer too.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="small"
                  leadingIcon={RiDownloadLine}
                  disabled={manifestBusy || files.length === 0}
                  onClick={() => void handleDownloadManifest()}
                >
                  {manifestBusy ? "Preparing…" : "Download manifest"}
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  leadingIcon={RiCheckLine}
                  disabled={marking || files.filter((file) => file.syncStatus === "not-sync").length === 0}
                  onClick={() => void handleMarkAllSynced()}
                >
                  {marking ? "Marking…" : "Mark all as synced"}
                </Button>
              </div>
              {manifestNotice && <p>{manifestNotice}</p>}
            </Notice>
          </div>
        )}

        {filesError && (
          <div className="mt-4">
            <ErrorBanner message={filesError} />
          </div>
        )}

        {loadingFiles && files.length === 0 ? (
          <p className="mt-6 text-body-regular text-text-secondary">Loading library…</p>
        ) : files.length === 0 ? (
          <p className="mt-6 text-body-regular text-text-secondary">
            No files in this view yet. Upload from this trip, or batch-upload from your computer to
            Travel Archive for already-synced files.
          </p>
        ) : (
          <>
            <p className="mt-4 text-body-2-regular text-text-secondary">
              {files.length} file(s) in this view. Thumbnails only — full photos and videos load only
              when you tap one.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {files.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => setSelected(file)}
                  className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default text-start outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
                >
                  <img
                    src={`/api/media/thumbnail?id=${encodeURIComponent(file.id)}`}
                    alt={file.name}
                    loading="lazy"
                    decoding="async"
                    className="aspect-square w-full object-cover"
                  />
                  <div className="flex items-start justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-body-medium text-text-primary">{file.name}</p>
                      <p className="text-body-2-regular text-text-secondary">
                        {[formatBytes(file.size), formatDate(file.createdTime)].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                    {file.isVideo ? (
                      <RiVideoLine className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
                    ) : (
                      <RiImageLine className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
                    )}
                  </div>
                  <div className="px-3 pb-3">
                    <Chip
                      variant="caption"
                      color={file.syncStatus === "not-sync" ? "yellow" : file.syncStatus === "synced" ? "lime" : "soft"}
                    >
                      {file.syncStatus === "not-sync" ? "Not-sync" : file.syncStatus === "synced" ? "Synced" : "Unknown"}
                    </Chip>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex flex-col overflow-y-auto bg-background-full">
          <div className="sticky top-0 flex items-center justify-between gap-3 bg-background-full px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-title-3-semibold text-text-primary">{selected.name}</p>
              <p className="text-body-2-regular text-text-secondary">
                {[formatBytes(selected.size), formatDate(selected.createdTime)].filter(Boolean).join(" · ")}
              </p>
            </div>
            <Button
              variant="ghost"
              size="small"
              iconOnly
              leadingIcon={RiCloseLine}
              aria-label="Close viewer"
              onClick={() => setSelected(null)}
            />
          </div>
          <div className="px-4 pb-4">
            {selected.isVideo ? (
              <video
                controls
                preload="metadata"
                playsInline
                src={`/api/media/file?id=${encodeURIComponent(selected.id)}`}
                className="w-full rounded-3xl border border-border-button-default bg-background-primary-default"
              />
            ) : (
              <img
                src={`/api/media/file?id=${encodeURIComponent(selected.id)}`}
                alt={selected.name}
                className="w-full rounded-3xl border border-border-button-default bg-background-primary-default object-contain"
              />
            )}
            <p className="mt-3 flex items-center gap-2 text-body-2-regular text-text-secondary">
              <RiFolderLine className="size-5 shrink-0" aria-hidden />
              This full file loaded only because you tapped it. It is not saved offline.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                variant="primary"
                leadingIcon={RiDownloadLine}
                onClick={() => {
                  const anchor = document.createElement("a");
                  anchor.href = `/api/media/file?id=${encodeURIComponent(selected.id)}&download=1`;
                  anchor.click();
                }}
              >
                Download this file
              </Button>
              {selected.syncStatus === "not-sync" && (
                <Button
                  variant="secondary"
                  leadingIcon={RiCheckLine}
                  disabled={marking}
                  onClick={() => {
                    void markSynced(selected.id)
                      .then(() => {
                        setSelected((current) => (current ? { ...current, syncStatus: "synced" } : current));
                        return refreshFiles();
                      })
                      .catch((err: unknown) => {
                        setFilesError(err instanceof Error ? err.message : "Could not mark as synced.");
                      });
                  }}
                >
                  Mark as synced
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
