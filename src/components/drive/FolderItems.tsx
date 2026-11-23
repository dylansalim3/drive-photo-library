import { RiCheckLine, RiFolderLine } from "@remixicon/react";
import { Chip } from "@/components/base/badges/chip";
import { Button } from "@/components/base/buttons/button";
import type { DriveFolder } from "@/api";

export interface FolderItemsProps {
  folders: DriveFolder[];
  viewMode: "grid" | "list";
  onSelectFolder: (folderId: string) => void;
  onMarkFolderSynced: (folderId: string) => void;
  marking?: boolean;
}

export function FolderItems({
  folders,
  viewMode,
  onSelectFolder,
  onMarkFolderSynced,
  marking,
}: FolderItemsProps) {
  if (folders.length === 0) return null;

  if (viewMode === "list") {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-body-2-medium text-text-secondary">Folders ({folders.length})</p>
        <div className="divide-y divide-border-button-default rounded-2xl border border-border-button-default bg-background-primary-default overflow-hidden">
          {folders.map((folder) => (
            <div
              key={folder.id}
              onClick={() => onSelectFolder(folder.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectFolder(folder.id);
                }
              }}
              className="flex items-center justify-between gap-3 p-3 hover:bg-background-secondary-default transition-colors cursor-pointer outline-none focus-visible:bg-background-secondary-default"
            >
              <div className="flex items-center gap-3 min-w-0">
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
          ))}
        </div>
      </div>
    );
  }

  // Grid Mode
  return (
    <div>
      <p className="text-body-2-medium text-text-secondary">Folders ({folders.length})</p>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {folders.map((folder) => (
          <div
            key={folder.id}
            onClick={() => onSelectFolder(folder.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectFolder(folder.id);
              }
            }}
            className="group flex flex-col justify-between rounded-2xl border border-border-button-default bg-background-primary-default p-3 text-start cursor-pointer hover:border-accent-500/50 hover:bg-background-secondary-default/50 active:scale-[0.98] transition-all outline-none focus-visible:ring-2 focus-visible:ring-accent-500 shadow-xs"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-500/10 text-accent-500">
                <RiFolderLine className="size-5" />
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
            {folder.syncStatus === "not-sync" && (
              <div className="mt-2 border-t border-border-secondary pt-2">
                <Button
                  variant="ghost"
                  size="small"
                  leadingIcon={RiCheckLine}
                  disabled={marking}
                  onClick={(e) => {
                    e.stopPropagation();
                    onMarkFolderSynced(folder.id);
                  }}
                  className="w-full justify-center"
                >
                  Sync folder
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
