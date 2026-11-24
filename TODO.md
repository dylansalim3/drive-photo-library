# Project Roadmap & TODO List 📌

Comprehensive roadmap and feature tracking for **Drive Photo Library (DPL)**, incorporating recommendations and architectural decisions from the `/grill-me` alignment sessions.

---

## 🚀 Phase 1: Mobile & Web Parity (Completed ✅)

- [x] **Batch Folder ZIP Download**:
  - [x] Backend recursive tree endpoint (`GET /api/tree?folderId=...&filter=...`).
  - [x] Web streaming ZIP downloader (`client-zip`) preserving directory structure.
  - [x] Android native `ZipDownloader` using `ZipOutputStream` writing directly to `MediaStore.Downloads` on Android 10+ (API 29+).
  - [x] Direct folder ZIP download button on individual folder cards in Web and Android.
- [x] **Multi-Item Selection Bar**:
  - [x] Multi-item selection toggle and card/row checkboxes.
  - [x] Long-press to select on mobile.
  - [x] Floating bottom action bar: `[ X items selected ]` `[ Download ZIP ]` `[ Mark Synced ]` `[ Deselect ]`.
  - [x] Recursive resolution of folders in multi-selection ZIP archives.
- [x] **Apple Photos Date Scrubber**:
  - [x] Vertical right-edge drag bar with smooth pointer/touch gesture detection.
  - [x] Floating frosted glass date indicator capsule showing current date and group item count.
  - [x] Tactile haptic feedback ticks on mobile when scrubbing between date groups (`TextHandleMove`).
  - [x] Auto-fade timeout (1.6s) to keep viewing area clean.
- [x] **Vacation Sync Center Modal / Bottom Sheet**:
  - [x] Dedicated vacation center surface separated from everyday preview workflow.
  - [x] One-tap "Download All as ZIP Archive".
  - [x] One-tap "Download Manifest (JSON)" for home ingestion.
  - [x] One-tap "Mark Everything Synced" to move staging media to `Travel Archive`.
- [x] **Optimized Filter Bar**:
  - [x] Removed bulky tab row to reclaim vertical screen estate.
  - [x] Integrated compact Sync Status filter dropdown (`Not-sync`, `Synced`, `All`) right next to date sorting.

---

## 👥 Phase 2: Multi-User Collaboration & External Drive Sharing (Completed ✅)

- [x] **Cloudflare D1 Multi-User Accounts**:
  - [x] Create database migration for `users` table:
    ```sql
    CREATE TABLE users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT DEFAULT 'editor', -- admin, editor, viewer
      created_at INTEGER NOT NULL
    );
    ```
  - [x] Migrate authentication endpoint `POST /api/auth/login` to query `users` table with Web Crypto PBKDF2/argon2 password hashing.
  - [x] Admin User Management UI in Web & Android:
    - [x] Create/invite new user accounts directly from app settings.
    - [x] Password reset / change password workflow.
    - [x] List active sessions and revoke access.
- [x] **Approach A: External Shared Drive & Folder Routing**:
  - [x] Support selecting and switching between different shared root folders or Shared Drives (Workspace).
  - [x] Clear setup documentation for family/friends to share folders with Editor permissions to the central server account (`docs/APPROACH_A_SETUP.md`).
- [x] **Per-User Media Attribution & Filtering**:
  - [x] Web & Android uploader filter chip (`@alice`, `@bob`, `@dylan`).
  - [x] Stamping `uploadedBy` Drive public property on new uploads.
  - [x] Uploader avatar pills on media thumbnails and details sheet.

---

## ⚡ Phase 3: Resumable Uploads & Large File Support (Completed ✅)

- [x] **Direct Google Drive Resumable Upload Protocol**:
  - [x] Overcome Cloudflare Pages 100MB body limit: Server initiates direct Google Drive resumable session with Google's API (`uploadType=resumable`).
  - [x] Server endpoint `POST /api/upload/init`: Server initiates a Google Drive resumable session with Google's API and returns the signed `location` URI.
  - [x] Client chunked uploader: Web (`ChunkedUploader.ts`) and Android (`ResumableUploader.kt`) chunk large files in 8MB slices with `Content-Range: bytes start-end/total`.
  - [x] Pause / Resume support on flaky hotel, airport, or cellular networks querying byte offset via `Content-Range: bytes */total`.
