import { type ChangeEvent } from "react";
import {
  RiCloseCircleLine,
  RiDownloadCloud2Line,
  RiGridLine,
  RiListCheck,
  RiLogoutBoxLine,
  RiMapPinLine,
  RiSearchLine,
  RiSettings3Line,
} from "@remixicon/react";
import { Avatar } from "@/components/base/avatar/avatar";
import { Button } from "@/components/base/buttons/button";
import { cx } from "@/utils/cx";

export interface DriveHeaderProps {
  username?: string;
  search: string;
  onSearchChange: (search: string) => void;
  viewMode: "grid" | "list" | "map";
  onViewModeChange: (mode: "grid" | "list" | "map") => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
  onOpenSync?: () => void;
  unsyncedCount?: number;
}

export function DriveHeader({
  username,
  search,
  onSearchChange,
  viewMode,
  onViewModeChange,
  onOpenSettings,
  onSignOut,
  onOpenSync,
  unsyncedCount,
}: DriveHeaderProps) {
  const handleClear = () => {
    onSearchChange("");
  };

  return (
    <header className="sticky top-0 z-30 flex flex-col gap-3 rounded-2xl border border-border-button-default bg-background-primary-default/85 p-3 backdrop-blur-md shadow-xs">
      <div className="flex items-center justify-between gap-3">
        {/* Brand / Avatar */}
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar
            initials={username ? username.slice(0, 1).toUpperCase() : "D"}
            size="md"
          />
          <div className="min-w-0">
            <h1 className="truncate text-title-3-semibold text-text-primary leading-tight">
              Drive Photos
            </h1>
            <p className="text-caption-1-regular text-text-secondary truncate">
              Stream-only library
            </p>
          </div>
        </div>

        {/* View Switcher & Action Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Vacation Sync & Export Button */}
          {onOpenSync && (
            <button
              type="button"
              onClick={onOpenSync}
              title="Vacation Sync & Export Center"
              aria-label="Vacation Sync & Export Center"
              className="flex items-center gap-1.5 rounded-xl border border-border-button-default bg-background-secondary-default px-2.5 py-1.5 text-body-2-medium text-text-secondary hover:bg-background-primary-default hover:text-text-primary transition-colors"
            >
              <RiDownloadCloud2Line className="size-4 text-accent-500" />
              <span className="hidden sm:inline">Sync & Export</span>
              {unsyncedCount !== undefined && unsyncedCount > 0 && (
                <span className="rounded-full bg-accent-500 px-1.5 py-0.2 text-[10px] font-bold text-white leading-tight">
                  {unsyncedCount}
                </span>
              )}
            </button>
          )}

          {/* View Mode Toggle Pill */}
          <div className="flex items-center rounded-xl border border-border-button-default bg-background-secondary-default p-0.5">
            <button
              type="button"
              onClick={() => onViewModeChange("grid")}
              title="Grid view"
              aria-label="Grid view"
              className={cx(
                "flex size-9 items-center justify-center rounded-lg transition-all outline-none",
                viewMode === "grid"
                  ? "bg-background-primary-default text-accent-500 shadow-xs font-semibold"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              <RiGridLine className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("list")}
              title="List view"
              aria-label="List view"
              className={cx(
                "flex size-9 items-center justify-center rounded-lg transition-all outline-none",
                viewMode === "list"
                  ? "bg-background-primary-default text-accent-500 shadow-xs font-semibold"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              <RiListCheck className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("map")}
              title="Travel Map view"
              aria-label="Travel Map view"
              className={cx(
                "flex size-9 items-center justify-center rounded-lg transition-all outline-none",
                viewMode === "map"
                  ? "bg-background-primary-default text-accent-500 shadow-xs font-semibold"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              <RiMapPinLine className="size-4" />
            </button>
          </div>

          <Button
            variant="ghost"
            size="small"
            iconOnly
            leadingIcon={RiSettings3Line}
            aria-label="Settings"
            onClick={onOpenSettings}
            className="min-h-10 min-w-10"
          />
          <Button
            variant="ghost"
            size="small"
            iconOnly
            leadingIcon={RiLogoutBoxLine}
            aria-label="Sign out"
            onClick={onSignOut}
            className="min-h-10 min-w-10"
          />
        </div>
      </div>

      {/* Search Input Bar (Google Drive pill style) */}
      <div className="relative flex items-center">
        <RiSearchLine className="pointer-events-none absolute left-3.5 size-4 text-text-tertiary" />
        <input
          type="text"
          value={search}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
          placeholder="Search in Drive…"
          aria-label="Search files and folders"
          className="w-full rounded-full border border-border-button-default bg-background-secondary-default py-2 pl-9 pr-9 text-body-medium text-text-primary placeholder:text-text-tertiary transition-colors focus:border-accent-500 focus:bg-background-primary-default focus:outline-none focus:ring-2 focus:ring-accent-500/20"
        />
        {search && (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-3 text-text-tertiary hover:text-text-primary outline-none"
          >
            <RiCloseCircleLine className="size-4" />
          </button>
        )}
      </div>
    </header>
  );
}
