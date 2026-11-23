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

## 👥 Phase 2: Multi-User Collaboration & External Drive Sharing

- [ ] **Cloudflare D1 Multi-User Accounts**:
  - [ ] Create database migration for `users` table:
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
  - [ ] Migrate authentication endpoint `POST /api/auth/login` to query `users` table with Web Crypto PBKDF2/argon2 password hashing.
  - [ ] Admin User Management UI in Web & Android:
    - [ ] Create/invite new user accounts directly from app settings.
    - [ ] Password reset / change password workflow.
    - [ ] List active sessions and revoke access.
- [ ] **Approach A: External Shared Drive & Folder Routing**:
  - [ ] Support selecting and switching between different shared root folders or Shared Drives (Workspace).
  - [ ] Clear setup documentation for family/friends to share folders with Editor permissions to the central server account.
- [ ] **Per-User Media Attribution & Filtering**:
  - [x] Web & Android uploader filter chip (`@alice`, `@bob`, `@dylan`).
  - [x] Stamping `uploadedBy` Drive public property on new uploads.
  - [ ] Uploader avatar pills on media thumbnails and details sheet.

---

## ⚡ Phase 3: Resumable Uploads & Large File Support

- [ ] **Direct Google Drive Resumable Upload Protocol**:
  - [ ] Problem: Cloudflare Pages Functions free tier has a 100MB body limit per request, preventing uploads of large 4K video clips.
  - [ ] Server endpoint `POST /api/upload/init`: Server initiates a Google Drive resumable session with Google's API and returns the signed `location` URI.
  - [ ] Client chunked uploader: Web and Android clients chunk large files (e.g., in 8MB chunks) and upload directly to Google's resumable endpoint or through a streaming proxy.
  - [ ] Pause / Resume support on flaky hotel, airport, or cellular networks.
- [ ] **Background Upload Queue**:
  - [ ] Android WorkManager support for reliable background uploads when the app is minimized.
  - [ ] Retry policies with exponential backoff on connection drops.

---

## 🗺️ Phase 4: EXIF Metadata & Travel Map Explorer

- [ ] **EXIF Extraction**:
  - [ ] Serverless or client-side EXIF reader (camera model, lens, aperture, shutter speed, ISO).
  - [ ] GPS coordinates extraction (`latitude`, `longitude`, `altitude`).
  - [ ] Display formatted EXIF specs in the fullscreen media lightbox.
- [ ] **Interactive Travel Map View**:
  - [ ] Map tab or toggle in gallery.
  - [ ] Marker clustering showing where photos were taken during a trip.
  - [ ] Tap cluster to filter gallery to that location.

---

## 🗑️ Phase 5: Soft Delete, Trash & Data Management

- [ ] **Safe Trash Workflow**:
  - [ ] Avoid irreversible permanent deletions from mobile.
  - [ ] Moving items to a dedicated `Travel Trash` folder with `syncStatus = 'trash'`.
  - [ ] Trash view with "Restore" and "Empty Trash" actions.
  - [ ] Optional 30-day auto-purge policy.
- [ ] **Storage Usage Breakdown**:
  - [ ] In-app storage meter showing Drive quota, staging folder size, and archive size.

---

## 🖥️ Phase 6: Desktop Ingestion & Automation

- [ ] **Desktop Companion CLI / Sync Script**:
  - [ ] Lightweight Python / Go script or rclone wrapper that fetches `/api/tree?filter=not-sync`.
  - [ ] Automatically downloads new vacation photos to home NAS/hard drive upon arriving home and hitting local Wi-Fi.
  - [ ] Automatically triggers `/api/files/:id/mark-synced` upon verified local checksum match.
