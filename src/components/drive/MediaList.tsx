import { RiDownloadLine, RiImageLine, RiVideoLine } from "@remixicon/react";
import { Chip } from "@/components/base/badges/chip";
import { Button } from "@/components/base/buttons/button";
import { formatBytes, formatDate, type DriveFile } from "@/api";

export interface MediaListProps {
  files: DriveFile[];
  onSelectFile: (file: DriveFile, index: number) => void;
  onDownloadFile: (file: DriveFile) => void;
}

export function MediaList({ files, onSelectFile, onDownloadFile }: MediaListProps) {
  if (files.length === 0) return null;

  return (
    <div className="divide-y divide-border-button-default rounded-2xl border border-border-button-default bg-background-primary-default overflow-hidden">
      {files.map((file, index) => {
        const isNotSync = file.syncStatus === "not-sync";

        return (
          <div
            key={file.id}
            onClick={() => onSelectFile(file, index)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectFile(file, index);
              }
            }}
            className="group flex items-center justify-between gap-3 p-3 hover:bg-background-secondary-default transition-colors cursor-pointer outline-none focus-visible:bg-background-secondary-default"
          >
            {/* Left: Thumbnail Preview */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border-button-default bg-background-secondary-default">
                <img
                  src={`/api/media/thumbnail?id=${encodeURIComponent(file.id)}`}
                  alt={file.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
                <div className="absolute bottom-0.5 right-0.5 rounded-sm bg-black/60 p-0.5 text-white backdrop-blur-xs">
                  {file.isVideo ? (
                    <RiVideoLine className="size-2.5" />
                  ) : (
                    <RiImageLine className="size-2.5" />
                  )}
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="min-w-0">
                <p className="truncate text-body-medium font-medium text-text-primary group-hover:text-accent-500 transition-colors">
                  {file.name}
                </p>
                <p className="text-caption-1-regular text-text-secondary truncate">
                  {[formatBytes(file.size), formatDate(file.createdTime)].filter(Boolean).join(" · ")}
                </p>
              </div>
            </div>

            {/* Right: Sync Status & Download */}
            <div className="flex items-center gap-2 shrink-0">
              <Chip variant="caption" color={isNotSync ? "yellow" : "lime"}>
                {isNotSync ? "Not-sync" : "Synced"}
              </Chip>
              <Button
                variant="ghost"
                size="small"
                iconOnly
                leadingIcon={RiDownloadLine}
                aria-label={`Download ${file.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadFile(file);
                }}
                className="min-h-10 min-w-10"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