- [x] **Background Upload Queue**:
  - [x] Android WorkManager support (`UploadWorker.kt`) for reliable background uploads when the app is minimized.
  - [x] Retry policies with exponential backoff on connection drops (`BackoffPolicy.EXPONENTIAL`).

---

## 🗺️ Phase 4: EXIF Metadata & Travel Map Explorer (Completed ✅)

- [x] **EXIF Extraction**:
  - [x] Serverless or client-side EXIF reader (camera model, lens, aperture, shutter speed, ISO).
  - [x] GPS coordinates extraction (`latitude`, `longitude`, `altitude`).
  - [x] Display formatted EXIF specs in the fullscreen media lightbox.
- [x] **Interactive Travel Map View**:
  - [x] Map tab or toggle in gallery.
  - [x] Marker clustering showing where photos were taken during a trip.
  - [x] Tap cluster to filter gallery to that location.

---

## 🗑️ Phase 5: Soft Delete, Trash & Data Management (Completed ✅)

- [x] **Safe Trash Workflow**:
  - [x] Avoid irreversible permanent deletions from mobile.
  - [x] Moving items to a dedicated `Travel Trash` folder with `syncStatus = 'trash'`.
  - [x] Trash view with "Restore" and "Empty Trash" actions.
  - [x] Multi-item trash and restore in Web & Android floating selection bars.
  - [x] Single-item trash and restore buttons in fullscreen media lightbox.
- [x] **Storage Usage Breakdown**:
  - [x] In-app storage meter showing Drive quota, staging folder size, and archive size (`GET /api/storage`).
  - [x] Web `StorageUsageMeter` component and Android `VacationSyncBottomSheet` storage card with real-time breakdown progress bar.

---

## 🖥️ Phase 6: Desktop Ingestion & Automation (Completed ✅)

- [x] **Desktop Companion CLI / Sync Script**:
  - [x] Lightweight Python CLI script (`scripts/desktop_sync.py`) with zero external dependencies fetching `/api/tree?filter=not-sync`.
  - [x] Automatically downloads new vacation photos to home NAS/hard drive upon arriving home and hitting local Wi-Fi.
  - [x] Preserves hierarchical folder structure and verifies byte integrity via atomic `.dpl_part` downloads.
  - [x] Automatically triggers `/api/files/:id/mark-synced` upon verified download to move items to `Travel Archive`.
  - [x] Setup and automation guides (`docs/DESKTOP_SYNC.md`) for Synology NAS, TrueNAS, Linux/macOS Cron, and systemd.

---

## 🔒 Phase 7: Camera Auto-Backup, Video Gestures & Biometrics (Completed ✅)

- [x] **Background Camera Auto-Backup & Deduplication**:
  - [x] Backend preflight check endpoint (`GET /api/upload/check`) matching Drive `md5Checksum` or filename+size in staging folder.
  - [x] Tier 1 Deduplication: Android SQLite ledger (`dpl_sync_ledger.db`) providing instant 0ms skips for previously synced local media.
  - [x] Tier 2 Deduplication: ContentResolver MD5 byte hashing + remote Drive preflight check for zero-byte network skip of existing files.
  - [x] Android WorkManager background scheduler with `NetworkType.UNMETERED` (Wi-Fi) and `requiresCharging` constraints.
  - [x] Settings Hub Camera Auto-Backup card with status, constraints toggles, and manual "Scan & Backup Now" trigger.
- [x] **Advanced Video Player Gestures**:
  - [x] Double-tap left half (seek -10s) and right half (seek +10s) with haptic feedback tick and animated expanding badges (`<< 10s` / `10s >>`).
  - [x] Dual-zone vertical swipe gestures for screen brightness (left) and media volume (right) with centered progress pill overlay.
  - [x] Playback speed chip & dropdown selector in video top bar (`0.5x`, `0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`) controlling ExoPlayer.
- [x] **Biometric App Lock & Privacy**:
  - [x] AndroidX BiometricPrompt API supporting fingerprint, face unlock, and device credential fallback.
  - [x] Cold-start and background resume auto-lock with configurable timeouts (Immediately, 1m, 5m, 15m, Never).
  - [x] Recent Apps privacy masking toggle applying `WindowManager.LayoutParams.FLAG_SECURE` in Android app switcher.
  - [x] Full-screen animated `LockScreen` overlay protecting photo and video privacy.
