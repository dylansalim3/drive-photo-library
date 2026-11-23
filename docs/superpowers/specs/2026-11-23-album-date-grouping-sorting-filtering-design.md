# Album-First Date Grouping, Sorting, and Filtering Design

## Overview
Transform the photo library into a true **album-first** media experience across both the **Web application** and the **Android application**. Media items default to sorting by upload/creation date (newest first), with user-controlled date grouping (date section headers vs continuous grid), additional sorting options (date, name, size), and media type filtering (photos vs videos).

---

## 1. Requirements & Core Mechanics

### Sorting Capabilities
- **Default Sort**: Date (Newest first)
- **Options**:
  - `date-desc`: Date (Newest first) [Default]
  - `date-asc`: Date (Oldest first)
  - `name-asc`: Name (A → Z)
  - `name-desc`: Name (Z → A)
  - `size-desc`: Size (Largest first)
  - `size-asc`: Size (Smallest first)

### Filtering Capabilities
- **Media Type Filter**:
  - `all`: All media items (photos and videos)
  - `photos`: Images only (`isVideo == false`)
  - `videos`: Videos only (`isVideo == true`)
- **Sync Status Filter**:
  - Preserves the existing `Not-sync`, `Synced`, and `All` tabs.

### Date Grouping (Album View)
- **User Setting / View Toggle**:
  - **Grouped by Date** (`grouped`): When sorted by date, media items are partitioned into date sections (e.g., *"Today"*, *"Yesterday"*, *"November 23, 2026"*, *"May 14, 2026"*) with section headers indicating date and item counts.
  - **Continuous Grid** (`continuous`): Media items flow seamlessly in the grid or list without date dividers, while strictly maintaining the selected sort order.
- **Persistence**: User selection for `dateGrouping` and `sortOption` is persisted in local storage / SharedPreferences.

---

## 2. Technical Architecture

### Web Application (`src/`)
- **State in `App.tsx`**:
  - `sortOption`: State persisted in `localStorage["drive-sort-option"]` (default `"date-desc"`).
  - `mediaTypeFilter`: State (`"all" | "photos" | "videos"`).
  - `dateGrouping`: State persisted in `localStorage["drive-date-grouping"]` (default `"grouped"`).
- **Date Utilities**:
  - Grouping function in `src/utils/dateGrouping.ts` to convert `createdTime` strings into grouped buckets (`Today`, `Yesterday`, `MMM d, yyyy`).
- **Component**:
  - `src/components/drive/MediaSortFilterBar.tsx`: Houses the date grouping toggle pill, media type filter chips, and sort dropdown.
  - `src/components/drive/MediaGrid.tsx` & `src/components/drive/MediaList.tsx`: Updated to render date headers when `dateGrouping === "grouped"`.

### Android Application (`android/`)
- **State in `DriveViewModel.kt`**:
  - `sortOption: SortOption` (`DATE_DESC`, `DATE_ASC`, `NAME_ASC`, `NAME_DESC`, `SIZE_DESC`, `SIZE_ASC`)
  - `mediaTypeFilter: MediaTypeFilter` (`ALL`, `PHOTOS`, `VIDEOS`)
  - `dateGrouping: DateGrouping` (`GROUPED`, `CONTINUOUS`)
- **UI Components**:
  - `MediaSortFilterBar.kt`: Jetpack Compose row with M3 FilterChips, Sort Menu, and Grouping toggle.
  - `MediaGrid.kt`: Uses `GridItemSpan(2)` header items to display date headers when grouped.
  - `MediaList.kt`: Inserts date header rows into `LazyColumn`.
