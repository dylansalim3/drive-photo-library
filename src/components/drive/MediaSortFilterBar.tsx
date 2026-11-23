import { useState, useRef, useEffect } from "react";
import {
  RiArrowUpDownLine,
  RiArrowDownSLine,
  RiCalendarLine,
  RiCheckLine,
  RiGridLine,
  RiImageLine,
  RiUserLine,
  RiVideoLine,
} from "@remixicon/react";
import { cx } from "@/utils/cx";
import type { DateGroupingMode, MediaTypeFilter, SortOption } from "@/utils/dateGrouping";

export interface MediaSortFilterBarProps {
  mediaTypeFilter: MediaTypeFilter;
  onMediaTypeFilterChange: (type: MediaTypeFilter) => void;
  sortOption: SortOption;
  onSortOptionChange: (sort: SortOption) => void;
  dateGrouping: DateGroupingMode;
  onDateGroupingChange: (mode: DateGroupingMode) => void;
  totalCount: number;
  uploaderFilter?: string;
  onUploaderFilterChange?: (uploader: string) => void;
  uploaders?: string[];
}

const SORT_LABELS: Record<SortOption, string> = {
  "date-desc": "Date (Newest)",
  "date-asc": "Date (Oldest)",
  "name-asc": "Name (A → Z)",
  "name-desc": "Name (Z → A)",
  "size-desc": "Size (Largest)",
  "size-asc": "Size (Smallest)",
};

