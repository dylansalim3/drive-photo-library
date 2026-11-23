import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import {
  RiCheckLine,
  RiCloseLine,
  RiComputerLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiFolderAddLine,
  RiFolderLine,
  RiLogoutBoxLine,
  RiMoonLine,
  RiPauseLine,
  RiPlayLine,
  RiRefreshLine,
  RiSettings3Line,
  RiSunLine,
} from "@remixicon/react";
import { Avatar } from "@/components/base/avatar/avatar";
import { Chip } from "@/components/base/badges/chip";
import { Button } from "@/components/base/buttons/button";
import { Divider } from "@/components/base/divider/divider";
import { FileUpload } from "@/components/base/file-upload/file-upload";
import { Input } from "@/components/base/input/input";
import { AppleDateScrubber } from "./components/drive/AppleDateScrubber";
import { cx } from "@/utils/cx";
import { DriveHeader } from "./components/drive/DriveHeader";
import { BreadcrumbsBar } from "./components/drive/BreadcrumbsBar";
import { FolderItems } from "./components/drive/FolderItems";
import { MediaGrid } from "./components/drive/MediaGrid";
import { MediaList } from "./components/drive/MediaList";
import { MediaSortFilterBar } from "./components/drive/MediaSortFilterBar";
import { MediaViewerModal } from "./components/drive/MediaViewerModal";
import { TravelMap } from "./components/drive/TravelMap";
import { StorageUsageMeter } from "./components/drive/StorageUsageMeter";
import { MobileFabSheet } from "./components/drive/MobileFabSheet";
import { SyncManagerModal } from "./components/drive/SyncManagerModal";
import { UserManagerSection } from "./components/drive/UserManagerSection";
import { SharedFolderConfigSection } from "./components/drive/SharedFolderConfigSection";
import { ChunkedUploader } from "./utils/chunkedUploader";
import {
  filterAndSortFiles,
  groupFilesByDate,
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
  getFileTree,
  getManifest,
  getStatus,
  listFiles,
  login,
  logout,
  markFolderSynced,
  markSynced,
  moveToTrash,
  restoreFromTrash,
  type AuthStatus,
  type Breadcrumb,
  type DriveFile,
  type DriveFolder,
  type Filter,
} from "./api";
import { downloadAsZip, type ZipDownloadProgress } from "./utils/zipDownloader";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "heic", "heif", "gif", "avif", "bmp", "tiff"] as const;
const VIDEO_EXTENSIONS = [
  "mp4", "mov", "m4v", "mkv", "avi", "webm", "3gp", "3g2", "m2ts", "mts", "wmv",
] as const;

type QueueStatus = "queued" | "uploading" | "processing" | "paused" | "confirmed" | "failed";

interface QueueItem {
  key: string;
  file: File;
  folderPath?: string;
  targetFolderId?: string;
  status: QueueStatus;
  progress: number;
  speed?: string;
  error?: string;
  driveId?: string;
  uploader?: ChunkedUploader;
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
  if (status === "paused") return <Chip variant="caption" color="yellow">Paused</Chip>;
  return <Chip variant="caption" color="soft">Queued</Chip>;
}

