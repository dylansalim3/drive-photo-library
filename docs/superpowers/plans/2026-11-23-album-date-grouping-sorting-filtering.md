# Album-First Date Grouping, Sorting, and Filtering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement album-first date sorting, date grouping (headers vs continuous grid), and media type filtering across both the Web application and the Android Kotlin application.

**Architecture:** Add sort, filter, and date-grouping helpers on both platforms. On Web, introduce `MediaSortFilterBar.tsx` and date-grouping logic in `MediaGrid.tsx` and `MediaList.tsx`. On Android, extend `DriveViewModel.kt`, add `MediaSortFilterBar.kt`, and adapt `MediaGrid.kt` and `MediaList.kt` with `GridItemSpan` headers.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, BoardUI tokens, Kotlin 2.x, Jetpack Compose Material 3.

---

### File Structure Map
- `src/utils/dateGrouping.ts`: Web date grouping and sorting utilities.
- `src/components/drive/MediaSortFilterBar.tsx`: Web sort dropdown, type filter chips, and date grouping toggle.
- `src/components/drive/MediaGrid.tsx`: Web photo grid supporting both grouped date sections and continuous flow.
- `src/components/drive/MediaList.tsx`: Web list view supporting grouped date sections and continuous flow.
- `src/App.tsx`: Web integration with state persistence.
- `android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/util/Formatters.kt`: Android date grouping helper.
- `android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/viewmodel/DriveViewModel.kt`: Android sort, filter, and date-grouping state.
- `android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/components/MediaSortFilterBar.kt`: Android M3 bar with FilterChips, Sort Menu, and Grouping toggle.
- `android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/components/MediaGrid.kt`: Android grid with `GridItemSpan(2)` date headers.
- `android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/components/MediaList.kt`: Android list with date headers.
- `android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/screens/DriveScreen.kt`: Android screen integration.

---

### Task 1: Web Date Grouping Utilities & MediaSortFilterBar

**Files:**
- Create: `src/utils/dateGrouping.ts`
- Create: `src/components/drive/MediaSortFilterBar.tsx`

- [ ] **Step 1: Implement `dateGrouping.ts`**
Provide sorting (date desc/asc, name asc/desc, size desc/asc), media type filtering (all, photos, videos), and date grouping (Today, Yesterday, Date format).

- [ ] **Step 2: Implement `MediaSortFilterBar.tsx`**
Create the component with media type chips (All, Photos, Videos), sort dropdown selector, and date grouping toggle button (📅 Grouped vs ▦ Continuous).

- [ ] **Step 3: Verify build**
Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add src/utils/dateGrouping.ts src/components/drive/MediaSortFilterBar.tsx
git commit -m "feat(web): add dateGrouping utilities and MediaSortFilterBar"
```

---

### Task 2: Web MediaGrid, MediaList & App Integration

**Files:**
- Modify: `src/components/drive/MediaGrid.tsx`
- Modify: `src/components/drive/MediaList.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Update `MediaGrid.tsx` and `MediaList.tsx`**
Support `groupedFiles: DateGroup[]` or flat `files: DriveFile[]` based on `dateGrouping === "grouped"`. When grouped, render clean date headers with item counts.

- [ ] **Step 2: Integrate into `src/App.tsx`**
Add sort, filter, and grouping state with `localStorage` persistence, wire `MediaSortFilterBar`, and pass sorted/filtered items to `MediaGrid` and `MediaList`.

- [ ] **Step 3: Verify build**
Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add src/components/drive/MediaGrid.tsx src/components/drive/MediaList.tsx src/App.tsx
git commit -m "feat(web): integrate album-first date grouping, sorting, and filtering"
```

---

### Task 3: Android Date Grouping, ViewModel & MediaSortFilterBar

**Files:**
- Modify: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/util/Formatters.kt`
- Modify: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/viewmodel/DriveViewModel.kt`
- Create: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/components/MediaSortFilterBar.kt`

- [ ] **Step 1: Update `Formatters.kt` & `DriveViewModel.kt`**
Add `getDateGroupLabel(dateStr: String?): String`, sort enums (`DATE_DESC`, `DATE_ASC`, `NAME_ASC`, `NAME_DESC`, `SIZE_DESC`, `SIZE_ASC`), `MediaTypeFilter` enum, `DateGrouping` enum, and reactive sorting/grouping methods in `DriveViewModel`.

- [ ] **Step 2: Implement `MediaSortFilterBar.kt`**
Build M3 Compose bar with FilterChips, Sort Menu, and Grouping toggle.

- [ ] **Step 3: Verify compile**
Run: `cd android && ./gradlew compileDebugKotlin`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 4: Commit**
```bash
git add android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/util/Formatters.kt android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/viewmodel/DriveViewModel.kt android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/components/MediaSortFilterBar.kt
git commit -m "feat(android): add MediaSortFilterBar and ViewModel sorting/filtering"
```

---

### Task 4: Android MediaGrid, MediaList & DriveScreen Integration

**Files:**
- Modify: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/components/MediaGrid.kt`
- Modify: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/components/MediaList.kt`
- Modify: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/screens/DriveScreen.kt`

- [ ] **Step 1: Update `MediaGrid.kt` and `MediaList.kt`**
In `MediaGrid`, use `item(span = { GridItemSpan(2) })` to display date headers when `dateGrouping == DateGrouping.GROUPED`. In `MediaList`, insert date header rows.

- [ ] **Step 2: Update `DriveScreen.kt`**
Insert `MediaSortFilterBar` between breadcrumbs and the media content.

- [ ] **Step 3: Verify Android assembleDebug**
Run: `cd android && ./gradlew assembleDebug`
Expected: BUILD SUCCESSFUL with `app-debug.apk` built.

- [ ] **Step 4: Commit**
```bash
git add android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/components/MediaGrid.kt android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/components/MediaList.kt android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/screens/DriveScreen.kt
git commit -m "feat(android): support date grouping and sort/filter bar in DriveScreen"
```

---

### Task 5: Deploy Web and Install on Android Emulators

**Files:**
- Target: Cloudflare Pages deployment & emulator installation

- [ ] **Step 1: Run production web build & deploy**
Run: `npm run build && npx wrangler pages deploy dist --project-name drive-photo-library`
Expected: Deployed URL.

- [ ] **Step 2: Update Android apps on running emulators**
Run: `adb -s emulator-5554 install -r android/app/build/outputs/apk/debug/app-debug.apk && adb -s emulator-5556 install -r android/app/build/outputs/apk/debug/app-debug.apk`
Expected: Success on both.

- [ ] **Step 3: Push commits to main**
Run: `git push origin main`
Expected: Successfully pushed to remote repository.
