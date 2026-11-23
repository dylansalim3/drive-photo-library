import type { DriveFile } from "@/api";

export type SortOption =
  | "date-desc"
  | "date-asc"
  | "name-asc"
  | "name-desc"
  | "size-desc"
  | "size-asc";

export type MediaTypeFilter = "all" | "photos" | "videos";
export type DateGroupingMode = "grouped" | "continuous";

export interface DateGroup {
  dateKey: string;
  dateLabel: string;
  files: DriveFile[];
}

export function getDateGroupLabel(dateStr?: string | null): string {
  if (!dateStr) return "Earlier";
  try {
    const fileDate = new Date(dateStr);
    if (isNaN(fileDate.getTime())) return "Earlier";

    const today = new Date();
    const isToday =
      fileDate.getFullYear() === today.getFullYear() &&
      fileDate.getMonth() === today.getMonth() &&
      fileDate.getDate() === today.getDate();

    if (isToday) return "Today";

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      fileDate.getFullYear() === yesterday.getFullYear() &&
      fileDate.getMonth() === yesterday.getMonth() &&
      fileDate.getDate() === yesterday.getDate();

    if (isYesterday) return "Yesterday";

    // Format like "Mon, Nov 23, 2026"
    return fileDate.toLocaleDateString(undefined, {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Earlier";
  }
}

export function filterAndSortFiles(
  files: DriveFile[],
  mediaType: MediaTypeFilter,
  sortOption: SortOption
): DriveFile[] {
  // 1. Filter by media type
  let filtered = files;
  if (mediaType === "photos") {
    filtered = files.filter((f) => !f.isVideo);
  } else if (mediaType === "videos") {
    filtered = files.filter((f) => f.isVideo);
  }

  // 2. Sort
  return [...filtered].sort((a, b) => {
    switch (sortOption) {
      case "date-desc": {
        const da = a.createdTime ? new Date(a.createdTime).getTime() : 0;
        const db = b.createdTime ? new Date(b.createdTime).getTime() : 0;
        return db - da;
      }
      case "date-asc": {
        const da = a.createdTime ? new Date(a.createdTime).getTime() : 0;
        const db = b.createdTime ? new Date(b.createdTime).getTime() : 0;
        return da - db;
      }
      case "name-asc":
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
      case "name-desc":
        return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: "base" });
      case "size-desc": {
        const sa = a.size ? parseInt(a.size, 10) : 0;
        const sb = b.size ? parseInt(b.size, 10) : 0;
        return sb - sa;
      }
      case "size-asc": {
        const sa = a.size ? parseInt(a.size, 10) : 0;
        const sb = b.size ? parseInt(b.size, 10) : 0;
        return sa - sb;
      }
      default:
        return 0;
    }
  });
}

export function groupFilesByDate(files: DriveFile[]): DateGroup[] {
  const groups: Map<string, { dateLabel: string; files: DriveFile[] }> = new Map();

  files.forEach((file) => {
    const rawDate = file.createdTime ? file.createdTime.slice(0, 10) : "unknown";
    const label = getDateGroupLabel(file.createdTime);

    if (!groups.has(rawDate)) {
      groups.set(rawDate, { dateLabel: label, files: [] });
    }
    groups.get(rawDate)!.files.push(file);
  });

  return Array.from(groups.entries()).map(([dateKey, val]) => ({
    dateKey,
    dateLabel: val.dateLabel,
    files: val.files,
  }));
}
