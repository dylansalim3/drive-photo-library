import {
  RiCheckboxBlankCircleLine,
  RiCheckboxCircleFill,
  RiImageLine,
  RiVideoLine,
} from "@remixicon/react";
import { formatBytes, formatDate, type DriveFile } from "@/api";
import { cx } from "@/utils/cx";
import { groupFilesByDate, type DateGroupingMode } from "@/utils/dateGrouping";

export interface MediaGridProps {
  files: DriveFile[];
  onSelectFile: (file: DriveFile, index: number) => void;
  dateGrouping?: DateGroupingMode;
  isSelectMode?: boolean;
  selectedFileIds?: Set<string>;
  onToggleSelectFile?: (fileId: string) => void;
}

export function MediaGrid({
  files,
  onSelectFile,
  dateGrouping = "grouped",
  isSelectMode,
  selectedFileIds,
  onToggleSelectFile,
}: MediaGridProps) {
  if (files.length === 0) return null;

  if (dateGrouping === "grouped") {
    const groups = groupFilesByDate(files);
    let cumulativeIndex = 0;

    return (
      <div className="flex flex-col gap-5">
        {groups.map((group) => {
          const startIndex = cumulativeIndex;
          cumulativeIndex += group.files.length;

          return (
            <div key={group.dateKey} id={`date-group-${group.dateKey}`} className="flex flex-col gap-2 scroll-mt-32">
              <div className="flex items-center justify-between border-b border-border-secondary/60 pb-1.5">
                <span className="text-body-medium font-semibold text-text-primary">
                  {group.dateLabel}
                </span>
                <span className="text-caption-1-regular text-text-tertiary">
                  {group.files.length} {group.files.length === 1 ? "item" : "items"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {group.files.map((file, localIdx) => {
                  const isSelected = selectedFileIds?.has(file.id) ?? false;
                  return (
                    <MediaCard
                      key={file.id}
                      file={file}
                      isSelected={isSelected}
                      isSelectMode={isSelectMode}
                      onClick={() => {
                        if (isSelectMode && onToggleSelectFile) {
                          onToggleSelectFile(file.id);
                        } else {
                          onSelectFile(file, startIndex + localIdx);
                        }
                      }}
                      onToggleSelect={() => onToggleSelectFile?.(file.id)}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Continuous Grid
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
      {files.map((file, index) => {
        const isSelected = selectedFileIds?.has(file.id) ?? false;
        return (
          <MediaCard
            key={file.id}
            file={file}
            isSelected={isSelected}
            isSelectMode={isSelectMode}
            onClick={() => {
              if (isSelectMode && onToggleSelectFile) {
                onToggleSelectFile(file.id);
              } else {
                onSelectFile(file, index);
              }
            }}
            onToggleSelect={() => onToggleSelectFile?.(file.id)}
          />
        );
      })}
    </div>
  );
}

function MediaCard({
  file,
  isSelected,
  isSelectMode,
  onClick,
  onToggleSelect,
}: {
  file: DriveFile;
  isSelected?: boolean;
  isSelectMode?: boolean;
  onClick: () => void;
  onToggleSelect?: () => void;
}) {
  const isNotSync = file.syncStatus === "not-sync";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "group relative flex flex-col overflow-hidden rounded-2xl sm:rounded-3xl border bg-background-primary-default shadow-xs transition-all duration-200 hover:shadow-md active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-accent-500 text-start",
        isSelected
          ? "border-accent-500 ring-2 ring-accent-500/30"
          : "border-border-button-default hover:border-accent-500/40",
      )}
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

        {/* Selection Checkbox */}
        {onToggleSelect && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelect();
            }}
            className={cx(
              "absolute left-2.5 top-2.5 z-20 flex size-7 items-center justify-center rounded-full backdrop-blur-md transition-all cursor-pointer",
              isSelected
                ? "bg-accent-500 text-white shadow-md scale-100"
                : isSelectMode
                  ? "bg-black/50 text-white/80 hover:bg-black/70 hover:scale-110"
                  : "opacity-0 group-hover:opacity-100 bg-black/40 text-white/70 hover:text-white hover:bg-black/60",
            )}
          >
            {isSelected ? (
              <RiCheckboxCircleFill className="size-5 text-white" />
            ) : (
              <RiCheckboxBlankCircleLine className="size-5" />
            )}
          </div>
        )}

        {/* Floating Liquid Glass Overlay Badges (Lenso UI style) */}
        {/* Sync Badge */}
        <div
          className={cx(
            "absolute top-2 z-10 transition-all",
            isSelected || isSelectMode ? "left-11" : "left-2 group-hover:left-11",
          )}
        >
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
            {[formatBytes(file.size), formatDate(file.createdTime), file.uploadedBy ? `@${file.uploadedBy}` : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>
    </button>
  );
}
