import { useEffect, useRef, useState, type TouchEvent } from "react";
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCheckLine,
  RiCloseLine,
  RiDownloadLine,
  RiFolderLine,
  RiImageLine,
  RiVideoLine,
} from "@remixicon/react";
import { formatBytes, formatDate, type DriveFile } from "@/api";
import { cx } from "@/utils/cx";

export interface MediaViewerModalProps {
  files: DriveFile[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
  onDownload: (file: DriveFile) => void;
  onMarkSynced?: (fileId: string) => Promise<void>;
  marking?: boolean;
}

export function MediaViewerModal({
  files,
  currentIndex,
  onNavigate,
  onClose,
  onDownload,
  onMarkSynced,
  marking,
}: MediaViewerModalProps) {
  const file = files[currentIndex];
  const total = files.length;

  const [loadingMedia, setLoadingMedia] = useState(true);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);

  // Keyboard navigation: Left/Right arrows, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      } else if (e.key === "ArrowRight" && currentIndex < total - 1) {
        onNavigate(currentIndex + 1);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentIndex, total, onNavigate, onClose]);

  // Reset loading indicator when switching files
  useEffect(() => {
    setLoadingMedia(true);
  }, [file?.id]);

  if (!file) return null;

  // Touch swipe handling
  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    touchEndRef.current = null;
  };

  const handleTouchMove = (e: TouchEvent) => {
    const touch = e.touches[0];
    touchEndRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;
    const diffX = touchEndRef.current.x - touchStartRef.current.x;
    const diffY = touchEndRef.current.y - touchStartRef.current.y;

    // Horizontal swipe threshold
    if (Math.abs(diffX) > 45 && Math.abs(diffX) > Math.abs(diffY)) {
      if (diffX < 0 && currentIndex < total - 1) {
        // Swiped left -> next
        onNavigate(currentIndex + 1);
      } else if (diffX > 0 && currentIndex > 0) {
        // Swiped right -> prev
        onNavigate(currentIndex - 1);
      }
    } else if (diffY > 80 && Math.abs(diffY) > Math.abs(diffX)) {
      // Swiped down -> close viewer
      onClose();
    }

    touchStartRef.current = null;
    touchEndRef.current = null;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={file.name}
      className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 backdrop-blur-2xl text-white select-none animate-in fade-in duration-200"
    >
      {/* Top Glass Header Bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between gap-3 bg-gradient-to-b from-black/80 to-transparent p-4 pb-6">
        <div className="min-w-0 flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20">
            {file.isVideo ? <RiVideoLine className="size-4" /> : <RiImageLine className="size-4" />}
          </div>
          <div className="min-w-0">
            <p className="truncate text-body-medium font-semibold text-white drop-shadow-xs">
              {file.name}
            </p>
            <p className="text-caption-1-regular text-white/70 truncate drop-shadow-xs">
              {[formatBytes(file.size), formatDate(file.createdTime), file.uploadedBy ? `Uploaded by @${file.uploadedBy}` : null]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close viewer"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 hover:bg-white/20 hover:text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white"
        >
          <RiCloseLine className="size-5" />
        </button>
      </div>

      {/* Main Media Viewport with Touch Drag */}
      <div
        className="relative flex flex-1 items-center justify-center px-4 overflow-hidden touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Desktop Previous Arrow */}
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={() => onNavigate(currentIndex - 1)}
            aria-label="Previous item"
            className="hidden sm:flex absolute left-4 z-20 size-12 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white hover:bg-black/75 hover:scale-105 active:scale-95 transition-all outline-none"
          >
            <RiArrowLeftSLine className="size-6" />
          </button>
        )}

        {/* Media Content */}
        <div className="relative flex max-h-[75vh] max-w-full items-center justify-center">
          {file.isVideo ? (
            <video
              key={file.id}
              controls
              preload="metadata"
              playsInline
              src={`/api/media/file?id=${encodeURIComponent(file.id)}`}
              onLoadedData={() => setLoadingMedia(false)}
              className="max-h-[72vh] max-w-full rounded-2xl border border-white/10 bg-black/60 shadow-2xl object-contain outline-none"
            />
          ) : (
            <img
              key={file.id}
              src={`/api/media/file?id=${encodeURIComponent(file.id)}`}
              alt={file.name}
              onLoad={() => setLoadingMedia(false)}
              className="max-h-[72vh] max-w-full rounded-2xl border border-white/10 bg-black/60 shadow-2xl object-contain"
            />
          )}

          {/* Loading Indicator */}
          {loadingMedia && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30 backdrop-blur-xs">
              <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            </div>
          )}
        </div>

        {/* Desktop Next Arrow */}
        {currentIndex < total - 1 && (
          <button
            type="button"
            onClick={() => onNavigate(currentIndex + 1)}
            aria-label="Next item"
            className="hidden sm:flex absolute right-4 z-20 size-12 items-center justify-center rounded-full bg-black/50 backdrop-blur-md border border-white/20 text-white hover:bg-black/75 hover:scale-105 active:scale-95 transition-all outline-none"
          >
            <RiArrowRightSLine className="size-6" />
          </button>
        )}
      </div>

      {/* Floating iOS/Lenso UI Liquid Glass Bottom Dock */}
      <div className="sticky bottom-0 z-20 flex flex-col items-center justify-center gap-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2">
        <div className="flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3.5 py-1.5 backdrop-blur-xl shadow-2xl text-white">
          {/* Mobile Prev */}
          <button
            type="button"
            onClick={() => onNavigate(currentIndex - 1)}
            disabled={currentIndex === 0}
            aria-label="Previous item"
            className="flex size-8 items-center justify-center rounded-full text-white/80 hover:text-white disabled:opacity-30 transition-colors outline-none"
          >
            <RiArrowLeftSLine className="size-5" />
          </button>

          {/* Counter */}
          <span className="px-2 text-caption-1-medium text-white/90 select-none">
            {currentIndex + 1} / {total}
          </span>

          {/* Mobile Next */}
          <button
            type="button"
            onClick={() => onNavigate(currentIndex + 1)}
            disabled={currentIndex === total - 1}
            aria-label="Next item"
            className="flex size-8 items-center justify-center rounded-full text-white/80 hover:text-white disabled:opacity-30 transition-colors outline-none"
          >
            <RiArrowRightSLine className="size-5" />
          </button>

          <span className="h-4 w-px bg-white/20" />

          {/* Download Action */}
          <button
            type="button"
            onClick={() => onDownload(file)}
            title="Download file"
            aria-label="Download file"
            className="flex size-8 items-center justify-center rounded-full text-white/80 hover:text-white transition-colors outline-none"
          >
            <RiDownloadLine className="size-4" />
          </button>

          {/* Mark Synced Action if not-sync */}
          {file.syncStatus === "not-sync" && onMarkSynced && (
            <button
              type="button"
              disabled={marking}
              onClick={() => void onMarkSynced(file.id)}
              title="Mark as synced"
              aria-label="Mark as synced"
              className={cx(
                "flex size-8 items-center justify-center rounded-full text-white/80 hover:text-emerald-300 transition-colors outline-none",
                marking && "opacity-50",
              )}
            >
              <RiCheckLine className="size-4" />
            </button>
          )}
        </div>

        {/* Stream Notice */}
        <p className="flex items-center gap-1.5 text-caption-2-regular text-white/60">
          <RiFolderLine className="size-3.5" />
          Stream-only · Loaded on demand
        </p>
      </div>
    </div>
  );
}
