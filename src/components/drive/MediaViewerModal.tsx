import { useEffect, useRef, useState, type TouchEvent } from "react";
import {
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCameraLine,
  RiCheckLine,
  RiCloseLine,
  RiCompass3Line,
  RiDeleteBinLine,
  RiDownloadLine,
  RiExternalLinkLine,
  RiFolderLine,
  RiImageLine,
  RiInformationLine,
  RiMapPinLine,
  RiRefreshLine,
  RiVideoLine,
} from "@remixicon/react";
import { formatBytes, formatDate, type DriveFile } from "@/api";
import { cx } from "@/utils/cx";
import {
  formatAltitude,
  formatAperture,
  formatCamera,
  formatCoordinates,
  formatDuration,
  formatExposureTime,
  formatFocalLength,
  formatIso,
  formatResolution,
  getGoogleMapsUrl,
  getOpenStreetMapUrl,
} from "@/utils/exifFormatter";
import { UploaderAvatarPill } from "./UploaderAvatarPill";

export interface MediaViewerModalProps {
  files: DriveFile[];
  currentIndex: number;
  onNavigate: (index: number) => void;
  onClose: () => void;
  onDownload: (file: DriveFile) => void;
  onMarkSynced?: (fileId: string) => Promise<void>;
  marking?: boolean;
  onTrash?: (fileId: string) => Promise<void>;
  onRestore?: (fileId: string) => Promise<void>;
}

