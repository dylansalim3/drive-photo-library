import { useState, useEffect } from "react";
import { cx } from "@/utils/cx";
import {
  RiCheckLine,
  RiCloseLine,
  RiDriveLine,
  RiExternalLinkLine,
  RiFileCopyLine,
  RiFolderLine,
  RiFolderSharedLine,
  RiInformationLine,
  RiLink,
  RiRefreshLine,
  RiRestartLine,
  RiSearchLine,
} from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Chip } from "@/components/base/badges/chip";
import {
  getDriveConfig,
  resetRootFolder,
  setSharedRootFolder,
  type AuthStatus,
  type DriveConfigResponse,
} from "@/api";

interface SharedFolderConfigSectionProps {
  status: AuthStatus;
  onFolderChanged?: () => void;
}

function extractFolderId(input: string): string {
  const trimmed = input.trim();
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const driveMatch = trimmed.match(/\/drives\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) return driveMatch[1];
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch) return idParamMatch[1];
  return trimmed;
}

function looksLikeFolderIdOrUrl(input: string): boolean {
  const trimmed = input.trim();
  if (
    trimmed.includes("drive.google.com") ||
    trimmed.includes("/folders/") ||
    trimmed.includes("/drives/")
  ) {
    return true;
  }
  // Drive folder IDs are typically 20-50 alphanumeric characters with dashes/underscores
  if (trimmed.length >= 20 && !trimmed.includes(" ") && /^[a-zA-Z0-9_-]+$/.test(trimmed)) {
    return true;
  }
  return false;
}