export function MediaSortFilterBar({
  mediaTypeFilter,
  onMediaTypeFilterChange,
  sortOption,
  onSortOptionChange,
  dateGrouping,
  onDateGroupingChange,
  totalCount,
  uploaderFilter = "all",
  onUploaderFilterChange,
  uploaders = [],
}: MediaSortFilterBarProps) {
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showUploaderDropdown, setShowUploaderDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const uploaderDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
      if (uploaderDropdownRef.current && !uploaderDropdownRef.current.contains(e.target as Node)) {
        setShowUploaderDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <div className="flex flex-wrap items-center justify-between gap-2.5 py-1 text-caption-1-medium">
      {/* Left Filters: Media Type (All / Photos / Videos) & Uploaders */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Media Type Filter Pills (All / Photos / Videos) */}
        <div className="flex items-center gap-1 rounded-xl border border-border-button-default bg-background-primary-default p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => onMediaTypeFilterChange("all")}
            className={cx(
              "rounded-lg px-2.5 py-1 transition-colors outline-none",
              mediaTypeFilter === "all"
                ? "bg-accent-500 text-white font-semibold shadow-2xs"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => onMediaTypeFilterChange("photos")}
            className={cx(
              "flex items-center gap-1 rounded-lg px-2.5 py-1 transition-colors outline-none",
              mediaTypeFilter === "photos"
                ? "bg-accent-500 text-white font-semibold shadow-2xs"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <RiImageLine className="size-3.5" />
            <span>Photos</span>
          </button>
          <button
            type="button"
            onClick={() => onMediaTypeFilterChange("videos")}
            className={cx(
              "flex items-center gap-1 rounded-lg px-2.5 py-1 transition-colors outline-none",
              mediaTypeFilter === "videos"
                ? "bg-accent-500 text-white font-semibold shadow-2xs"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <RiVideoLine className="size-3.5" />
            <span>Videos</span>
          </button>
        </div>

        {/* Uploader Filter Dropdown (if multiple uploaders exist) */}
        {uploaders.length > 0 && onUploaderFilterChange && (
          <div className="relative" ref={uploaderDropdownRef}>
            <button
              type="button"
              onClick={() => setShowUploaderDropdown((v) => !v)}
              className={cx(
                "flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 transition-colors outline-none shadow-2xs",
                uploaderFilter !== "all"
                  ? "border-accent-500 bg-accent-500/10 text-accent-500 font-semibold"
                  : "border-border-button-default bg-background-primary-default text-text-secondary hover:text-text-primary"
              )}
            >
              <RiUserLine className="size-3.5" />
              <span>{uploaderFilter === "all" ? "All uploaders" : `@${uploaderFilter}`}</span>
              <RiArrowDownSLine className="size-3.5 opacity-60" />
            </button>

            {showUploaderDropdown && (
              <div className="absolute left-0 top-full z-40 mt-1.5 w-44 rounded-2xl border border-border-button-default bg-background-primary-default p-1.5 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
                <p className="px-2.5 py-1 text-caption-2-medium text-text-tertiary uppercase tracking-wider">
                  Filter by uploader
                </p>
                <button
                  type="button"
                  onClick={() => {
                    onUploaderFilterChange("all");
                    setShowUploaderDropdown(false);
                  }}
                  className={cx(
                    "flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-caption-1-medium text-left transition-colors outline-none",
                    uploaderFilter === "all"
                      ? "bg-accent-500/10 text-accent-500 font-semibold"
                      : "text-text-primary hover:bg-background-secondary-default"
                  )}
                >
                  <span>All uploaders</span>
                  {uploaderFilter === "all" && <RiCheckLine className="size-3.5 text-accent-500" />}
                </button>
                {uploaders.map((uploader) => (
                  <button
                    key={uploader}
                    type="button"
                    onClick={() => {
                      onUploaderFilterChange(uploader);
                      setShowUploaderDropdown(false);
                    }}
                    className={cx(
                      "flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-caption-1-medium text-left transition-colors outline-none",
                      uploaderFilter === uploader
                        ? "bg-accent-500/10 text-accent-500 font-semibold"
                        : "text-text-primary hover:bg-background-secondary-default"
                    )}
                  >
                    <span className="truncate">@{uploader}</span>
                    {uploaderFilter === uploader && <RiCheckLine className="size-3.5 text-accent-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Controls: Sort Dropdown & Date Grouping Toggle */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Date Grouping Toggle (Grouped 📅 vs Continuous ▦) */}
        <div className="flex items-center rounded-xl border border-border-button-default bg-background-primary-default p-0.5 shadow-2xs">
          <button
            type="button"
            onClick={() => onDateGroupingChange("grouped")}
            title="Group by date (Timeline album view)"
            aria-label="Group by date"
            className={cx(
              "flex size-7 items-center justify-center rounded-lg transition-colors outline-none",
              dateGrouping === "grouped"
                ? "bg-accent-500/10 text-accent-500 font-semibold"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <RiCalendarLine className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => onDateGroupingChange("continuous")}
            title="Continuous grid (No date separators)"
            aria-label="Continuous grid"
            className={cx(
              "flex size-7 items-center justify-center rounded-lg transition-colors outline-none",
              dateGrouping === "continuous"
                ? "bg-accent-500/10 text-accent-500 font-semibold"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            <RiGridLine className="size-4" />
          </button>
        </div>

        {/* Sort Dropdown Selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setShowSortDropdown((v) => !v)}
            aria-label="Sort options"
            className="flex items-center gap-1.5 rounded-xl border border-border-button-default bg-background-primary-default px-2.5 py-1.5 text-text-primary hover:bg-background-secondary-default transition-colors outline-none shadow-2xs"
          >
            <RiArrowUpDownLine className="size-3.5 text-accent-500" />
            <span className="truncate max-w-[110px] sm:max-w-none">{SORT_LABELS[sortOption]}</span>
          </button>

          {showSortDropdown && (
            <div className="absolute right-0 top-full z-40 mt-1.5 w-48 rounded-2xl border border-border-button-default bg-background-primary-default p-1.5 shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150">
              <p className="px-2.5 py-1 text-caption-2-medium text-text-tertiary uppercase tracking-wider">
                Sort by
              </p>
              {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onSortOptionChange(option);
                    setShowSortDropdown(false);
                  }}
                  className={cx(
                    "flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-start transition-colors outline-none",
                    sortOption === option
                      ? "bg-background-secondary-default text-accent-500 font-semibold"
                      : "text-text-primary hover:bg-background-secondary-default"
                  )}
                >
                  <span>{SORT_LABELS[option]}</span>
                  {sortOption === option && <RiCheckLine className="size-4 text-accent-500" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