export function MediaViewerModal({
  files,
  currentIndex,
  onNavigate,
  onClose,
  onDownload,
  onMarkSynced,
  marking,
  onTrash,
  onRestore,
}: MediaViewerModalProps) {
  const file = files[currentIndex];
  const total = files.length;

  const [loadingMedia, setLoadingMedia] = useState(true);
  const [showExif, setShowExif] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchEndRef = useRef<{ x: number; y: number } | null>(null);

  // Keyboard navigation: Left/Right arrows, Escape, 'i' key for EXIF
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && currentIndex > 0) {
        onNavigate(currentIndex - 1);
      } else if (e.key === "ArrowRight" && currentIndex < total - 1) {
        onNavigate(currentIndex + 1);
      } else if (e.key === "Escape") {
        onClose();
      } else if (e.key.toLowerCase() === "i") {
        setShowExif((prev) => !prev);
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

  // EXIF extraction
  const exif = file.imageMediaMetadata;
  const videoExif = file.videoMediaMetadata;
  const camera = formatCamera(exif?.cameraMake, exif?.cameraModel);
  const lens = exif?.lens?.trim();
  const exposureTime = formatExposureTime(exif?.exposureTime);
  const aperture = formatAperture(exif?.aperture);
  const focalLength = formatFocalLength(exif?.focalLength);
  const iso = formatIso(exif?.isoSpeed);
  const resolution = formatResolution(
    exif?.width ?? videoExif?.width,
    exif?.height ?? videoExif?.height,
  );
  const duration = formatDuration(videoExif?.durationMillis);
  const coordinates = formatCoordinates(exif?.location?.latitude, exif?.location?.longitude);
  const altitude = formatAltitude(exif?.location?.altitude);
  const hasExif = Boolean(
    camera || lens || exposureTime || aperture || focalLength || iso || coordinates || duration,
  );

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
            <div className="flex items-center gap-2">
              <p className="truncate text-body-medium font-semibold text-white drop-shadow-xs">
                {file.name}
              </p>
              {file.uploadedBy && (
                <UploaderAvatarPill username={file.uploadedBy} size="xs" />
              )}
            </div>
            <p className="text-caption-1-regular text-white/70 truncate drop-shadow-xs">
              {[formatBytes(file.size), formatDate(file.createdTime)]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Info / EXIF Toggle Button */}
          <button
            type="button"
            onClick={() => setShowExif((prev) => !prev)}
            aria-label="Toggle metadata and EXIF inspector"
            title="EXIF info & location (I)"
            className={cx(
              "flex size-10 shrink-0 items-center justify-center rounded-full backdrop-blur-md border border-white/20 transition-all outline-none focus-visible:ring-2 focus-visible:ring-white",
              showExif
                ? "bg-accent-500 text-white shadow-lg ring-2 ring-accent-400"
                : "bg-white/10 text-white/90 hover:bg-white/20 hover:text-white",
            )}
          >
            <RiInformationLine className="size-5" />
          </button>

          {/* Close Viewer */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close viewer"
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white/90 hover:bg-white/20 hover:text-white transition-colors outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <RiCloseLine className="size-5" />
          </button>
        </div>
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

      {/* EXIF Inspector Glass Flyout Sheet */}
      {showExif && (
        <div className="absolute right-4 bottom-24 sm:bottom-28 z-30 w-[calc(100%-2rem)] sm:w-96 max-h-[70vh] overflow-y-auto rounded-3xl border border-white/20 bg-black/85 p-5 backdrop-blur-2xl text-white shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
          <div className="flex items-center justify-between pb-3 border-b border-white/15">
            <div className="flex items-center gap-2">
              <RiCameraLine className="size-5 text-accent-400" />
              <span className="text-body-medium font-semibold">Camera & EXIF Specs</span>
            </div>
            <button
              type="button"
              onClick={() => setShowExif(false)}
              className="rounded-full p-1 text-white/60 hover:text-white transition-colors"
            >
              <RiCloseLine className="size-4" />
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-4 text-caption-1-medium">
            {/* Camera Model & Lens */}
            {camera ? (
              <div>
                <p className="text-caption-2-medium uppercase tracking-wider text-white/50">Camera</p>
                <p className="text-body-2-semibold text-white mt-0.5">{camera}</p>
                {lens && <p className="text-caption-1-regular text-white/70 mt-0.5">{lens}</p>}
              </div>
            ) : null}

            {/* Exposure Specs Grid */}
            {(exposureTime || aperture || focalLength || iso) && (
              <div>
                <p className="text-caption-2-medium uppercase tracking-wider text-white/50 mb-1.5">
                  Exposure
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {exposureTime && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-center">
                      <p className="text-[11px] text-white/50 uppercase">Shutter</p>
                      <p className="text-body-2-semibold text-white mt-0.5">{exposureTime}</p>
                    </div>
                  )}
                  {aperture && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-center">
                      <p className="text-[11px] text-white/50 uppercase">Aperture</p>
                      <p className="text-body-2-semibold text-white mt-0.5">{aperture}</p>
                    </div>
                  )}
                  {focalLength && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-center">
                      <p className="text-[11px] text-white/50 uppercase">Focal</p>
                      <p className="text-body-2-semibold text-white mt-0.5">{focalLength}</p>
                    </div>
                  )}
                  {iso && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-2 text-center">
                      <p className="text-[11px] text-white/50 uppercase">ISO</p>
                      <p className="text-body-2-semibold text-white mt-0.5">{iso}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* File & Resolution Specs */}
            <div>
              <p className="text-caption-2-medium uppercase tracking-wider text-white/50 mb-1.5">
                Image Details
              </p>
              <div className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/5 p-3">
                {resolution && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Resolution</span>
                    <span className="font-semibold text-white">{resolution}</span>
                  </div>
                )}
                {duration && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Duration</span>
                    <span className="font-semibold text-white">{duration}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-white/60">File Size</span>
                  <span className="font-semibold text-white">{formatBytes(file.size)}</span>
                </div>
                {(exif?.time || file.createdTime) && (
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Captured</span>
                    <span className="font-semibold text-white">
                      {formatDate(exif?.time || file.createdTime)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* GPS & Location Specs */}
            {exif?.location?.latitude != null && exif?.location?.longitude != null && (
              <div>
                <p className="text-caption-2-medium uppercase tracking-wider text-white/50 mb-1.5">
                  Location & GPS
                </p>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <RiMapPinLine className="size-4 text-accent-400 shrink-0" />
                    <span className="font-semibold text-white">{coordinates}</span>
                  </div>
                  {altitude && (
                    <p className="text-caption-2-regular text-white/70 pl-6">
                      Altitude: {altitude}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1 pt-2 border-t border-white/10">
                    <a
                      href={getGoogleMapsUrl(exif.location.latitude, exif.location.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-caption-1-medium text-white hover:bg-white/20 transition-colors"
                    >
                      <RiExternalLinkLine className="size-3.5" />
                      <span>Google Maps</span>
                    </a>
                    <a
                      href={getOpenStreetMapUrl(exif.location.latitude, exif.location.longitude)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1.5 text-caption-1-medium text-white hover:bg-white/20 transition-colors"
                    >
                      <RiCompass3Line className="size-3.5" />
                      <span>OpenStreetMap</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {!hasExif && (
              <div className="py-4 text-center text-white/60">
                <p className="text-body-2-regular">No camera EXIF metadata recorded for this file.</p>
              </div>
            )}
          </div>
        </div>
      )}

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

          {/* EXIF Info Action */}
          <button
            type="button"
            onClick={() => setShowExif((prev) => !prev)}
            title="EXIF info & location"
            aria-label="EXIF info & location"
            className={cx(
              "flex size-8 items-center justify-center rounded-full transition-colors outline-none",
              showExif ? "text-accent-400 font-bold" : "text-white/80 hover:text-white",
            )}
          >
            <RiInformationLine className="size-4" />
          </button>

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

          {/* Restore from Trash */}
          {file.syncStatus === "trash" && onRestore && (
            <button
              type="button"
              onClick={() => void onRestore(file.id)}
              title="Restore from trash"
              aria-label="Restore from trash"
              className="flex size-8 items-center justify-center rounded-full text-white/80 hover:text-emerald-300 transition-colors outline-none"
            >
              <RiRefreshLine className="size-4" />
            </button>
          )}

          {/* Move to Trash */}
          {file.syncStatus !== "trash" && onTrash && (
            <button
              type="button"
              onClick={() => void onTrash(file.id)}
              title="Move to trash"
              aria-label="Move to trash"
              className="flex size-8 items-center justify-center rounded-full text-white/80 hover:text-rose-400 transition-colors outline-none"
            >
              <RiDeleteBinLine className="size-4" />
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
