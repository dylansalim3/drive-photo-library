import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  RiCheckLine,
  RiCloseLine,
  RiComputerLine,
  RiDownloadLine,
  RiFolderAddLine,
  RiFolderLine,
  RiLogoutBoxLine,
  RiMoonLine,
  RiRefreshLine,
  RiSettings3Line,
  RiStopCircleLine,
  RiSunLine,
} from "@remixicon/react";
import { Avatar } from "@/components/base/avatar/avatar";
import { Chip } from "@/components/base/badges/chip";
import { Button } from "@/components/base/buttons/button";
import { Divider } from "@/components/base/divider/divider";
import { FileUpload } from "@/components/base/file-upload/file-upload";
import { Input } from "@/components/base/input/input";
import { Tab, TabList, Tabs } from "@/components/base/tabs/tabs";
import { cx } from "@/utils/cx";
import { DriveHeader } from "./components/drive/DriveHeader";
import { BreadcrumbsBar } from "./components/drive/BreadcrumbsBar";
import { FolderItems } from "./components/drive/FolderItems";
import { MediaGrid } from "./components/drive/MediaGrid";
import { MediaList } from "./components/drive/MediaList";
import { MediaSortFilterBar } from "./components/drive/MediaSortFilterBar";
import { MediaViewerModal } from "./components/drive/MediaViewerModal";
import { MobileFabSheet } from "./components/drive/MobileFabSheet";
import { UserManagerSection } from "./components/drive/UserManagerSection";
import {
  filterAndSortFiles,
  type DateGroupingMode,
  type MediaTypeFilter,
  type SortOption,
} from "./utils/dateGrouping";
import {
  applyTheme,
  getStoredTheme,
  initThemeListener,
  setStoredTheme,
  type ThemeMode,
} from "./utils/theme";
import {
  ApiError,
  createFolder,
  formatBytes,
  getManifest,
  getStatus,
  listFiles,
  login,
  logout,
  markFolderSynced,
  markSynced,
  uploadFile,
  type AuthStatus,
  type Breadcrumb,
  type DriveFile,
  type DriveFolder,
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
  folderPath?: string;
  targetFolderId?: string;
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

function ThemeToggleBar({
  themeMode,
  onThemeChange,
}: {
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
}) {
  return (
    <div className="flex items-center gap-1 rounded-2xl border border-border-button-default bg-background-primary-default p-1">
      <button
        type="button"
        title="Light theme"
        onClick={() => onThemeChange("light")}
        className={cx(
          "flex size-8 items-center justify-center rounded-xl transition-colors outline-none",
          themeMode === "light"
            ? "bg-background-secondary-default text-text-primary shadow-sm"
            : "text-text-secondary hover:text-text-primary",
        )}
      >
        <RiSunLine className="size-4" />
      </button>
      <button
        type="button"
        title="Dark theme"
        onClick={() => onThemeChange("dark")}
        className={cx(
          "flex size-8 items-center justify-center rounded-xl transition-colors outline-none",
          themeMode === "dark"
            ? "bg-background-secondary-default text-text-primary shadow-sm"
            : "text-text-secondary hover:text-text-primary",
        )}
      >
        <RiMoonLine className="size-4" />
      </button>
      <button
        type="button"
        title="Follow system"
        onClick={() => onThemeChange("system")}
        className={cx(
          "flex size-8 items-center justify-center rounded-xl transition-colors outline-none",
          themeMode === "system"
            ? "bg-background-secondary-default text-text-primary shadow-sm"
            : "text-text-secondary hover:text-text-primary",
        )}
      >
        <RiComputerLine className="size-4" />
      </button>
    </div>
  );
}

function LoginScreen({
  status,
  onLoggedIn,
  themeMode,
  onThemeChange,
}: {
  status: AuthStatus;
  onLoggedIn: () => void;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
}) {
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
      <div className="flex items-center justify-between pb-4">
        <div>
          <p className="text-title-1-medium text-text-primary">Drive Photo Library</p>
          <p className="mt-1 text-body-2-regular text-text-secondary">Stream-only · no auto-download</p>
        </div>
        <ThemeToggleBar themeMode={themeMode} onThemeChange={onThemeChange} />
      </div>
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

function DriveSetupScreen({
  status,
  onRetry,
  themeMode,
  onThemeChange,
}: {
  status: AuthStatus;
  onRetry: () => void;
  themeMode: ThemeMode;
  onThemeChange: (mode: ThemeMode) => void;
}) {
  const notConfigured = status.driveError === "NOT_CONFIGURED";
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-4 py-8">
      <div className="flex items-center justify-between pb-4">
        <div>
          <p className="text-title-1-medium text-text-primary">Connect Google Drive</p>
          <p className="mt-1 text-body-2-regular text-text-secondary">Google OAuth authorization</p>
        </div>
        <ThemeToggleBar themeMode={themeMode} onThemeChange={onThemeChange} />
      </div>
      <div className="mt-4 flex flex-col gap-4">
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
              Google tokens stay on the server; the browser only holds an encrypted session cookie.
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
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [subfolders, setSubfolders] = useState<DriveFolder[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [filesError, setFilesError] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [selected, setSelected] = useState<DriveFile | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    try {
      return (localStorage.getItem("drive-view-mode") as "grid" | "list") || "grid";
    } catch {
      return "grid";
    }
  });
  const [sortOption, setSortOption] = useState<SortOption>(() => {
    try {
      return (localStorage.getItem("drive-sort-option") as SortOption) || "date-desc";
    } catch {
      return "date-desc";
    }
  });
  const [mediaTypeFilter, setMediaTypeFilter] = useState<MediaTypeFilter>("all");
  const [dateGrouping, setDateGrouping] = useState<DateGroupingMode>(() => {
    try {
      return (localStorage.getItem("drive-date-grouping") as DateGroupingMode) || "grouped";
    } catch {
      return "grouped";
    }
  });
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [marking, setMarking] = useState(false);
  const [manifestBusy, setManifestBusy] = useState(false);
  const [manifestNotice, setManifestNotice] = useState<string | null>(null);

  // Settings & Theme
  const [showSettings, setShowSettings] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getStoredTheme());

  // New folder dialog state
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  // Batch download state
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [batchDownloadProgress, setBatchDownloadProgress] = useState<{ current: number; total: number } | null>(null);
  const cancelBatchDownload = useRef(false);

  const queueProcessing = useRef(false);
  const folderCache = useRef<Record<string, string>>({});

  const handleViewModeChange = (mode: "grid" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem("drive-view-mode", mode);
    } catch {}
  };

  const handleSortChange = (newSort: SortOption) => {
    setSortOption(newSort);
    try {
      localStorage.setItem("drive-sort-option", newSort);
    } catch {}
  };

  const handleDateGroupingChange = (mode: DateGroupingMode) => {
    setDateGrouping(mode);
    try {
      localStorage.setItem("drive-date-grouping", mode);
    } catch {}
  };

  const processedFiles = filterAndSortFiles(files, mediaTypeFilter, sortOption);

  const handleSelectFile = (file: DriveFile, index: number) => {
    setSelected(file);
    setSelectedIndex(index);
  };

  const handleViewerNavigate = (index: number) => {
    if (index >= 0 && index < processedFiles.length) {
      setSelectedIndex(index);
      setSelected(processedFiles[index]);
    }
  };

  const handleCloseViewer = () => {
    setSelected(null);
    setSelectedIndex(null);
  };

  const handleSingleDownload = (file: DriveFile) => {
    const anchor = document.createElement("a");
    anchor.href = `/api/media/file?id=${encodeURIComponent(file.id)}&download=1`;
    anchor.download = file.name;
    anchor.click();
  };

  const handleMarkSelectedSynced = async (fileId: string) => {
    setMarking(true);
    try {
      await markSynced(fileId);
      setSelected((current) => (current ? { ...current, syncStatus: "synced" } : current));
      setFiles((current) =>
        current.map((f) => (f.id === fileId ? { ...f, syncStatus: "synced" } : f)),
      );
      void refreshFiles();
    } catch (err) {
      setFilesError(err instanceof Error ? err.message : "Could not mark as synced.");
    } finally {
      setMarking(false);
    }
  };

  useEffect(() => {
    applyTheme(themeMode);
    return initThemeListener(() => {
      applyTheme(getStoredTheme());
    });
  }, [themeMode]);

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    setStoredTheme(mode);
  };

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
      const data = await listFiles(filter, debouncedSearch, currentFolderId);
      setFiles(data.files);
      setSubfolders(data.subfolders ?? []);
      setBreadcrumbs(data.breadcrumbs ?? []);
      setFilesError(null);
    } catch (err) {
      if (err instanceof ApiError && err.code === "DRIVE_NOT_CONNECTED") {
        void refreshStatus();
        setFilesError("Drive is not connected. Connect Drive to see your library.");
      } else {
        setFilesError(err instanceof Error ? err.message : "Could not load files.");
      }
      setFiles([]);
      setSubfolders([]);
    } finally {
      setLoadingFiles(false);
    }
  }, [status?.authenticated, status?.driveConnected, filter, debouncedSearch, currentFolderId, refreshStatus]);

  useEffect(() => {
    void refreshFiles();
  }, [refreshFiles]);

  // Sequential queue: resolves folder paths as needed, uploads one file at a time
  useEffect(() => {
    if (queueProcessing.current) return;
    const next = queue.find((item) => item.status === "queued");
    if (!next) return;
    queueProcessing.current = true;

    setQueue((current) =>
      current.map((item) => (item.key === next.key ? { ...item, status: "uploading", progress: 0 } : item)),
    );

    (async () => {
      let targetId = next.targetFolderId;
      if (!targetId && next.folderPath) {
        const cacheKey = `${currentFolderId ?? "root"}:${next.folderPath}`;
        if (folderCache.current[cacheKey]) {
          targetId = folderCache.current[cacheKey];
        } else {
          setQueue((current) =>
            current.map((item) =>
              item.key === next.key ? { ...item, status: "processing", progress: 10 } : item,
            ),
          );
          try {
            const folderRes = await createFolder(next.folderPath, currentFolderId);
            targetId = folderRes.folder.id;
            folderCache.current[cacheKey] = targetId;
          } catch {
            targetId = currentFolderId;
          }
        }
      }

      return uploadFile(
        next.file,
        (percent, processing) => {
          setQueue((current) =>
            current.map((item) =>
              item.key === next.key
                ? { ...item, status: processing ? "processing" : "uploading", progress: percent }
                : item,
            ),
          );
        },
        targetId,
      );
    })()
      .then((result) => {
        setQueue((current) =>
          current.map((item) =>
            item.key === next.key
              ? { ...item, status: "confirmed", progress: 100, driveId: result.file.id }
              : item,
          ),
        );
        setUploadNotice(`${next.file.name} is confirmed in Drive, tagged not-sync.`);
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
  }, [queue, refreshFiles, currentFolderId]);

  // Prefetch neighbours of open file for instant next/prev browsing
  useEffect(() => {
    if (!selected) return;
    const connection = (
      navigator as Navigator & { connection?: { saveData?: boolean } }
    ).connection;
    if (connection?.saveData) return;
    const index = processedFiles.findIndex((file) => file.id === selected.id);
    if (index === -1) return;
    for (const neighbour of [processedFiles[index - 1], processedFiles[index + 1]]) {
      if (!neighbour || neighbour.isVideo) continue;
      const image = new Image();
      image.src = `/api/media/file?id=${encodeURIComponent(neighbour.id)}`;
    }
  }, [selected, processedFiles]);

  const addToQueue = useCallback((picked: File[]) => {
    setUploadNotice(null);
    setQueue((current) => [
      ...current,
      ...picked.map((file, index) => {
        let folderPath: string | undefined = undefined;
        if (file.webkitRelativePath) {
          const parts = file.webkitRelativePath.split("/");
          if (parts.length > 1) {
            folderPath = parts.slice(0, parts.length - 1).join("/");
          }
        }
        return {
          key: `${Date.now()}-${index}-${file.name}-${file.size}`,
          file,
          folderPath,
          targetFolderId: folderPath ? undefined : currentFolderId,
          status: "queued" as QueueStatus,
          progress: 0,
        };
      }),
    ]);
  }, [currentFolderId]);

  const handleCreateFolderSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    setFolderError(null);
    try {
      await createFolder(newFolderName.trim(), currentFolderId);
      setNewFolderName("");
      setShowNewFolder(false);
      await refreshFiles();
    } catch (err) {
      setFolderError(err instanceof Error ? err.message : "Could not create folder.");
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleMarkFolderSynced = async (folderId: string) => {
    setMarking(true);
    try {
      const res = await markFolderSynced(folderId);
      setUploadNotice(`Folder and its contents (${res.movedCount} items) marked as synced.`);
      await refreshFiles();
    } catch (err) {
      setUploadNotice(err instanceof Error ? err.message : "Could not sync folder.");
    } finally {
      setMarking(false);
    }
  };

  const handleBatchDownload = async () => {
    const notSyncFiles = files.filter((f) => f.syncStatus === "not-sync");
    if (notSyncFiles.length === 0) return;
    setBatchDownloading(true);
    cancelBatchDownload.current = false;
    setBatchDownloadProgress({ current: 0, total: notSyncFiles.length });

    for (let i = 0; i < notSyncFiles.length; i++) {
      if (cancelBatchDownload.current) break;
      const file = notSyncFiles[i];
      setBatchDownloadProgress({ current: i + 1, total: notSyncFiles.length });

      const anchor = document.createElement("a");
      anchor.href = `/api/media/file?id=${encodeURIComponent(file.id)}&download=1`;
      anchor.download = file.name;
      anchor.click();

      await new Promise((r) => setTimeout(r, 250));
    }

    setBatchDownloading(false);
    setBatchDownloadProgress(null);
  };

  const handleMarkAllSynced = async () => {
    const notSync = files.filter((file) => file.syncStatus === "not-sync");
    if (notSync.length === 0) return;
    setMarking(true);
    try {
      for (const file of notSync) {
        await markSynced(file.id);
      }
      setUploadNotice(`${notSync.length} file(s) marked as synced.`);
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
    return (
      <LoginScreen
        status={status}
        onLoggedIn={() => void refreshStatus()}
        themeMode={themeMode}
        onThemeChange={handleThemeChange}
      />
    );
  }

  if (!status.driveConnected) {
    return (
      <DriveSetupScreen
        status={status}
        onRetry={() => void refreshStatus()}
        themeMode={themeMode}
        onThemeChange={handleThemeChange}
      />
    );
  }

  const confirmedCount = queue.filter((item) => item.status === "confirmed").length;
  const activeUploadIndex = queue.findIndex((item) => item.status === "uploading" || item.status === "processing");
  const currentFolderName = breadcrumbs[breadcrumbs.length - 1]?.name ?? (filter === "synced" ? "Travel Archive" : "Travel Inbox");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col px-3 sm:px-6 pb-24 pt-3 sm:pt-6">
      {/* Sticky Google Drive Header with Search and View Mode Switcher */}
      <DriveHeader
        username={status.username}
        search={search}
        onSearchChange={setSearch}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        onOpenSettings={() => setShowSettings(true)}
        onSignOut={() => {
          void logout().finally(() => void refreshStatus());
        }}
      />

      {/* Filter Tabs & Navigation Bar */}
      <div className="mt-3 flex flex-col gap-2">
        <Tabs
          selectedKey={filter}
          onSelectionChange={(key) => {
            setFilter(key as Filter);
            setCurrentFolderId(undefined);
          }}
          aria-label="Library filter"
        >
          <TabList aria-label="Library filter">
            <Tab id="not-sync">Not-sync</Tab>
            <Tab id="synced">Synced</Tab>
            <Tab id="all">All</Tab>
          </TabList>
        </Tabs>

        {/* Drive Breadcrumbs Bar with Back Navigation & Refresh */}
        <BreadcrumbsBar
          breadcrumbs={breadcrumbs}
          currentFolderName={currentFolderName}
          onNavigate={(targetId) => setCurrentFolderId(targetId)}
          onRefresh={() => void refreshFiles()}
          loading={loadingFiles}
        />
      </div>

      {/* Upload Dropzone (Desktop view) */}
      <section aria-label="Upload" className="mt-3">
        <div className="hidden sm:block rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-body-medium font-semibold text-text-primary">Upload from this trip</p>
              <p className="text-caption-1-regular text-text-secondary">
                Upload photos, videos, or full folders into{" "}
                <span className="font-semibold text-text-primary">{currentFolderName}</span>.
              </p>
            </div>
            <Button
              variant="secondary"
              size="small"
              leadingIcon={RiFolderAddLine}
              onClick={() => setShowNewFolder((v) => !v)}
            >
              New folder
            </Button>
          </div>

          <div className="mt-3">
            <FileUpload
              multiple
              onFilesSelected={addToQueue}
              allowedExtensions={[...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]}
              maxBytes={1024 * 1024 * 1024}
            />
          </div>
        </div>

        {/* New Folder Inline Form (Triggered from Desktop or Mobile FAB) */}
        {showNewFolder && (
          <form
            onSubmit={handleCreateFolderSubmit}
            className="mt-3 flex flex-col gap-3 rounded-2xl border border-border-button-default bg-background-primary-default p-4 sm:flex-row sm:items-end shadow-xs"
          >
            <div className="flex-1">
              <Input
                label={`Create subfolder inside ${currentFolderName}`}
                placeholder="e.g. Kyoto Day 1"
                value={newFolderName}
                onChange={setNewFolderName}
                autoFocus
              />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="primary" size="small" type="submit" disabled={creatingFolder || !newFolderName.trim()}>
                {creatingFolder ? "Creating…" : "Create folder"}
              </Button>
              <Button variant="ghost" size="small" onClick={() => setShowNewFolder(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}
        {folderError && <div className="mt-2"><ErrorBanner message={folderError} /></div>}

        {/* Upload Queue Progress */}
        {queue.length > 0 && (
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-body-medium text-text-primary">
                Upload queue:{" "}
                {activeUploadIndex >= 0 ? `Uploading ${activeUploadIndex + 1} of ${queue.length}` : "Completed"}
                {confirmedCount > 0 ? ` · ${confirmedCount} confirmed` : ""}
              </p>
            </div>
            {queue.map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border-button-default bg-background-primary-default p-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-body-medium text-text-primary">
                    {item.folderPath ? `${item.folderPath}/` : ""}
                    {item.file.name}
                  </p>
                  <p className="text-body-2-regular text-text-secondary">
                    {formatBytes(String(item.file.size))}
                    {item.status === "uploading" ? ` · ${item.progress}%` : ""}
                    {item.status === "processing" ? " · Processing folder in Drive…" : ""}
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

      {/* Not-sync download options notice */}
      {filter === "not-sync" && (
        <div className="mt-3">
          <Notice title="Download options for not-sync media">
            <p>
              Download files in bulk directly here, or save the manifest for unattended bulk download on your home PC.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="primary"
                size="small"
                leadingIcon={RiDownloadLine}
                disabled={batchDownloading || files.filter((f) => f.syncStatus === "not-sync").length === 0}
                onClick={() => void handleBatchDownload()}
              >
                {batchDownloading && batchDownloadProgress
                  ? `Downloading ${batchDownloadProgress.current}/${batchDownloadProgress.total}…`
                  : `Batch download (${files.filter((f) => f.syncStatus === "not-sync").length} files)`}
              </Button>
              {batchDownloading && (
                <Button
                  variant="ghost"
                  size="small"
                  leadingIcon={RiStopCircleLine}
                  onClick={() => {
                    cancelBatchDownload.current = true;
                  }}
                >
                  Cancel
                </Button>
              )}
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
        <div className="mt-3">
          <ErrorBanner message={filesError} />
        </div>
      )}

      {/* Library Content Section */}
      <section aria-label="Drive Items" className="mt-4 flex flex-col gap-4">
        {/* Subfolders */}
        <FolderItems
          folders={subfolders}
          viewMode={viewMode}
          onSelectFolder={(id) => setCurrentFolderId(id)}
          onMarkFolderSynced={handleMarkFolderSynced}
          marking={marking}
        />

        {/* Media Files */}
        {loadingFiles && files.length === 0 && subfolders.length === 0 ? (
          <p className="mt-6 text-body-regular text-text-secondary text-center py-8">Loading library…</p>
        ) : files.length === 0 && subfolders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border-button-default p-8 text-center bg-background-primary-default/50">
            <RiFolderLine className="mx-auto size-10 text-text-tertiary" />
            <p className="mt-2 text-body-medium font-medium text-text-primary">No files or folders found</p>
            <p className="mt-1 text-body-2-regular text-text-secondary">
              Upload photos, videos, or folders from your device.
            </p>
          </div>
        ) : (
          files.length > 0 && (
            <div className="flex flex-col gap-3">
              <MediaSortFilterBar
                mediaTypeFilter={mediaTypeFilter}
                onMediaTypeFilterChange={setMediaTypeFilter}
                sortOption={sortOption}
                onSortOptionChange={handleSortChange}
                dateGrouping={dateGrouping}
                onDateGroupingChange={handleDateGroupingChange}
                totalCount={files.length}
              />

              {processedFiles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border-button-default p-6 text-center text-text-secondary">
                  <p className="text-body-medium">No matching files found for the selected filter.</p>
                </div>
              ) : viewMode === "grid" ? (
                <MediaGrid
                  files={processedFiles}
                  onSelectFile={handleSelectFile}
                  dateGrouping={dateGrouping}
                />
              ) : (
                <MediaList
                  files={processedFiles}
                  onSelectFile={handleSelectFile}
                  onDownloadFile={handleSingleDownload}
                  dateGrouping={dateGrouping}
                />
              )}
            </div>
          )
        )}
      </section>

      {/* Mobile Floating Action Button (FAB) & Slide-Up Sheet */}
      <MobileFabSheet
        onNewFolder={() => setShowNewFolder(true)}
        onFilesSelected={addToQueue}
      />

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-border-button-default">
              <div className="flex items-center gap-2">
                <RiSettings3Line className="size-5 text-text-primary" />
                <p className="text-title-3-semibold text-text-primary">Settings</p>
              </div>
              <Button
                variant="ghost"
                size="small"
                iconOnly
                leadingIcon={RiCloseLine}
                aria-label="Close settings"
                onClick={() => setShowSettings(false)}
              />
            </div>

            <div className="mt-5 flex flex-col gap-5">
              {/* Theme Settings */}
              <div>
                <p className="text-body-medium font-semibold text-text-primary">Theme</p>
                <p className="text-body-2-regular text-text-secondary mt-0.5">
                  Select your appearance preference
                </p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleThemeChange("light")}
                    className={cx(
                      "flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-body-2-medium transition-colors outline-none",
                      themeMode === "light"
                        ? "border-accent-500 bg-background-secondary-default text-text-primary ring-2 ring-accent-500/20"
                        : "border-border-button-default hover:bg-background-secondary-default text-text-secondary",
                    )}
                  >
                    <RiSunLine className="size-5" />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange("dark")}
                    className={cx(
                      "flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-body-2-medium transition-colors outline-none",
                      themeMode === "dark"
                        ? "border-accent-500 bg-background-secondary-default text-text-primary ring-2 ring-accent-500/20"
                        : "border-border-button-default hover:bg-background-secondary-default text-text-secondary",
                    )}
                  >
                    <RiMoonLine className="size-5" />
                    <span>Dark</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleThemeChange("system")}
                    className={cx(
                      "flex flex-col items-center justify-center gap-1.5 p-3 rounded-2xl border text-body-2-medium transition-colors outline-none",
                      themeMode === "system"
                        ? "border-accent-500 bg-background-secondary-default text-text-primary ring-2 ring-accent-500/20"
                        : "border-border-button-default hover:bg-background-secondary-default text-text-secondary",
                    )}
                  >
                    <RiComputerLine className="size-5" />
                    <span>System</span>
                  </button>
                </div>
              </div>

              <Divider />

              {/* Account Session Status */}
              <div>
                <p className="text-body-medium font-semibold text-text-primary">Account Session</p>
                <div className="mt-2 flex items-center justify-between p-3 rounded-2xl border border-border-button-default bg-background-secondary-default">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar initials={status.username ? status.username.slice(0, 1).toUpperCase() : "U"} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-body-medium font-medium text-text-primary">
                        {status.username ? status.username : "Signed in"}
                      </p>
                      <p className="text-caption-1-regular text-text-secondary">Active web session</p>
                    </div>
                  </div>
                  <Chip variant="caption" color="lime">Active</Chip>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="secondary"
                    size="small"
                    leadingIcon={RiLogoutBoxLine}
                    onClick={() => {
                      void logout().finally(() => {
                        setShowSettings(false);
                        void refreshStatus();
                      });
                    }}
                  >
                    Sign out
                  </Button>
                </div>
              </div>

              <Divider />

              {/* User Accounts Management (D1) */}
              <UserManagerSection status={status} />

              <Divider />

              {/* Google Drive Status */}
              <div>
                <p className="text-body-medium font-semibold text-text-primary">Google Drive Connection</p>
                <div className="mt-2 flex items-center justify-between p-3 rounded-2xl border border-border-button-default bg-background-secondary-default">
                  <div className="min-w-0">
                    <p className="text-body-medium text-text-primary">Drive API</p>
                    <p className="text-caption-1-regular text-text-secondary truncate">
                      Root: {status.rootFolderId ?? "1XaVTeYnE79682ZTJzi7FYOH3D5siPZTb"}
                    </p>
                  </div>
                  <Chip variant="caption" color={status.driveConnected ? "lime" : "rose"}>
                    {status.driveConnected ? "Connected" : "Disconnected"}
                  </Chip>
                </div>
                {!status.driveConnected && (
                  <div className="mt-3">
                    <Button
                      variant="primary"
                      size="small"
                      onClick={() => {
                        window.location.href = "/api/auth/drive/connect";
                      }}
                    >
                      Connect Drive
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Swipeable Media Lightbox / Inspector */}
      {selected && selectedIndex !== null && (
        <MediaViewerModal
          files={processedFiles}
          currentIndex={selectedIndex}
          onNavigate={handleViewerNavigate}
          onClose={handleCloseViewer}
          onDownload={handleSingleDownload}
          onMarkSynced={handleMarkSelectedSynced}
          marking={marking}
        />
      )}
    </main>
  );
}
