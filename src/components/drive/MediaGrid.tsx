import { RiImageLine, RiVideoLine } from "@remixicon/react";
import { formatBytes, formatDate, type DriveFile } from "@/api";
import { cx } from "@/utils/cx";

export interface MediaGridProps {
  files: DriveFile[];
  onSelectFile: (file: DriveFile, index: number) => void;
}

export function MediaGrid({ files, onSelectFile }: MediaGridProps) {
  if (files.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {files.map((file, index) => {
        const isNotSync = file.syncStatus === "not-sync";

        return (
          <button
            key={file.id}
            type="button"
            onClick={() => onSelectFile(file, index)}
            className="group relative flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border border-border-button-default bg-background-primary-default shadow-xs transition-all duration-200 hover:shadow-md hover:border-accent-500/40 active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-accent-500 text-start"
          >
            {/* Image / Thumbnail Container */}
            <div className="relative aspect-square w-full overflow-hidden bg-background-secondary-default">
              <img
                src={`/api/media/thumbnail?id=${encodeURIComponent(file.id)}`}
                alt={file.name}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
              />

              {/* Floating Liquid Glass Overlay Badges (Lenso UI style) */}
              {/* Top-Left: Sync Badge */}
              <div className="absolute left-2 top-2 z-10">
                <span
                  className={cx(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-caption-2-medium backdrop-blur-md border shadow-xs transition-colors",
                    isNotSync
                      ? "bg-amber-950/60 border-amber-400/30 text-amber-200"
                      : "bg-emerald-950/60 border-emerald-400/30 text-emerald-200",
                  )}
                >
                  <span
                    className={cx(
                      "size-1.5 rounded-full",
                      isNotSync ? "bg-amber-400 animate-pulse" : "bg-emerald-400",
                    )}
                  />
                  <span>{isNotSync ? "Not-sync" : "Synced"}</span>
                </span>
              </div>

              {/* Top-Right: Media Type Glass Pill */}
              <div className="absolute right-2 top-2 z-10">
                <div className="flex size-7 items-center justify-center rounded-full bg-black/45 backdrop-blur-md border border-white/20 text-white shadow-xs">
                  {file.isVideo ? (
                    <RiVideoLine className="size-3.5" aria-hidden />
                  ) : (
                    <RiImageLine className="size-3.5" aria-hidden />
                  )}
                </div>
              </div>

              {/* Bottom Scrim / Gradient Overlay */}
              <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col justify-end bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2.5 pt-8 text-white">
                <p className="truncate text-body-2-medium font-medium drop-shadow-xs leading-tight">
                  {file.name}
                </p>
                <p className="mt-0.5 text-caption-2-regular text-white/75 truncate drop-shadow-xs">
                  {[formatBytes(file.size), formatDate(file.createdTime)].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
