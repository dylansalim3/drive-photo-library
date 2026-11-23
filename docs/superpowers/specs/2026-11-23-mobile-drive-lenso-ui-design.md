# Mobile Ergonomics + Google Drive Navigation & Lenso UI Photo Optimization Design

## Problem Statement
The Drive Photo Library web application works well for folder uploads and batch syncing, but its mobile experience and photo presentation require refinement:
1. **Bulky Upload Area on Mobile**: The static upload dropzone occupies significant vertical space on smaller screens, pushing folders and media below the fold.
2. **Drive Navigation & View Modes**: Users expect a familiar Google Drive structure: search at the top, clear folder hierarchy with breadcrumbs and "Up / Back" controls, and the ability to switch between **Grid** (visual preview) and **List** (compact metadata) views.
3. **Photo Presentation (Lenso UI Inspiration)**: Lenso UI (`https://github.com/LioRael/lenso-ui`) showcases Apple iOS/iPadOS-inspired aesthetics: "Liquid Glass" translucent materials (`backdrop-blur`, subtle borders), edge-to-edge media cards, tactile tap feedback, and floating overlay badges (sync status, video duration/type, file size).
4. **Viewer Ergonomics**: The current lightbox opens a single file and forces the user to close it to pick the next one. On mobile and desktop, users need fluid swiping (touch drag) and keyboard navigation (← / → arrow keys, Escape) with a floating bottom glass control dock.
5. **Stream-Only Constraint**: Mobile devices must remain light: no caching of entire folders, thumbnails loaded lazily, videos range-streamed (`preload="metadata"`), and downloads performed on demand.

---

## Architectural & UX Specification

### 1. Sticky Google Drive App Header & Navigation
- **Top App Bar**:
  - Search pill with search icon and clear button (`RiSearchLine`, `RiCloseCircleLine`).
  - View switcher: Toggle between Grid (⊞ `RiGridLine`) and List (☰ `RiListCheck2` / `RiMenuLine`).
  - Settings (`RiSettings3Line`) and Sign out (`RiLogoutBoxLine`) accessible via touch-friendly buttons (`min-h-11 min-w-11`).
- **Breadcrumbs & Folder Navigation**:
  - Horizontal scrolling breadcrumb bar (`Drive > Travel Inbox > Tokyo 2026`) with subtle glass surface.
  - If inside a subfolder, an explicit back / parent folder button (`RiArrowLeftLine` or tap on parent crumb).
  - Folder metadata indicator: current folder name, item count, and filter tabs (Not-sync, Synced, All).

### 2. Mobile Floating Action Button (FAB) & Bottom Sheet
- On mobile/touch screens (and available as quick action), a floating action button (`+` icon `RiAddLine`) anchored at the bottom-right thumb zone, respecting `env(safe-area-inset-bottom)`.
- Tapping the FAB presents a native-feeling bottom action sheet with backdrop blur:
  - **New folder** (`RiFolderAddLine`): opens folder creation prompt.
  - **Upload photos/videos** (`RiImageAddLine` / `RiUpload2Line`): triggers native file picker.
  - **Upload full folder** (`RiFolderUploadLine`): triggers folder selection (`webkitdirectory`).
- On desktop screens (`sm:` and above), the FAB transitions into top action buttons or keeps the upload dropzone accessible.

### 3. Lenso UI-Inspired Photo & Video Display
- **Grid View**:
  - 2 columns on mobile (`grid-cols-2`), 3 to 4 columns on tablets/desktop (`sm:grid-cols-3 md:grid-cols-4`).
  - Fluid rounded cards (`rounded-2xl` / `rounded-3xl`) with subtle border (`border-border-button-default`) and hover/active tactile scale (`active:scale-[0.98] transition-transform duration-200`).
  - Aspect ratio: Square or 4:3 edge-to-edge media thumbnail.
  - **Liquid Glass Floating Badges**:
    - Top-left: Translucent glass pill for sync status (`bg-background-primary-default/70 backdrop-blur-md border border-white/20 dark:border-white/10 text-xs px-2 py-0.5 rounded-full`).
    - Top-right: Translucent glass pill for media type icon (camera/image or video badge).
    - Bottom overlay: Semi-transparent gradient/glass bar showing filename and file size without cluttering the photo surface.
- **List View**:
  - Compact row format:
    - Square thumbnail preview (48×48px) on the left.
    - Filename, size, creation date in the middle.
    - Sync status chip and quick actions (download, mark sync) on the right.

### 4. Fluid Media Inspector / Lightbox with Touch Swiping
- **Backdrop**: Deep dark scrim with high-grade backdrop blur (`bg-black/90 backdrop-blur-xl`).
- **Touch Gesture Swiping**:
  - Track `onTouchStart`, `onTouchMove`, and `onTouchEnd` on mobile.
  - Swiping left navigates to `next` file.
  - Swiping right navigates to `previous` file.
  - Swiping down closes the viewer.
- **Desktop Navigation**:
  - Arrow keys (`ArrowLeft`, `ArrowRight`) to cycle through photos/videos.
  - `Escape` key to close.
- **Floating Liquid Glass Bottom Control Dock**:
  - Translucent pill floating above the bottom safe area:
    - Previous button (← `RiArrowLeftSLine`)
    - Item counter: `Image 4 of 28`
    - Next button (→ `RiArrowRightSLine`)
    - Quick download button (`RiDownloadLine`)
    - Quick mark synced button (`RiCheckLine`) if file is not-sync.
- **Stream-Only Playback**:
  - Full-resolution photo or range-streamed video (`preload="metadata"`, `playsInline`) is fetched only when that item is selected/active.

### 5. Mobile Ergonomics & Safe Areas (`adapt` standard)
- Touch targets: Minimum 44×44px (`min-h-11 min-w-11`).
- Safe areas: Fixed elements (FAB, bottom sheets, sticky viewer dock) pad with `env(safe-area-inset-bottom)` and `env(safe-area-inset-top)`.
- No horizontal scrolling at 320px viewport width.
