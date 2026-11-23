import {
  RiCloseLine,
  RiDownloadCloud2Line,
  RiDownloadLine,
  RiCheckLine,
  RiStopCircleLine,
  RiFileTextLine,
} from "@remixicon/react";
import { Button } from "@/components/base/buttons/button";
import { Chip } from "@/components/base/badges/chip";
import type { DriveFile } from "@/api";

export interface SyncManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  files: DriveFile[];
  onBatchDownload: () => Promise<void>;
  batchDownloading: boolean;
  batchProgress: { current: number; total: number; currentFileName?: string; percent?: number } | null;
  onCancelBatch: () => void;
  onDownloadManifest: () => Promise<void>;
  manifestBusy: boolean;
  manifestNotice: string | null;
  onMarkAllSynced: () => Promise<void>;
  marking: boolean;
}

export function SyncManagerModal({
  isOpen,
  onClose,
  files,
  onBatchDownload,
  batchDownloading,
  batchProgress,
  onCancelBatch,
  onDownloadManifest,
  manifestBusy,
  manifestNotice,
  onMarkAllSynced,
  marking,
}: SyncManagerModalProps) {
  if (!isOpen) return null;

  const notSyncFiles = files.filter((f) => f.syncStatus === "not-sync");
  const notSyncCount = notSyncFiles.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-lg rounded-3xl border border-border-button-default bg-background-primary-default p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border-button-default">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500">
              <RiDownloadCloud2Line className="size-5" />
            </div>
            <div>
              <p className="text-title-3-semibold text-text-primary">Sync & Export Center</p>
              <p className="text-caption-1-regular text-text-secondary">
                For when you have returned home from vacation
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="small"
            iconOnly
            leadingIcon={RiCloseLine}
            aria-label="Close sync modal"
            onClick={onClose}
          />
        </div>

        <div className="mt-5 flex flex-col gap-5">
          {/* Status Overview Card */}
          <div className="rounded-2xl border border-border-button-default bg-background-secondary-default p-4">
            <div className="flex items-center justify-between">
              <span className="text-body-2-medium text-text-secondary">Unsynced Vacation Media</span>
              <Chip variant="caption" color={notSyncCount > 0 ? "yellow" : "lime"}>
                {notSyncCount > 0 ? `${notSyncCount} Pending Home Sync` : "All Synced"}
              </Chip>
            </div>
            <p className="mt-2 text-body-2-regular text-text-secondary">
              During vacation, media stays light and stream-ready in your Drive cloud. Once you are home, use these tools to transfer and archive everything to your personal PC or NAS.
            </p>
          </div>

          {/* Sync Operations */}
          <div className="flex flex-col gap-3.5">
            {/* 1. Batch ZIP Download */}
            <div className="flex flex-col gap-2 rounded-2xl border border-border-button-default bg-background-primary-default p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body-medium font-semibold text-text-primary">
                    Batch ZIP Download (with Folder Hierarchy)
                  </p>
                  <p className="text-caption-1-regular text-text-secondary mt-0.5">
                    Packages and downloads all {notSyncCount} pending photos, videos, and folders into a single organized .zip file, matching Google Drive's folder download.
                  </p>
                </div>
              </div>

              <div className="mt-2 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="primary"
                    size="small"
                    leadingIcon={RiDownloadLine}
                    disabled={batchDownloading || notSyncCount === 0}
                    onClick={() => void onBatchDownload()}
                  >
                    {batchDownloading && batchProgress
                      ? `Zipping ${batchProgress.current}/${batchProgress.total} (${batchProgress.percent ?? Math.round((batchProgress.current / batchProgress.total) * 100)}%)…`
                      : `Download as ZIP (${notSyncCount} files)`}
                  </Button>
                  {batchDownloading && (
                    <Button
                      variant="ghost"
                      size="small"
                      leadingIcon={RiStopCircleLine}
                      onClick={onCancelBatch}
                    >
                      Cancel
                    </Button>
                  )}
                </div>

                {batchDownloading && batchProgress && (
                  <div className="flex flex-col gap-1.5 rounded-xl border border-border-button-default bg-background-secondary-default p-2.5 mt-1">
                    <div className="flex items-center justify-between text-caption-1-regular text-text-secondary">
                      <span className="truncate max-w-[240px] font-mono text-[11px] text-text-primary">
                        {batchProgress.currentFileName || "Preparing files…"}
                      </span>
                      <span className="font-semibold text-accent-500">
                        {batchProgress.percent ?? Math.round((batchProgress.current / batchProgress.total) * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-background-primary-default border border-border-button-default">
                      <div
                        className="h-full bg-accent-500 transition-all duration-200 rounded-full"
                        style={{
                          width: `${batchProgress.percent ?? Math.round((batchProgress.current / batchProgress.total) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Download Manifest for Home Scripting */}
            <div className="flex flex-col gap-2 rounded-2xl border border-border-button-default bg-background-primary-default p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body-medium font-semibold text-text-primary">
                    Unattended Download Manifest (JSON)
                  </p>
                  <p className="text-caption-1-regular text-text-secondary mt-0.5">
                    Generates a structured manifest file with secure direct URLs for automated high-speed downloads via curl, wget, or python on your home computer.
                  </p>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="small"
                  leadingIcon={RiFileTextLine}
                  disabled={manifestBusy || files.length === 0}
                  onClick={() => void onDownloadManifest()}
                >
                  {manifestBusy ? "Preparing manifest…" : "Download manifest (.json)"}
                </Button>
              </div>
              {manifestNotice && (
                <p className="text-caption-1-regular text-text-secondary mt-1">{manifestNotice}</p>
              )}
            </div>

            {/* 3. Mark All As Synced */}
            <div className="flex flex-col gap-2 rounded-2xl border border-border-button-default bg-background-primary-default p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-body-medium font-semibold text-text-primary">
                    Mark All as Synced
                  </p>
                  <p className="text-caption-1-regular text-text-secondary mt-0.5">
                    Clears the "not-sync" status from all items in this library so your vacation inbox stays clean and ready for your next trip.
                  </p>
                </div>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="small"
                  leadingIcon={RiCheckLine}
                  disabled={marking || notSyncCount === 0}
                  onClick={() => void onMarkAllSynced()}
                >
                  {marking ? "Marking…" : "Mark all as synced"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-6 flex justify-end border-t border-border-button-default pt-4">
          <Button variant="ghost" size="small" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