export default function App() {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("not-sync");
  const [remoteUpdateTag, setRemoteUpdateTag] = useState<string | null>(null);

  useEffect(() => {
    fetch("https://api.github.com/repos/dylansalim3/drive-photo-library/releases/latest")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.tag_name) {
          const cleanTag = data.tag_name.replace(/^v/i, "");
          const current = "1.1.0";
          if (cleanTag !== current) {
            setRemoteUpdateTag(data.tag_name);
          }
        }
      })
      .catch(() => {});
  }, []);
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
  const [viewMode, setViewMode] = useState<"grid" | "list" | "map">(() => {
    try {
      return (localStorage.getItem("drive-view-mode") as "grid" | "list" | "map") || "grid";
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
  const [uploaderFilter, setUploaderFilter] = useState("all");
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
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => getStoredTheme());

  // New folder dialog state
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  // Batch & ZIP download state
  const [batchDownloading, setBatchDownloading] = useState(false);
  const [batchDownloadProgress, setBatchDownloadProgress] = useState<ZipDownloadProgress | null>(null);
  const batchAbortController = useRef<AbortController | null>(null);
  const [downloadingFolderId, setDownloadingFolderId] = useState<string | null>(null);

  // Multi-item selection state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());

  const queueProcessing = useRef(false);
  const folderCache = useRef<Record<string, string>>({});

  const handleViewModeChange = (mode: "grid" | "list" | "map") => {
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

  const uploaders = useMemo(() => {
    const set = new Set<string>();
    for (const f of files) {
      if (f.uploadedBy) set.add(f.uploadedBy);
    }
    return Array.from(set);
  }, [files]);

  const processedFiles = filterAndSortFiles(files, mediaTypeFilter, sortOption, uploaderFilter);

  const dateGroups = useMemo(
    () => (dateGrouping === "grouped" ? groupFilesByDate(processedFiles) : []),
    [dateGrouping, processedFiles],
  );

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

  // Sequential queue: resolves folder paths as needed, uploads one file at a time via ChunkedUploader
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

      const uploader = new ChunkedUploader({
        file: next.file,
        folderId: targetId,
        folderPath: next.folderPath,
        onProgress: (p) => {
          const speedStr = p.speedBytesPerSec > 0 ? `${formatBytes(String(Math.round(p.speedBytesPerSec)))}/s` : undefined;
          setQueue((current) =>
            current.map((item) =>
              item.key === next.key
                ? { ...item, progress: p.percent, speed: speedStr, status: "uploading" }
                : item,
            ),
          );
        },
        onStateChange: (state, err) => {
          if (state === "paused") {
            setQueue((current) =>
              current.map((item) => (item.key === next.key ? { ...item, status: "paused" } : item)),
            );
          } else if (state === "failed") {
            setQueue((current) =>
              current.map((item) =>
                item.key === next.key
                  ? { ...item, status: "failed", error: err?.message || "Upload failed." }
                  : item,
              ),
            );
          }
        },
      });

      setQueue((current) =>
        current.map((item) =>
          item.key === next.key ? { ...item, uploader, status: "uploading" } : item,
        ),
      );

      const result = await uploader.start();
      return result as { id?: string } | undefined;
    })()
      .then((result) => {
        setQueue((current) =>
          current.map((item) =>
            item.key === next.key
              ? { ...item, status: "confirmed", progress: 100, driveId: result?.id }
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

  const handlePauseUpload = (item: QueueItem) => {
    item.uploader?.pause();
    setQueue((current) =>
      current.map((i) => (i.key === item.key ? { ...i, status: "paused" } : i)),
    );
  };

  const handleResumeUpload = (item: QueueItem) => {
    setQueue((current) =>
      current.map((i) => (i.key === item.key ? { ...i, status: "uploading" } : i)),
    );
    void item.uploader?.resume().then((res: any) => {
      setQueue((current) =>
        current.map((i) =>
          i.key === item.key
            ? { ...i, status: "confirmed", progress: 100, driveId: res?.id }
            : i,
        ),
      );
      setUploadNotice(`${item.file.name} is confirmed in Drive, tagged not-sync.`);
      void refreshFiles();
    }).catch((err: unknown) => {
      setQueue((current) =>
        current.map((i) =>
          i.key === item.key
            ? { ...i, status: "failed", error: err instanceof Error ? err.message : "Resume failed." }
            : i,
        ),
      );
    });
  };

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

  const handleToggleSelectFile = (fileId: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
    if (!isSelectMode) setIsSelectMode(true);
  };

  const handleToggleSelectFolder = (folderId: string) => {
    setSelectedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
    if (!isSelectMode) setIsSelectMode(true);
  };

  const handleClearSelection = () => {
    setSelectedFileIds(new Set());
    setSelectedFolderIds(new Set());
    setIsSelectMode(false);
  };

  const handleBatchDownload = async () => {
    setBatchDownloading(true);
    const controller = new AbortController();
    batchAbortController.current = controller;
    setBatchDownloadProgress({
      current: 0,
      total: 1,
      currentFileName: "Scanning pending files and folders…",
      percent: 0,
    });

    try {
      const tree = await getFileTree({ filter: "not-sync" });
      if (tree.items.length === 0) {
        setUploadNotice("No pending files found to download.");
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const zipName = `drive-photos-pending-${today}.zip`;

      await downloadAsZip({
        items: tree.items,
        zipName,
        signal: controller.signal,
        onProgress: (p) => setBatchDownloadProgress(p),
      });

      setUploadNotice(`Downloaded ${tree.items.length} file(s) in ${zipName}!`);
    } catch (err) {
      if (controller.signal.aborted) {
        setUploadNotice("Batch download was cancelled.");
      } else {
        setUploadNotice(err instanceof Error ? err.message : "Failed to download batch ZIP.");
      }
    } finally {
      setBatchDownloading(false);
      setBatchDownloadProgress(null);
      batchAbortController.current = null;
    }
  };

  const handleDownloadFolderZip = async (folder: DriveFolder | { id: string; name: string }) => {
    setDownloadingFolderId(folder.id);
    const controller = new AbortController();
    setUploadNotice(`Scanning folder '${folder.name}'…`);

    try {
      const tree = await getFileTree({ folderId: folder.id });
      if (tree.items.length === 0) {
        setUploadNotice(`Folder '${folder.name}' is empty.`);
        return;
      }

      setUploadNotice(`Zipping ${tree.items.length} files from '${folder.name}'…`);
      await downloadAsZip({
        items: tree.items,
        zipName: `${folder.name}.zip`,
        signal: controller.signal,
      });

      setUploadNotice(`Downloaded '${folder.name}.zip' successfully!`);
    } catch (err) {
      setUploadNotice(err instanceof Error ? err.message : `Failed to download '${folder.name}' ZIP.`);
    } finally {
      setDownloadingFolderId(null);
    }
  };

  const handleDownloadSelectedAsZip = async () => {
    const selectedFiles = files.filter((f) => selectedFileIds.has(f.id));
    const selectedFolders = subfolders.filter((f) => selectedFolderIds.has(f.id));
    const totalSelected = selectedFiles.length + selectedFolders.length;
    if (totalSelected === 0) return;

    setBatchDownloading(true);
    const controller = new AbortController();
    batchAbortController.current = controller;
    setBatchDownloadProgress({
      current: 0,
      total: 1,
      currentFileName: "Preparing selected items…",
      percent: 0,
    });

    try {
      const itemsToZip: Array<{ id: string; name: string; path: string }> = [];

      // 1. Add direct files
      for (const file of selectedFiles) {
        itemsToZip.push({
          id: file.id,
          name: file.name,
          path: file.name,
        });
      }

      // 2. Fetch trees for selected folders
      for (const folder of selectedFolders) {
        setBatchDownloadProgress({
          current: 0,
          total: 1,
          currentFileName: `Scanning '${folder.name}'…`,
          percent: 0,
        });
        const tree = await getFileTree({ folderId: folder.id });
        for (const item of tree.items) {
          itemsToZip.push({
            id: item.id,
            name: item.name,
            path: `${folder.name}/${item.path}`,
          });
        }
      }

      if (itemsToZip.length === 0) {
        setUploadNotice("Selected items contain no downloadable media files.");
        return;
      }

      const today = new Date().toISOString().slice(0, 10);
      const zipName =
        selectedFolders.length === 1 && selectedFiles.length === 0
          ? `${selectedFolders[0].name}.zip`
          : `drive-download-${today}.zip`;

      await downloadAsZip({
        items: itemsToZip,
        zipName,
        signal: controller.signal,
        onProgress: (p) => setBatchDownloadProgress(p),
      });

      setUploadNotice(`Downloaded ${itemsToZip.length} item(s) in ${zipName}!`);
      handleClearSelection();
    } catch (err) {
      if (controller.signal.aborted) {
        setUploadNotice("Download was cancelled.");
      } else {
        setUploadNotice(err instanceof Error ? err.message : "Failed to download selected items as ZIP.");
      }
    } finally {
      setBatchDownloading(false);
      setBatchDownloadProgress(null);
      batchAbortController.current = null;
    }
  };

  const handleSyncSelected = async () => {
    const selectedFiles = files.filter((f) => selectedFileIds.has(f.id));
    const selectedFolders = subfolders.filter((f) => selectedFolderIds.has(f.id));
    const total = selectedFiles.length + selectedFolders.length;
    if (total === 0) return;

    setMarking(true);
    try {
      for (const file of selectedFiles) {
        await markSynced(file.id);
      }
      for (const folder of selectedFolders) {
        await markFolderSynced(folder.id);
      }
      setUploadNotice(`Marked ${total} item(s) as synced.`);
      handleClearSelection();
      await refreshFiles();
    } catch (err) {
      setUploadNotice(err instanceof Error ? err.message : "Failed to sync selected items.");
    } finally {
      setMarking(false);
    }
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

  const [trashing, setTrashing] = useState(false);

  const handleTrashSelected = async () => {
    if (selectedFileIds.size === 0 && selectedFolderIds.size === 0) return;
    setTrashing(true);
    try {
      await moveToTrash(Array.from(selectedFileIds), Array.from(selectedFolderIds));
      handleClearSelection();
      await refreshFiles();
    } catch (err) {
      setUploadNotice(err instanceof Error ? err.message : "Failed to move to trash.");
    } finally {
      setTrashing(false);
    }
  };

  const handleRestoreSelected = async () => {
    if (selectedFileIds.size === 0 && selectedFolderIds.size === 0) return;
    setTrashing(true);
    try {
      await restoreFromTrash(Array.from(selectedFileIds), Array.from(selectedFolderIds));
      handleClearSelection();
      await refreshFiles();
    } catch (err) {
      setUploadNotice(err instanceof Error ? err.message : "Failed to restore items.");
    } finally {
      setTrashing(false);
    }
  };

  const handleTrashFile = async (fileId: string) => {
    setTrashing(true);
    try {
      await moveToTrash([fileId]);
      setSelected(null);
      await refreshFiles();
    } catch (err) {
      setUploadNotice(err instanceof Error ? err.message : "Failed to move to trash.");
    } finally {
      setTrashing(false);
    }
  };

  const handleRestoreFile = async (fileId: string) => {
    setTrashing(true);
    try {
      await restoreFromTrash([fileId]);
      setSelected(null);
      await refreshFiles();
    } catch (err) {
      setUploadNotice(err instanceof Error ? err.message : "Failed to restore file.");
    } finally {
      setTrashing(false);
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
      {/* Remote Web Update Notification Banner */}
      {remoteUpdateTag && (
        <div className="mb-3 flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-caption-1-medium">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>New release <strong>{remoteUpdateTag}</strong> is live on GitHub.</span>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-2.5 py-1 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-caption-1 transition-colors"
          >
            Reload to update
          </button>
        </div>
      )}

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
        onOpenSync={() => setShowSyncModal(true)}
        unsyncedCount={files.filter((f) => f.syncStatus === "not-sync").length}
      />

      {/* Navigation Bar */}
      <div className="mt-3">
        {/* Drive Breadcrumbs Bar with Back Navigation & Refresh */}
        <BreadcrumbsBar
          breadcrumbs={breadcrumbs}
          currentFolderName={currentFolderName}
          onNavigate={(targetId) => {
            handleClearSelection();
            setCurrentFolderId(targetId);
          }}
          onRefresh={() => void refreshFiles()}
          loading={loadingFiles}
          onDownloadFolder={
            currentFolderId
              ? () => void handleDownloadFolderZip({ id: currentFolderId, name: currentFolderName })
              : undefined
          }
          downloadingFolder={downloadingFolderId === currentFolderId}
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
                className="flex flex-col gap-2 rounded-2xl border border-border-button-default bg-background-primary-default p-3 shadow-xs"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-body-medium font-medium text-text-primary">
                      {item.folderPath ? `${item.folderPath}/` : ""}
                      {item.file.name}
                    </p>
                    <p className="text-body-2-regular text-text-secondary">
                      {formatBytes(String(item.file.size))}
                      {item.status === "uploading" ? ` · ${item.progress}%` : ""}
                      {item.speed ? ` · ${item.speed}` : ""}
                      {item.status === "paused" ? ` · Paused at ${item.progress}%` : ""}
                      {item.status === "processing" ? " · Processing folder in Drive…" : ""}
                      {item.error ? ` · ${item.error}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === "uploading" && item.uploader && (
                      <Button
                        variant="ghost"
                        size="small"
                        iconOnly
                        leadingIcon={RiPauseLine}
                        aria-label="Pause upload"
                        onClick={() => handlePauseUpload(item)}
                      />
                    )}
                    {item.status === "paused" && item.uploader && (
                      <Button
                        variant="ghost"
                        size="small"
                        iconOnly
                        leadingIcon={RiPlayLine}
                        aria-label="Resume upload"
                        onClick={() => handleResumeUpload(item)}
                      />
                    )}
                    <QueueChip status={item.status} />
                  </div>
                </div>

                {/* Progress bar for active uploads */}
                {(item.status === "uploading" || item.status === "paused") && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-background-secondary-default">
                    <div
                      className={cx(
                        "h-full transition-all duration-300",
                        item.status === "paused" ? "bg-amber-400" : "bg-accent-500",
                      )}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
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
          onSelectFolder={(id) => {
            handleClearSelection();
            setCurrentFolderId(id);
          }}
          onMarkFolderSynced={handleMarkFolderSynced}
          marking={marking}
          onDownloadFolder={handleDownloadFolderZip}
          downloadingFolderId={downloadingFolderId}
          isSelectMode={isSelectMode}
          selectedFolderIds={selectedFolderIds}
          onToggleSelectFolder={handleToggleSelectFolder}
        />

        {/* Media Files */}
        {loadingFiles && files.length === 0 && subfolders.length === 0 ? (
          <p className="mt-6 text-body-regular text-text-secondary text-center py-8">Loading library…</p>
        ) : files.length === 0 && subfolders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border-button-default p-8 text-center bg-background-primary-default/50">
            <RiFolderLine className="mx-auto size-10 text-text-tertiary" />
            <p className="mt-2 text-body-medium font-medium text-text-primary">
              {filter === "trash" ? "Travel Trash is empty" : "No files or folders found"}
            </p>
            <p className="mt-1 text-body-2-regular text-text-secondary">
              {filter === "trash"
                ? "Items moved to trash will appear here."
                : "Upload photos, videos, or folders from your device."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filter === "trash" && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-text-primary">
                <div className="flex items-center gap-2.5">
                  <RiDeleteBinLine className="size-5 text-amber-500 shrink-0" />
                  <p className="text-body-2-regular">
                    Items in <strong>Travel Trash</strong> are kept until permanently emptied. Restoring moves them back to Travel Inbox.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  size="small"
                  leadingIcon={RiDeleteBinLine}
                  onClick={() => setShowSettings(true)}
                >
                  Storage & Empty Trash
                </Button>
              </div>
            )}

            <MediaSortFilterBar
                mediaTypeFilter={mediaTypeFilter}
                onMediaTypeFilterChange={setMediaTypeFilter}
                sortOption={sortOption}
                onSortOptionChange={handleSortChange}
                dateGrouping={dateGrouping}
                onDateGroupingChange={handleDateGroupingChange}
                totalCount={files.length}
                uploaderFilter={uploaderFilter}
                onUploaderFilterChange={setUploaderFilter}
                uploaders={uploaders}
                filter={filter}
                onFilterChange={(newFilter) => {
                  setFilter(newFilter);
                  handleClearSelection();
                  setCurrentFolderId(undefined);
                }}
                isSelectMode={isSelectMode}
                onToggleSelectMode={() => {
                  if (isSelectMode) {
                    handleClearSelection();
                  } else {
                    setIsSelectMode(true);
                  }
                }}
                selectedCount={selectedFileIds.size + selectedFolderIds.size}
              />

              {processedFiles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border-button-default p-6 text-center text-text-secondary">
                  <p className="text-body-medium">No matching files found for the selected filter.</p>
                </div>
              ) : viewMode === "map" ? (
                <TravelMap
                  files={processedFiles}
                  onSelectFile={(file) => handleSelectFile(file, processedFiles.indexOf(file))}
                />
              ) : viewMode === "grid" ? (
                <MediaGrid
                  files={processedFiles}
                  onSelectFile={handleSelectFile}
                  dateGrouping={dateGrouping}
                  isSelectMode={isSelectMode}
                  selectedFileIds={selectedFileIds}
                  onToggleSelectFile={handleToggleSelectFile}
                />
              ) : (
                <MediaList
                  files={processedFiles}
                  onSelectFile={handleSelectFile}
                  onDownloadFile={handleSingleDownload}
                  dateGrouping={dateGrouping}
                  isSelectMode={isSelectMode}
                  selectedFileIds={selectedFileIds}
                  onToggleSelectFile={handleToggleSelectFile}
                />
              )}
            </div>
        )}
      </section>

      {/* Apple Photos Style Date Scrubber (Right-Hand Side Scrollbar) */}
      <AppleDateScrubber groups={dateGroups} />

      {/* Floating Multi-Item Selection Action Bar (Google Drive style) */}
      {(selectedFileIds.size > 0 || selectedFolderIds.size > 0) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 sm:gap-3 px-4 py-2.5 rounded-2xl sm:rounded-full bg-background-primary-default/95 backdrop-blur-xl border border-border-button-default shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          <span className="text-body-2-semibold text-text-primary whitespace-nowrap">
            {selectedFileIds.size + selectedFolderIds.size} selected
          </span>
          <div className="h-4 w-px bg-border-secondary" />
          {filter === "trash" ? (
            <Button
              variant="primary"
              size="small"
              leadingIcon={RiRefreshLine}
              disabled={trashing}
              onClick={() => void handleRestoreSelected()}
            >
              {trashing ? "Restoring…" : "Restore"}
            </Button>
          ) : (
            <>
              <Button
                variant="primary"
                size="small"
                leadingIcon={RiDownloadLine}
                disabled={batchDownloading}
                onClick={() => void handleDownloadSelectedAsZip()}
              >
                {batchDownloading
                  ? `Zipping (${batchDownloadProgress?.percent ?? 0}%)…`
                  : "Download as ZIP"}
              </Button>
              <Button
                variant="secondary"
                size="small"
                leadingIcon={RiCheckLine}
                disabled={marking}
                onClick={() => void handleSyncSelected()}
              >
                Mark Synced
              </Button>
              <Button
                variant="secondary"
                size="small"
                leadingIcon={RiDeleteBinLine}
                disabled={trashing}
                onClick={() => void handleTrashSelected()}
              >
                {trashing ? "Moving…" : "Move to Trash"}
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="small"
            iconOnly
            leadingIcon={RiCloseLine}
            aria-label="Clear selection"
            onClick={handleClearSelection}
          />
        </div>
      )}

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

              {/* Storage Usage & Trash Quota Breakdown */}
              <StorageUsageMeter
                onTrashEmptied={() => {
                  void refreshFiles();
                }}
              />

              <Divider />

              {/* Google Drive & Shared Folders (Approach A) */}
              <SharedFolderConfigSection
                status={status}
                onFolderChanged={() => {
                  void refreshStatus();
                  setCurrentFolderId(undefined);
                  void refreshFiles();
                }}
              />
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
          onTrash={handleTrashFile}
          onRestore={handleRestoreFile}
        />
      )}

      {/* Vacation Sync & Export Center Modal */}
      <SyncManagerModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
        files={files}
        onBatchDownload={handleBatchDownload}
        batchDownloading={batchDownloading}
        batchProgress={batchDownloadProgress}
        onCancelBatch={() => {
          batchAbortController.current?.abort();
        }}
        onDownloadManifest={handleDownloadManifest}
        manifestBusy={manifestBusy}
        manifestNotice={manifestNotice}
        onMarkAllSynced={handleMarkAllSynced}
        marking={marking}
      />
    </main>
  );
}
