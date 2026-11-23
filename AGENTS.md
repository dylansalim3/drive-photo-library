# AGENTS.md — Agent Developer Guidelines

## 1. Project Overview & Core Philosophy

**Drive Photo Library (DPL)** is a phone-first, stream-only media viewer and travel companion for Google Drive photos and videos. It bridges the gap between massive external Google Drive storage and lightweight mobile devices.

### Primary Purpose: "Preview-First, Vacation Staging"
1. **Preview, Not Sync**: The phone is meant for on-the-go browsing, sharing, and reviewing memories during vacation or daily life. It is **not** a sync client like the official Google Drive or Google Photos apps.
2. **Vacation Staging Workflow**:
   - Photos and videos uploaded via the app go into a staging folder (`Travel Inbox`) tagged with the public Drive property `syncStatus = 'not-sync'`.
   - Batch uploads done outside the app (via desktop rclone, USB hard drive, or Drive web) are already synced and require no staging tag.
   - When the user arrives home from vacation, they open the **Vacation Sync Center** to either download the full directory tree as a ZIP archive or mark items as `synced` (moving them to `Travel Archive`).

---

## 2. The Invariant Rules (DO NOT BREAK)

### Rule 1: The Stream-Only Rule (Zero Accidental Offline Caching)
- **Thumbnails Only**: Grid views must display low-resolution thumbnails (`/api/media/thumbnail`). Full media files must **never** be downloaded automatically into local storage or IndexedDB.
- **On-Demand Streaming**: Full images or videos load **only** when a user explicitly taps an item.
- **Range Passthrough**: Video playback uses HTTP `Range` request passthrough to the Drive API. The server proxies the byte stream so users can seek without downloading the entire video file.
- **Cache-Control: `no-store`**: All media endpoints must send `Cache-Control: no-store` to prevent service workers or browser caches from silently eating user phone storage.

### Rule 2: Multi-Item & Folder ZIP Downloads Preserve Hierarchy
- When downloading a folder or batch of selected items, the backend recursive tree endpoint (`/api/tree`) resolves full nested paths.
- The client (web `client-zip` or Android `ZipDownloader`) archives the files into a standard `.zip` archive matching the folder structure on Google Drive, writing directly to `Downloads`.

### Rule 3: Multi-User via Shared Drive (Approach A)
- **Single Connected Server Account**: The server maintains a single authenticated Google OAuth refresh token in Cloudflare D1.
- **External Google Drives**: External accounts (personal, family, or travel companions) share their Drive folder or Shared Drive with Editor permissions to the connected account.
- **Zero Client OAuth**: End-users do not authenticate with Google on their phones. They log into the app via Cloudflare D1 user credentials.
- **Upload Attribution**: Files uploaded through the app are stamped with public Drive property `uploadedBy = <username>`, enabling per-user filtering (`@alice`, `@bob`).

---

## 3. Technology Stack & Directory Structure

```
drive-photo-library/
├── src/                          # Web Frontend (React + Vite + Tailwind CSS v4)
│   ├── components/
│   │   ├── drive/                # Core Drive components (AppleDateScrubber, MediaGrid, MediaList, etc.)
│   │   └── ui/                   # BoardUI design system primitives (Button, Input, Chip, Avatar, etc.)
│   ├── utils/                    # ZIP downloader, API client, date formatters
│   └── App.tsx                   # Main Web application view & state
├── functions/                    # Cloudflare Pages Functions Backend (TypeScript)
│   ├── _lib/                     # Drive API helpers, crypto, D1 database handlers
│   └── api/                      # REST endpoints (/files, /tree, /media, /auth, /upload)
├── android/                      # Native Android Application (Kotlin + Jetpack Compose)
│   └── app/src/main/kotlin/com/dylan/drivephotolibrary/
│       ├── data/                 # Retrofit API, Models, Repository, ZipDownloader
│       └── ui/                   # Jetpack Compose screens, components, ViewModels
├── migrations/                   # Cloudflare D1 SQLite database migrations
├── wrangler.toml                 # Cloudflare Pages & D1 configuration
└── AGENTS.md                     # This file
```

---

## 4. Web Frontend Guidelines (BoardUI Only)

- **Design System**: Use BoardUI design primitives located in `src/components/ui/` and `src/styles/` (`globals.css`, `theme.css`, `typography.css`).
- **Do not introduce foreign UI libraries** (no MUI, shadcn, Chakra, etc.).
- **BoardUI Semantics**: Always use semantic design tokens and classes (no hardcoded arbitrary hex values in layout components).
- **Date Scrubber**: `AppleDateScrubber.tsx` pinned to the right edge with haptic feedback simulation and frosted glass date indicator.
- **Build Verification**: Any change to `src/` or `functions/` must pass `npm run build` (`tsc -b && vite build`) without warnings or errors before deployment.

---

## 5. Android Native App Guidelines (Jetpack Compose)

- **Architecture**: MVI/MVVM pattern using `DriveViewModel`, Kotlin Coroutines, and `StateFlow`.
- **Image & Video**: Coil3 (`coil3.compose.AsyncImage`) for thumbnail rendering; Media3 ExoPlayer (`androidx.media3:media3-exoplayer`) for streaming video.
- **Storage**: Use `MediaStore.Downloads` on Android 10+ (API 29+) with `IS_PENDING` flag for saving `.zip` files and manifests without requiring legacy storage permissions.
- **Haptic Feedback**: Use `LocalHapticFeedback.current.performHapticFeedback(HapticFeedbackType.TextHandleMove)` on scrubber drag steps.
- **Build Verification**: Run `./gradlew assembleDebug` in `android/` and verify the output APK exists.

---

## 6. Cloudflare Pages & Backend API Contract

- `GET /api/auth/status` — Returns `{ configured, authenticated, driveConnected, username, rootFolderId }`.
- `POST /api/auth/login` — Authenticates against Cloudflare D1 sessions.
- `GET /api/files?filter=all|not-sync|synced&folderId=&search=` — Returns files, subfolders, and breadcrumbs.
- `GET /api/tree?folderId=&filter=` — Returns full recursive file tree `{ ok, folderId, folderName, count, items: [{id, name, path, size, mimeType}] }`.
- `GET /api/media/thumbnail?id=` — Returns cached low-res thumbnail image (`Cache-Control: no-store`).
- `GET /api/media/file?id=&download=1` — Range-passthrough stream proxy for full media and video.
- `POST /api/upload` — Multipart file upload tagged with `syncStatus = "not-sync"` and `uploadedBy`.
- `POST /api/files/:id/mark-synced` — Moves file from staging to `Travel Archive`.
- `POST /api/folders/:id/mark-synced` — Recursively moves all contents of folder to `Travel Archive`.
