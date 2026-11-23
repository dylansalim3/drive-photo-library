import { useEffect, useState } from "react";
import {
  RiArchiveLine,
  RiDatabase2Line,
  RiDeleteBinLine,
  RiFolderLine,
  RiRefreshLine,
} from "@remixicon/react";
import { emptyTrash, formatBytes, getStorageBreakdown, type StorageBreakdown } from "@/api";
import { Button } from "@/components/base/buttons/button";

export interface StorageUsageMeterProps {
  onTrashEmptied?: () => void;
}

export function StorageUsageMeter({ onTrashEmptied }: StorageUsageMeterProps) {
  const [data, setData] = useState<StorageBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [emptying, setEmptying] = useState(false);
  const [showConfirmEmpty, setShowConfirmEmpty] = useState(false);

  const fetchStorage = async () => {
    setLoading(true);
    try {
      const res = await getStorageBreakdown();
      setData(res);
    } catch {}
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchStorage();
  }, []);

  const handleEmptyTrash = async () => {
    setEmptying(true);
    try {
      await emptyTrash();
      setShowConfirmEmpty(false);
      await fetchStorage();
      onTrashEmptied?.();
    } catch {}
    finally {
      setEmptying(false);
    }
  };

  if (!data && loading) {
    return (
      <div className="flex items-center justify-center p-6 text-text-secondary">
        <RiRefreshLine className="size-5 animate-spin mr-2" />
        <span className="text-body-2-regular">Loading storage stats…</span>
      </div>
    );
  }

  if (!data) return null;

  const percent = data.usagePercent ?? 0;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border-button-default bg-background-primary-default p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RiDatabase2Line className="size-5 text-accent-500" />
          <p className="text-body-medium font-semibold text-text-primary">Google Drive Storage</p>
        </div>
        <button
          type="button"
          onClick={() => void fetchStorage()}
          disabled={loading}
          aria-label="Refresh storage stats"
          className="rounded-lg p-1 text-text-secondary hover:text-text-primary transition-colors outline-none"
        >
          <RiRefreshLine className={loading ? "size-4 animate-spin" : "size-4"} />
        </button>
      </div>

      {/* Progress Bar & Summary */}
      <div>
        <div className="flex items-center justify-between text-caption-1-medium text-text-secondary pb-1.5">
          <span>
            {formatBytes(data.usage)} of {formatBytes(data.limit)} used
          </span>
          <span className="font-semibold text-text-primary">{percent}%</span>
        </div>
        <div className="h-2.5 w-full rounded-full bg-background-secondary-default overflow-hidden">
          <div
            className="h-full rounded-full bg-accent-500 transition-all duration-500"
            style={{ width: `${Math.min(100, Math.max(2, percent))}%` }}
          />
        </div>
      </div>

      {/* Breakdown Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
        {/* Staging / Inbox */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border-secondary bg-background-secondary-default/50 p-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <RiFolderLine className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-text-tertiary uppercase">Staging (Inbox)</p>
            <p className="text-caption-1-bold text-text-primary truncate">
              {formatBytes(String(data.stagingSize))}
            </p>
            <p className="text-[11px] text-text-secondary">{data.stagingCount} items</p>
          </div>
        </div>

        {/* Archive */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border-secondary bg-background-secondary-default/50 p-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <RiArchiveLine className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-text-tertiary uppercase">Archive</p>
            <p className="text-caption-1-bold text-text-primary truncate">
              {formatBytes(String(data.archiveSize))}
            </p>
            <p className="text-[11px] text-text-secondary">{data.archiveCount} items</p>
          </div>
        </div>

        {/* Trash */}
        <div className="flex items-center gap-2.5 rounded-xl border border-border-secondary bg-background-secondary-default/50 p-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-500">
            <RiDeleteBinLine className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium text-text-tertiary uppercase">Trash</p>
            <p className="text-caption-1-bold text-text-primary truncate">
              {formatBytes(String(data.trashSize))}
            </p>
            <p className="text-[11px] text-text-secondary">{data.trashCount} items</p>
          </div>
          {data.trashCount > 0 && (
            <button
              type="button"
              onClick={() => setShowConfirmEmpty(true)}
              title="Empty trash"
              className="rounded-lg p-1 text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <RiDeleteBinLine className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Empty Trash */}
      {showConfirmEmpty && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-caption-1-medium text-text-primary flex flex-col gap-2">
          <p className="font-semibold text-rose-600 dark:text-rose-400">
            Permanently delete all {data.trashCount} items in Trash?
          </p>
          <p className="text-[12px] text-text-secondary">
            This action cannot be undone. Items in Google Drive trash will be permanently wiped.
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Button
              variant="danger"
              size="small"
              onClick={() => void handleEmptyTrash()}
              disabled={emptying}
            >
              {emptying ? "Emptying…" : "Yes, Empty Trash"}
            </Button>
            <Button
              variant="secondary"
              size="small"
              onClick={() => setShowConfirmEmpty(false)}
              disabled={emptying}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