export function SharedFolderConfigSection({
  status,
  onFolderChanged,
}: SharedFolderConfigSectionProps) {
  const isAdmin = status.role === "admin";
  const [config, setConfig] = useState<DriveConfigResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);
  const [folderTab, setFolderTab] = useState<"self" | "shared" | "drives">("self");
  const [searchQuery, setSearchQuery] = useState("");

  const isDirectIdOrUrl = looksLikeFolderIdOrUrl(searchQuery);
  const detectedFolderId = isDirectIdOrUrl ? extractFolderId(searchQuery) : "";

  const fetchConfig = async (search?: string) => {
    setLoading(true);
    try {
      const data = await getDriveConfig(search);
      setConfig(data);
    } catch {
      // Use fallback from status
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchConfig();
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      void fetchConfig();
      return;
    }
    if (looksLikeFolderIdOrUrl(trimmed)) {
      // Don't search Google Drive when user pasted a direct ID or URL
      return;
    }
    const timer = setTimeout(() => {
      void fetchConfig(trimmed);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const activeEmail = config?.googleEmail || status.googleEmail;
  const activeRootId = config?.rootFolderId || status.rootFolderId || "1XaVTeYnE79682ZTJzi7FYOH3D5siPZTb";
  const activeRootName = config?.rootFolderName || status.rootFolderName || "Photos & Videos";

  const handleCopyEmail = () => {
    if (!activeEmail) return;
    void navigator.clipboard.writeText(activeEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnectDirect = async (idOrUrl: string) => {
    const folderId = extractFolderId(idOrUrl);
    if (!folderId) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await setSharedRootFolder(folderId);
      setSuccess(`Connected to '${res.rootFolderName}'! All users will now see and upload to this shared folder.`);
      setSearchQuery("");
      await fetchConfig();
      onFolderChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect shared folder.");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = async () => {
    if (!confirm("Reset library root to the default Drive folder?")) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await resetRootFolder();
      setSuccess(res.message);
      await fetchConfig();
      onFolderChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset root folder.");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectDiscoveredFolder = async (folderId: string) => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await setSharedRootFolder(folderId);
      setSuccess(`Active library switched to '${res.rootFolderName}'!`);
      await fetchConfig();
      onFolderChanged?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to switch library folder.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-body-medium font-semibold text-text-primary">Google Drive & Shared Folders</p>
          <p className="text-body-2-regular text-text-secondary">
            Connect external Google accounts or Shared Drives (Approach A)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="small"
            iconOnly
            leadingIcon={RiRefreshLine}
            aria-label="Refresh Drive configuration"
            onClick={() => void fetchConfig()}
            disabled={loading}
          />
          <Chip variant="caption" color={status.driveConnected ? "lime" : "rose"}>
            {status.driveConnected ? "Connected" : "Disconnected"}
          </Chip>
        </div>
      </div>

      {/* Connected Google Account */}
      <div className="flex items-center justify-between p-3 rounded-2xl border border-border-button-default bg-background-secondary-default">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-8 items-center justify-center rounded-xl bg-background-primary-default border border-border-button-default text-accent-500 shrink-0">
            <RiDriveLine className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-body-2-medium font-medium text-text-primary">
              {config?.googleDisplayName || "Connected Google Account"}
            </p>
            <p className="truncate text-caption-1-regular text-text-secondary">
              {activeEmail ?? "No Google account connected"}
            </p>
          </div>
        </div>

        {activeEmail && (
          <Button
            variant="ghost"
            size="small"
            leadingIcon={copied ? RiCheckLine : RiFileCopyLine}
            onClick={handleCopyEmail}
            title="Copy email to share folder"
          >
            {copied ? "Copied" : "Copy email"}
          </Button>
        )}
      </div>

      {!status.driveConnected && (
        <div className="flex justify-end">
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

      {/* Active Root Folder Display */}
      <div className="flex items-center justify-between p-3 rounded-2xl border border-border-button-default bg-background-secondary-default">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <RiFolderSharedLine className="size-4 text-accent-500 shrink-0" />
            <p className="text-body-2-medium font-semibold text-text-primary truncate">
              {activeRootName}
            </p>
          </div>
          <p className="text-caption-1-regular text-text-secondary font-mono truncate">
            Folder ID: {activeRootId}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={`https://drive.google.com/drive/folders/${activeRootId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-caption-1-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            <span>Open</span>
            <RiExternalLinkLine className="size-3.5" />
          </a>
          {isAdmin && (
            <Button
              variant="ghost"
              size="small"
              leadingIcon={RiRestartLine}
              onClick={handleResetDefault}
              disabled={saving}
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* How it works banner */}
      <div className="rounded-2xl border border-border-button-default bg-background-primary-default p-3 text-body-2-regular">
        <button
          type="button"
          onClick={() => setShowHowTo(!showHowTo)}
          className="flex items-center justify-between w-full text-left font-medium text-text-primary outline-none"
        >
          <span className="flex items-center gap-1.5">
            <RiInformationLine className="size-4 text-accent-500" />
            How to connect external Google accounts (Zero Setup)
          </span>
          <span className="text-caption-1-medium text-text-secondary">
            {showHowTo ? "Hide guide" : "Show guide"}
          </span>
        </button>

        {showHowTo && (
          <div className="mt-3 flex flex-col gap-2 pt-2 border-t border-border-button-default text-text-secondary text-caption-1-regular leading-relaxed">
            <p>
              1. In Google Drive, open the folder or Shared Drive you want to use (even from another personal or family Google account).
            </p>
            <p>
              2. Click <strong>Share</strong> and share it with <span className="font-mono text-text-primary">{activeEmail || "the server's Google email"}</span> as an <strong>Editor</strong>.
            </p>
            <p>
              3. Copy the folder URL or ID, paste it into the search box below, and click <strong>Connect</strong>.
            </p>
            <p className="text-accent-500 font-medium">
              Everyone logging into this app will automatically see, view, and upload to this shared library with zero Google setup needed on their phones!
            </p>
          </div>
        )}
      </div>

      {/* Notifications */}
      {error && (
        <div className="rounded-xl border border-border-error-default bg-background-tertiary-error p-2.5 text-body-2-regular text-text-error-primary">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-lime-300 bg-lime-50 dark:border-lime-900/50 dark:bg-lime-950/30 p-2.5 text-body-2-regular text-lime-700 dark:text-lime-300">
          {success}
        </div>
      )}

      {/* Folders Explorer: Self Drive & Shared Folders */}
      <div className="flex flex-col gap-3 pt-3 border-t border-border-button-default">
        <div className="flex items-center justify-between">
          <p className="text-body-2-medium font-semibold text-text-primary">
            Discovered Drives & Folders
          </p>
          <Button
            variant="ghost"
            size="small"
            leadingIcon={RiRefreshLine}
            disabled={loading}
            onClick={() => void fetchConfig(searchQuery.trim() || undefined)}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {/* Unified Search & Connect Input */}
        <div className="relative flex items-center">
          <div className="relative flex-1">
            <Input
              type="text"
              placeholder="Search folders or paste Google Drive link / ID..."
              value={searchQuery}
              onChange={setSearchQuery}
              className={cx(
                "w-full text-caption-1-regular pl-8",
                isDirectIdOrUrl && detectedFolderId ? "pr-28" : searchQuery ? "pr-8" : ""
              )}
            />
            {isDirectIdOrUrl ? (
              <RiLink className="size-4 text-accent-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            ) : (
              <RiSearchLine className="size-4 text-text-secondary absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            )}
          </div>
          {isDirectIdOrUrl && detectedFolderId && (
            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <Button
                variant="primary"
                size="small"
                disabled={saving}
                onClick={() => void handleConnectDirect(detectedFolderId)}
              >
                {saving ? "Connecting..." : "Connect"}
              </Button>
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-1 rounded-md text-text-secondary hover:text-text-primary transition-colors"
                title="Clear"
              >
                <RiCloseLine className="size-4" />
              </button>
            </div>
          )}
          {!isDirectIdOrUrl && searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-md text-text-secondary hover:text-text-primary transition-colors"
              title="Clear"
            >
              <RiCloseLine className="size-4" />
            </button>
          )}
        </div>

        {/* Direct Link Detected Banner */}
        {isDirectIdOrUrl && detectedFolderId && (
          <div className="flex items-center justify-between p-3 rounded-2xl border border-accent-500/30 bg-accent-500/10">
            <div className="flex items-center gap-2.5 min-w-0">
              <RiLink className="size-4 text-accent-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-body-2-medium font-semibold text-text-primary">
                  Direct Folder Link / ID Detected
                </p>
                <p className="font-mono text-caption-1-regular text-text-secondary truncate">
                  {detectedFolderId}
                </p>
              </div>
            </div>
            <Button
              variant="primary"
              size="small"
              disabled={saving}
              onClick={() => void handleConnectDirect(detectedFolderId)}
            >
              {saving ? "Connecting..." : "Connect Now"}
            </Button>
          </div>
        )}

        {/* Tab switcher (when not searching and not direct ID) */}
        {!searchQuery.trim() && (
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-background-secondary-default border border-border-button-default">
            <button
              type="button"
              onClick={() => setFolderTab("self")}
              className={cx(
                "flex-1 py-1 px-2.5 rounded-lg text-caption-1-medium transition-colors text-center",
                folderTab === "self"
                  ? "bg-accent-500 text-white font-medium"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              My Drive ({config?.selfFolders?.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setFolderTab("shared")}
              className={cx(
                "flex-1 py-1 px-2.5 rounded-lg text-caption-1-medium transition-colors text-center",
                folderTab === "shared"
                  ? "bg-accent-500 text-white font-medium"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              Shared with Me ({config?.sharedFolders?.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setFolderTab("drives")}
              className={cx(
                "flex-1 py-1 px-2.5 rounded-lg text-caption-1-medium transition-colors text-center",
                folderTab === "drives"
                  ? "bg-accent-500 text-white font-medium"
                  : "text-text-secondary hover:text-text-primary"
              )}
            >
              Shared Drives ({config?.sharedDrives?.length ?? 0})
            </button>
          </div>
        )}

        {/* Folder items */}
        {searchQuery.trim() && !isDirectIdOrUrl ? (
          /* Search Results */
          <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
            <p className="text-caption-1-medium text-text-secondary">
              Search results for "{searchQuery.trim()}":
            </p>
            {config?.searchResults && config.searchResults.length > 0 ? (
              config.searchResults.map((folder) => {
                const isCurrent = folder.id === activeRootId;
                return (
                  <div
                    key={folder.id}
                    className={cx(
                      "flex items-center justify-between gap-3 p-3 rounded-2xl border transition-colors",
                      isCurrent
                        ? "border-accent-500 bg-accent-500/10"
                        : "border-border-button-default bg-background-secondary-default hover:border-border-button-hover"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <RiFolderLine className="size-4 text-accent-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-body-2-medium font-medium text-text-primary">
                            {folder.name}
                          </p>
                          <Chip
                            variant="caption"
                            color={folder.canEdit ? "lime" : "yellow"}
                          >
                            {folder.canEdit ? "Editor" : "View Only"}
                          </Chip>
                        </div>
                        <p className="truncate text-caption-1-regular text-text-secondary">
                          {folder.sharedBy ? `Owner: ${folder.sharedBy}` : folder.id}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isCurrent ? (
                        <Chip variant="caption" color="lime">Active</Chip>
                      ) : (
                        <Button
                          variant="secondary"
                          size="small"
                          disabled={saving}
                          onClick={() => void handleSelectDiscoveredFolder(folder.id)}
                        >
                          Select
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-4 rounded-2xl border border-dashed border-border-button-default bg-background-secondary-default/50 text-center">
                <p className="text-caption-1-regular text-text-secondary">
                  {loading
                    ? "Searching Google Drive..."
                    : `No folders found matching "${searchQuery.trim()}".`}
                </p>
              </div>
            )}
          </div>
        ) : folderTab === "self" ? (
          /* My Drive Folders */
          <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
            {config?.selfFolders && config.selfFolders.length > 0 ? (
              config.selfFolders.map((folder) => {
                const isCurrent = folder.id === activeRootId;
                return (
                  <div
                    key={folder.id}
                    className={cx(
                      "flex items-center justify-between gap-3 p-3 rounded-2xl border transition-colors",
                      isCurrent
                        ? "border-accent-500 bg-accent-500/10"
                        : "border-border-button-default bg-background-secondary-default hover:border-border-button-hover"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <RiFolderLine className="size-4 text-accent-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-body-2-medium font-medium text-text-primary">
                            {folder.name}
                          </p>
                          <Chip variant="caption" color="lime">
                            Personal
                          </Chip>
                        </div>
                        <p className="truncate text-caption-1-regular text-text-secondary">
                          {folder.sharedBy || folder.id}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isCurrent ? (
                        <Chip variant="caption" color="lime">Active</Chip>
                      ) : (
                        <Button
                          variant="secondary"
                          size="small"
                          disabled={saving}
                          onClick={() => void handleSelectDiscoveredFolder(folder.id)}
                        >
                          Select
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-3 rounded-2xl border border-dashed border-border-button-default bg-background-secondary-default/50 text-center">
                <p className="text-caption-1-regular text-text-secondary">
                  No personal folders found in your Google Drive.
                </p>
              </div>
            )}
          </div>
        ) : folderTab === "shared" ? (
          /* Shared with Me Folders */
          <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
            {config?.sharedFolders && config.sharedFolders.length > 0 ? (
              config.sharedFolders.map((folder) => {
                const isCurrent = folder.id === activeRootId;
                return (
                  <div
                    key={folder.id}
                    className={cx(
                      "flex items-center justify-between gap-3 p-3 rounded-2xl border transition-colors",
                      isCurrent
                        ? "border-accent-500 bg-accent-500/10"
                        : "border-border-button-default bg-background-secondary-default hover:border-border-button-hover"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <RiFolderSharedLine className="size-4 text-accent-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-body-2-medium font-medium text-text-primary">
                            {folder.name}
                          </p>
                          <Chip
                            variant="caption"
                            color={folder.canEdit ? "lime" : "yellow"}
                          >
                            {folder.canEdit ? "Editor" : "View Only"}
                          </Chip>
                        </div>
                        <p className="truncate text-caption-1-regular text-text-secondary">
                          {folder.sharedBy ? `Shared by ${folder.sharedBy}` : folder.id}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isCurrent ? (
                        <Chip variant="caption" color="lime">Active</Chip>
                      ) : (
                        <Button
                          variant="secondary"
                          size="small"
                          disabled={saving}
                          onClick={() => void handleSelectDiscoveredFolder(folder.id)}
                        >
                          Select
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-3 rounded-2xl border border-dashed border-border-button-default bg-background-secondary-default/50 text-center">
                <p className="text-caption-1-regular text-text-secondary">
                  No external folders shared with you yet. Ask friends or family to share a Google Drive folder with{" "}
                  <span className="font-mono text-text-primary">{activeEmail}</span> as Editor.
                </p>
              </div>
            )}
          </div>
        ) : (
          /* Shared Drives */
          <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
            {config?.sharedDrives && config.sharedDrives.length > 0 ? (
              config.sharedDrives.map((drive) => {
                const isCurrent = drive.id === activeRootId;
                return (
                  <div
                    key={drive.id}
                    className={cx(
                      "flex items-center justify-between gap-3 p-3 rounded-2xl border transition-colors",
                      isCurrent
                        ? "border-accent-500 bg-accent-500/10"
                        : "border-border-button-default bg-background-secondary-default hover:border-border-button-hover"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <RiDriveLine className="size-4 text-accent-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-body-2-medium font-medium text-text-primary">
                            {drive.name}
                          </p>
                          <Chip variant="caption" color="blue">
                            Shared Drive
                          </Chip>
                        </div>
                        <p className="truncate text-caption-1-regular text-text-secondary">
                          {drive.id}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0">
                      {isCurrent ? (
                        <Chip variant="caption" color="lime">Active</Chip>
                      ) : (
                        <Button
                          variant="secondary"
                          size="small"
                          disabled={saving}
                          onClick={() => void handleSelectDiscoveredFolder(drive.id)}
                        >
                          Select
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-3 rounded-2xl border border-dashed border-border-button-default bg-background-secondary-default/50 text-center">
                <p className="text-caption-1-regular text-text-secondary">
                  No Google Workspace Shared Drives discovered.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
