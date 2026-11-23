import { useState, useEffect, type FormEvent } from "react";
import {
  RiCheckLine,
  RiDriveLine,
  RiExternalLinkLine,
  RiFileCopyLine,
  RiFolderSharedLine,
  RiInformationLine,
  RiRefreshLine,
  RiRestartLine,
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

export function SharedFolderConfigSection({
  status,
  onFolderChanged,
}: SharedFolderConfigSectionProps) {
  const isAdmin = status.role === "admin";
  const [config, setConfig] = useState<DriveConfigResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [folderInput, setFolderInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showHowTo, setShowHowTo] = useState(false);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const data = await getDriveConfig();
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

  const activeEmail = config?.googleEmail || status.googleEmail;
  const activeRootId = config?.rootFolderId || status.rootFolderId || "1XaVTeYnE79682ZTJzi7FYOH3D5siPZTb";
  const activeRootName = config?.rootFolderName || status.rootFolderName || "Photos & Videos";

  const handleCopyEmail = () => {
    if (!activeEmail) return;
    void navigator.clipboard.writeText(activeEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnectFolder = async (e: FormEvent) => {
    e.preventDefault();
    if (!folderInput.trim()) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await setSharedRootFolder(folderInput.trim());
      setSuccess(`Connected to '${res.rootFolderName}'! All users will now see and upload to this shared folder.`);
      setFolderInput("");
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
      <div className="flex flex-col gap-2 p-3 rounded-2xl border border-border-button-default bg-background-secondary-default">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <RiFolderSharedLine className="size-4 text-accent-500 shrink-0" />
            <p className="text-body-2-medium font-semibold text-text-primary truncate">
              {activeRootName}
            </p>
          </div>
          <a
            href={`https://drive.google.com/drive/folders/${activeRootId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-caption-1-medium text-text-secondary hover:text-text-primary transition-colors shrink-0"
          >
            <span>Open in Drive</span>
            <RiExternalLinkLine className="size-3.5" />
          </a>
        </div>
        <p className="text-caption-1-regular text-text-secondary font-mono truncate">
          Folder ID: {activeRootId}
        </p>
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
              3. Copy the folder URL or ID, paste it below, and click <strong>Connect Folder</strong>.
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

      {/* Connect Shared Folder Form (Admin Only) */}
      {isAdmin ? (
        <form onSubmit={handleConnectFolder} className="flex flex-col gap-3">
          <Input
            label="Connect External or Shared Drive Folder"
            placeholder="Paste Google Drive folder URL or folder ID"
            value={folderInput}
            onChange={setFolderInput}
            hint="Supports Google Drive folder links, Shared Drives, and raw folder IDs."
          />
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="small"
              leadingIcon={RiRestartLine}
              onClick={handleResetDefault}
              disabled={saving}
            >
              Reset to default
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="small"
              leadingIcon={RiFolderSharedLine}
              disabled={saving || !folderInput.trim()}
            >
              {saving ? "Verifying access..." : "Connect Folder"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-caption-1-regular text-text-secondary">
          Only administrators can change the active Google Drive library folder.
        </p>
      )}
    </div>
  );
}
