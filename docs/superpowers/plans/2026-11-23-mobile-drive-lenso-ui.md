# Mobile Ergonomics + Google Drive Navigation & Lenso UI Photo Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the mobile and desktop web experience into a streamlined Google Drive folder structure with Lenso UI-inspired Apple iOS/iPadOS "Liquid Glass" photo/video display, view switcher (Grid/List), mobile FAB bottom sheet, and fluid swipeable media viewer.

**Architecture:** Refactor `src/App.tsx` into modular components (`src/components/drive/` for DriveHeader, BreadcrumbsBar, FolderGrid, MediaGrid, MediaList, MobileFabSheet, and MediaViewerModal). Retain the full API and streaming contract while applying BoardUI design tokens with Liquid Glass overlay styling and touch gesture handling.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Remixicon (`@remixicon/react`), Cloudflare Pages Functions, BoardUI semantic design tokens.

---

### File Structure Map
- `src/components/drive/DriveHeader.tsx`: Sticky top bar with search pill, view mode toggle (Grid/List), settings and logout buttons.
- `src/components/drive/BreadcrumbsBar.tsx`: Fluid horizontal folder path breadcrumbs with "Back" button and folder item counts.
- `src/components/drive/MobileFabSheet.tsx`: Bottom-anchored thumb-zone FAB with slide-up Liquid Glass action sheet (New folder, Upload files, Upload folder).
- `src/components/drive/MediaGrid.tsx`: Lenso UI-inspired photo cards with edge-to-edge images, tactile scale feedback, and floating glass badges.
- `src/components/drive/MediaList.tsx`: Drive-style list view with thumbnail preview, title, date, size, and sync chip.
- `src/components/drive/MediaViewerModal.tsx`: Fullscreen media inspector with dark glassmorphism, touch swipe left/right, keyboard arrows, and floating glass control dock.
- `src/App.tsx`: Main application integrating the Drive navigation, view state, batch actions, and settings.

---

### Task 1: Create Drive Header & View Mode Switcher Component

**Files:**
- Create: `src/components/drive/DriveHeader.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement DriveHeader component**
Create `src/components/drive/DriveHeader.tsx` with search input, view switcher (Grid ⊞ vs List ☰), settings button, and user avatar. Ensure all interactive elements have `min-h-11 min-w-11` touch targets.

- [ ] **Step 2: Verify type check**
Run: `npm run build`
Expected: PASS without type errors.

- [ ] **Step 3: Commit**
```bash
git add src/components/drive/DriveHeader.tsx
git commit -m "feat(ui): add DriveHeader with search pill and view switcher"
```

---

### Task 2: Create BreadcrumbsBar & Subfolder Card/Row Component

**Files:**
- Create: `src/components/drive/BreadcrumbsBar.tsx`
- Create: `src/components/drive/FolderItems.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement BreadcrumbsBar & FolderItems**
Create `BreadcrumbsBar.tsx` featuring horizontal scrolling breadcrumbs, parent folder back navigation button (`RiArrowLeftLine`), and current folder title.
Create `FolderItems.tsx` supporting both Grid and List representation of subfolders with item count, sync status, and folder sync action.

- [ ] **Step 2: Verify type check**
Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**
```bash
git add src/components/drive/BreadcrumbsBar.tsx src/components/drive/FolderItems.tsx
git commit -m "feat(ui): add BreadcrumbsBar and FolderItems for Drive hierarchy"
```

---

### Task 3: Create Lenso UI MediaGrid & MediaList Components

**Files:**
- Create: `src/components/drive/MediaGrid.tsx`
- Create: `src/components/drive/MediaList.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement Lenso UI-style MediaGrid**
Create `MediaGrid.tsx` with:
- Edge-to-edge photo layout with `aspect-square` or 4:3.
- Apple Liquid Glass floating badge overlays:
  - Top-left: Sync pill (`bg-background-primary-default/75 backdrop-blur-md border border-white/20`).
  - Top-right: Media type pill (video / image icon).
  - Bottom: Translucent metadata overlay with filename and size.
- Tactile active scale effect (`active:scale-[0.98] transition-transform`).

- [ ] **Step 2: Implement MediaList**
Create `MediaList.tsx` for compact Google Drive row display with 48x48 thumbnail, metadata columns, and action button.

- [ ] **Step 3: Verify build**
Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**
```bash
git add src/components/drive/MediaGrid.tsx src/components/drive/MediaList.tsx
git commit -m "feat(ui): add Lenso UI-inspired MediaGrid and Drive MediaList"
```

---

### Task 4: Create Fluid Swipeable MediaViewerModal with Glass Dock

**Files:**
- Create: `src/components/drive/MediaViewerModal.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement MediaViewerModal**
Implement:
- Deep dark backdrop with `bg-black/90 backdrop-blur-xl`.
- Touch swipe navigation: `onTouchStart`, `onTouchMove`, `onTouchEnd` tracking horizontal delta (>50px triggers prev/next).
- Keyboard shortcuts: `ArrowLeft` (prev), `ArrowRight` (next), `Escape` (close).
- Floating iOS-style Liquid Glass bottom dock:
  - Prev / Next buttons (`RiArrowLeftSLine`, `RiArrowRightSLine`).
  - Item counter (`{index + 1} of {total}`).
  - Download button (`RiDownloadLine`).
  - Mark synced button (`RiCheckLine`).
- Stream-only video (`<video controls preload="metadata" playsInline />`) and image display.

- [ ] **Step 2: Verify build**
Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**
```bash
git add src/components/drive/MediaViewerModal.tsx
git commit -m "feat(ui): add swipeable MediaViewerModal with floating glass dock"
```

---

### Task 5: Create Mobile Floating Action Button (FAB) & Bottom Sheet

**Files:**
- Create: `src/components/drive/MobileFabSheet.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Implement MobileFabSheet**
Create `MobileFabSheet.tsx` anchored at the bottom-right on mobile devices (`fixed bottom-6 right-6 z-40 sm:hidden` respecting safe areas):
- `+` FAB button with subtle shadow and glass effect.
- Bottom sheet overlay presenting:
  - "New folder" (`RiFolderAddLine`)
  - "Upload files" (`RiImageAddLine`)
  - "Upload entire folder" (`RiFolderUploadLine`)
- Wire file and directory input triggers cleanly.

- [ ] **Step 2: Integrate into `src/App.tsx`**
Refactor `src/App.tsx` to seamlessly use all the new Drive and Lenso UI components, while preserving desktop drag-and-drop and batch operations.

- [ ] **Step 3: Verify build & tests**
Run: `npm run build`
Expected: PASS without errors.

- [ ] **Step 4: Commit**
```bash
git add src/components/drive/MobileFabSheet.tsx src/App.tsx
git commit -m "feat(ui): add MobileFabSheet and integrate Drive & Lenso UI components"
```

---

### Task 6: Deploy to Cloudflare Pages & Production Verification

**Files:**
- Target: Cloudflare Pages deployment via Wrangler

- [ ] **Step 1: Run production build**
Run: `npm run build`
Expected: Clean build output in `dist/`.

- [ ] **Step 2: Deploy to Cloudflare Pages**
Run: `npx wrangler pages deploy dist --project-name drive-photo-library`
Expected: Deployed URL output.

- [ ] **Step 3: Push commits to main**
Run: `git push origin main`
Expected: Successfully pushed to remote main branch.

- [ ] **Step 4: Verify production endpoint**
Test production site health and auth/drive status.
