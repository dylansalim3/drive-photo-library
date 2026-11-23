# Drive Photo Library 📷✈️

A phone-first, stream-only media library and vacation companion for Google Drive. Designed for travelers, families, and photographers who want to preview, upload, and organize large collections of photos and videos from their phones without consuming device storage.

---

## 🌟 The Core Idea: "Preview-First, Vacation Staging"

Traditional cloud storage apps (Google Drive, Google Photos, Dropbox) automatically sync or cache heavy media files locally, rapidly consuming mobile storage on vacation.

**Drive Photo Library solves this with two core principles:**

1. **Stream-Only Media**: Full photos and videos are **never auto-downloaded or cached offline**. Grid views load low-resolution thumbnails on demand. Full resolution photos and 4K videos load and stream via HTTP `Range` passthrough only when tapped.
2. **Vacation Staging & Batch Archiving**:
   - Media uploaded while travelling is placed into a staging folder (`Travel Inbox`) and tagged with the public Drive property `syncStatus = 'not-sync'`.
   - Batch uploads made outside the app (from a camera SD card, desktop rclone, or Drive web) are already synced and require no staging tag.
   - When you arrive home, open the **Vacation Sync Center** to download your entire trip as a nested `.zip` archive or mark all staging files as `synced` (moving them to `Travel Archive`).

---

## ✨ Features

- 📱 **Dual Platform Support**:
  - **Web Application**: Responsive PWA built with React, Vite, Tailwind CSS v4, and BoardUI.
  - **Native Android App**: Modern Jetpack Compose UI with native Android MediaStore integration, Coil3, and Media3 ExoPlayer.
- 🗂️ **Batch Folder & Multi-Item ZIP Downloads**:
  - Download any folder or multi-selected items as a standard `.zip` archive that preserves nested subfolder hierarchy.
  - On Android, downloads stream directly into `Downloads/` via Scoped Storage without demanding intrusive permissions.
- 📆 **Apple Photos Style Date Scrubber**:
  - Pinned right-hand edge scrollbar. Drag vertically to scrub through dates with real-time haptic tick feedback and frosted-glass date capsules.
- 👥 **Multi-User Collaboration & External Drive Sharing**:
  - **Shared Drive Approach**: Connect one central Google account to the backend. Friends and family can share their own Google Drive folders with Editor permissions. No Google logins required on individual phones.
  - **Per-User Attribution**: Files uploaded through the app are stamped with `@username` so you can filter by who uploaded what.
- 🔍 **Fast Search & Advanced Sorting**:
  - Group by date (Calendar view) or continuous dense grid.
  - Sort by Date (Newest/Oldest), Name (A-Z/Z-A), or File Size.
  - Filter by media type (Photos, Videos) or sync status (Pending, Synced, All).
- 🏷️ **Vacation Sync Center**:
  - One-tap vacation batch export to ZIP.
  - Download machine-readable JSON manifests with file IDs, paths, and sizes.
  - One-tap "Mark Everything Synced" to organize staging into permanent storage.

---

## 🛠️ Architecture & Tech Stack

```
                                  ┌──────────────────────────────┐
                                  │      Google Drive API        │
                                  │  (Shared Drives & Folders)   │
                                  └──────────────▲───────────────┘
                                                 │ Server OAuth (AES-GCM encrypted in D1)
┌────────────────────────┐        ┌──────────────┴───────────────┐
│   Web Client (React)   │◄──────►│  Cloudflare Pages Functions  │
│  BoardUI + Tailwind v4 │  HTTP  │   - Auth & Session Cookies   │
└────────────────────────┘  REST  │   - Recursive File Tree API  │
                                  │   - Media Stream Proxy       │
┌────────────────────────┐        │   - D1 Database              │
│  Android App (Compose) │◄──────►│                              │
│   Coil3 + ExoPlayer    │        └──────────────────────────────┘
└────────────────────────┘
```

- **Frontend (Web)**: React 18, Vite, TypeScript, Tailwind CSS v4, BoardUI design system.
- **Mobile (Android)**: Kotlin, Jetpack Compose, Material 3, OkHttp, Coil3, Media3 ExoPlayer.
- **Backend**: Cloudflare Pages Functions (Edge TypeScript runtime).
- **Database & Auth**: Cloudflare D1 (Serverless SQLite) for sessions, user credentials, and encrypted Google OAuth tokens.

---

## 🚀 Getting Started

### 1. Web Development

```bash
# Clone the repository
git clone https://github.com/dylan/drive-photo-library.git
cd drive-photo-library

# Install dependencies
npm install

# Run local development server
npm run dev

# Run build verification
npm run build
```

### 2. Android App

```bash
cd android

# Build debug APK
./gradlew assembleDebug

# Install on a connected Android device or emulator
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## 🔐 Setup Instructions

### 1. Google Cloud Project Setup
1. Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a project.
2. Enable the **Google Drive API**.
3. Configure the OAuth Consent Screen and create an **OAuth 2.0 Client ID (Web Application)**.
4. Set the Authorised Redirect URI to:
   ```
   https://<your-pages-domain>.pages.dev/api/auth/drive/callback
   ```

### 2. Cloudflare Pages & D1 Database Setup
1. Create a Cloudflare D1 database:
   ```bash
   npx wrangler d1 create drive-photo-library-db
   ```
2. Update the `database_id` in `wrangler.toml` with the generated database ID.
3. Apply database migrations:
   ```bash
   npx wrangler d1 migrations apply drive-photo-library-db --remote
   ```
4. Set environment secrets in the Cloudflare Pages dashboard:
   - `APP_USER`: Default admin username.
   - `APP_PASS`: Default admin password.
   - `GOOGLE_CLIENT_ID`: From Google Cloud console.
   - `GOOGLE_CLIENT_SECRET`: From Google Cloud console.

### 3. Deploy
```bash
npm run build
npx wrangler pages deploy dist --project-name drive-photo-library
```
Open your deployed web app, sign in, and tap **Connect Google Drive** to authorize the backend.

---

## 📄 License

MIT License. Designed with care for seamless travel photography.
