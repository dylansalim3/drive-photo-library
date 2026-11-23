import {
  RiCheckLine,
  RiCheckboxBlankCircleLine,
  RiCheckboxCircleFill,
  RiDownloadLine,
  RiFolderLine,
} from "@remixicon/react";
import { Chip } from "@/components/base/badges/chip";
import { Button } from "@/components/base/buttons/button";
import type { DriveFolder } from "@/api";

export interface FolderItemsProps {
  folders: DriveFolder[];
  viewMode: "grid" | "list" | "map";
  onSelectFolder: (folderId: string) => void;
  onMarkFolderSynced: (folderId: string) => void;
  marking?: boolean;
  onDownloadFolder?: (folder: DriveFolder) => void;
  downloadingFolderId?: string | null;
  isSelectMode?: boolean;
  selectedFolderIds?: Set<string>;
  onToggleSelectFolder?: (folderId: string) => void;
}

export function FolderItems({
  folders,
  viewMode,
  onSelectFolder,
  onMarkFolderSynced,
  marking,
  onDownloadFolder,
  downloadingFolderId,
  isSelectMode,
  selectedFolderIds,
  onToggleSelectFolder,
}: FolderItemsProps) {
  if (folders.length === 0) return null;

  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-body-2-medium text-text-secondary">Folders ({folders.length})</p>
        <div className="divide-y divide-border-button-default rounded-2xl border border-border-button-default bg-background-primary-default overflow-hidden">
          {folders.map((folder) => {
            const isSelected = selectedFolderIds?.has(folder.id) ?? false;
            return (
              <div
                key={folder.id}
                onClick={() => {
                  if (isSelectMode && onToggleSelectFolder) {
                    onToggleSelectFolder(folder.id);
                  } else {
                    onSelectFolder(folder.id);
                  }
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    if (isSelectMode && onToggleSelectFolder) {
                      onToggleSelectFolder(folder.id);
                    } else {
                      onSelectFolder(folder.id);
                    }
                  }
                }}
                className={`flex items-center justify-between gap-3 p-3 transition-colors cursor-pointer outline-none ${
                  isSelected
                    ? "bg-accent-500/10 hover:bg-accent-500/15"
                    : "hover:bg-background-secondary-default focus-visible:bg-background-secondary-default"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Selection Checkbox */}
                  {(isSelectMode || onToggleSelectFolder) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelectFolder?.(folder.id);
                      }}
                      className="text-text-secondary hover:text-accent-500 p-0.5 rounded-full transition-colors shrink-0"
                    >
                      {isSelected ? (
                        <RiCheckboxCircleFill className="size-5 text-accent-500" />
                      ) : (
                        <RiCheckboxBlankCircleLine className="size-5 text-text-tertiary hover:text-text-secondary" />
                      )}
                    </button>
                  )}

                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500">
                    <RiFolderLine className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-body-medium font-medium text-text-primary">
                      {folder.name}
                    </p>
                    <p className="text-caption-1-regular text-text-tertiary">Folder</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Chip variant="caption" color={folder.syncStatus === "not-sync" ? "yellow" : "lime"}>
                    {folder.syncStatus === "not-sync" ? "Not-sync" : "Synced"}
                  </Chip>

                  {/* Download Folder ZIP Button */}
                  {onDownloadFolder && (
                    <Button
                      variant="ghost"
                      size="small"
                      leadingIcon={RiDownloadLine}
                      disabled={downloadingFolderId === folder.id}
                      title={`Download '${folder.name}' as ZIP archive`}
                      aria-label={`Download ${folder.name} as ZIP`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownloadFolder(folder);
                      }}
                    >
                      {downloadingFolderId === folder.id ? "Zipping…" : "ZIP"}
                    </Button>
                  )}

                  {folder.syncStatus === "not-sync" && (
                    <Button
                      variant="ghost"
                      size="small"
                      leadingIcon={RiCheckLine}
                      disabled={marking}
                      onClick={(e) => {
                        e.stopPropagation();
                        onMarkFolderSynced(folder.id);
                      }}
                    >
                      Sync
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Grid Mode
  return (
    <div>
      <p className="text-body-2-medium text-text-secondary">Folders ({folders.length})</p>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {folders.map((folder) => {
          const isSelected = selectedFolderIds?.has(folder.id) ?? false;
          return (
            <div
              key={folder.id}
              onClick={() => {
                if (isSelectMode && onToggleSelectFolder) {
                  onToggleSelectFolder(folder.id);
                } else {
                  onSelectFolder(folder.id);
                }
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  if (isSelectMode && onToggleSelectFolder) {
                    onToggleSelectFolder(folder.id);
                  } else {
                    onSelectFolder(folder.id);
                  }
                }
              }}
              className={`group flex flex-col justify-between rounded-2xl border p-3 text-start cursor-pointer transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent-500 shadow-xs ${
                isSelected
                  ? "border-accent-500 bg-accent-500/10 shadow-sm"
                  : "border-border-button-default bg-background-primary-default hover:border-accent-500/50 hover:bg-background-secondary-default/50 active:scale-[0.98]"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  {(isSelectMode || onToggleSelectFolder) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSelectFolder?.(folder.id);
                      }}
                      className="text-text-secondary hover:text-accent-500 p-0.5 rounded-full transition-colors shrink-0"
                    >
                      {isSelected ? (
                        <RiCheckboxCircleFill className="size-5 text-accent-500" />
                      ) : (
                        <RiCheckboxBlankCircleLine className="size-5 text-text-tertiary group-hover:text-text-secondary" />
                      )}
                    </button>
                  )}
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500">
                    <RiFolderLine className="size-5" />
                  </div>
                </div>
                <Chip variant="caption" color={folder.syncStatus === "not-sync" ? "yellow" : "lime"}>
                  {folder.syncStatus === "not-sync" ? "Not-sync" : "Synced"}
                </Chip>
              </div>

              <div className="mt-2.5">
                <p className="truncate text-body-medium font-medium text-text-primary group-hover:text-accent-500 transition-colors">
                  {folder.name}
                </p>
                <p className="text-caption-1-regular text-text-tertiary">Folder</p>
              </div>

              <div className="mt-2 flex items-center gap-1.5 border-t border-border-secondary pt-2">
                {onDownloadFolder && (
                  <Button
                    variant="ghost"
                    size="small"
                    leadingIcon={RiDownloadLine}
                    disabled={downloadingFolderId === folder.id}
                    title={`Download '${folder.name}' as ZIP`}
                    aria-label={`Download ${folder.name} as ZIP`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDownloadFolder(folder);
                    }}
                    className="flex-1 justify-center text-caption-1-medium"
                  >
                    {downloadingFolderId === folder.id ? "Zipping…" : "ZIP"}
                  </Button>
                )}
                {folder.syncStatus === "not-sync" && (
                  <Button
                    variant="ghost"
                    size="small"
                    leadingIcon={RiCheckLine}
                    disabled={marking}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkFolderSynced(folder.id);
                    }}
                    className="flex-1 justify-center text-caption-1-medium"
                  >
                    Sync
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
