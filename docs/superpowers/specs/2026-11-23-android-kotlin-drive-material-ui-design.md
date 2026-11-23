# Android Kotlin Google Drive Photo Library Design Specification

## Overview
A native Android mobile application written in Kotlin using Jetpack Compose and Material Design 3 (Material You) that connects to the deployed Cloudflare backend (`https://drive-photo-library.pages.dev`). The application provides an authentic Google Drive mobile user interface with a top search bar, folder hierarchy navigation with breadcrumbs, view mode switching (Grid ⊞ vs List ☰), a thumb-zone Floating Action Button (`+`) with bottom modal sheet for uploading, and a fullscreen swipeable media viewer with ExoPlayer video streaming and Coil image loading.

---

## 1. Architectural & Technical Stack

### Core Technologies
- **Language**: Kotlin 2.x
- **UI Framework**: Jetpack Compose with Material 3 (`androidx.compose.material3:material3`)
- **Networking**: OkHttp3 + Retrofit2 (`com.squareup.retrofit2:retrofit`) with `kotlinx.serialization`
- **Session & Cookie Persistence**: OkHttp persistent cookie jar via Android `SharedPreferences` to preserve login sessions
- **Image Loading**: Coil 3 (`io.coil-kt.coil3:coil-compose`) configured with OkHttp for stream-only thumbnail loading
- **Video Playback**: AndroidX Media3 ExoPlayer (`androidx.media3:media3-exoplayer`, `androidx.media3:media3-ui`)
- **Architecture**: MVI/MVVM with Kotlin Coroutines, `StateFlow`, and Android Jetpack ViewModel
- **Target SDK**: Android 14+ (API 34/35), minimum SDK 26 (Android 8.0 Oreo)

### Project Directory Layout
The Android project will reside in `android/` within the repository root:
```
android/
├── app/
│   ├── build.gradle.kts
│   └── src/main/
│       ├── AndroidManifest.xml
│       └── java/com/dylan/drivephotolibrary/
│           ├── MainActivity.kt
│           ├── DriveApplication.kt
│           ├── data/
│           │   ├── model/ (DriveFile, DriveFolder, Breadcrumb, AuthStatus, LoginRequest)
│           │   ├── api/ (DriveApiService)
│           │   ├── network/ (PersistentCookieJar, NetworkModule)
│           │   └── repository/ (DriveRepository)
│           ├── ui/
│           │   ├── theme/ (Color.kt, Theme.kt, Type.kt)
│           │   ├── components/
│           │   │   ├── DriveTopBar.kt
│           │   │   ├── BreadcrumbsBar.kt
│           │   │   ├── FolderCards.kt
│           │   │   ├── MediaGrid.kt
│           │   │   ├── MediaList.kt
│           │   │   ├── UploadBottomSheet.kt
│           │   │   └── SettingsDialog.kt
│           │   ├── screens/
│           │   │   ├── LoginScreen.kt
│           │   │   ├── DriveScreen.kt
│           │   │   └── MediaViewerScreen.kt
│           │   └── viewmodel/ (DriveViewModel.kt, DriveUiState.kt)
├── build.gradle.kts
├── settings.gradle.kts
└── gradle/
```

---

## 2. Authentication & Data Contracts

### Cloudflare API Integration
The app communicates with `https://drive-photo-library.pages.dev/api`:
1. `GET /api/auth/status`: Returns `{ configured, authenticated, driveConnected, username, rootFolderId }`.
2. `POST /api/auth/login`: Accepts `{ username, password }`. Sets `dpl_session` HTTP-only cookie.
3. `POST /api/auth/logout`: Clears session cookie on server and in OkHttp cookie jar.
4. `GET /api/files?filter={filter}&search={search}&folderId={folderId}`:
   Returns `{ files: DriveFile[], subfolders: DriveFolder[], breadcrumbs: Breadcrumb[] }`.
5. `POST /api/folders`: Creates subfolder inside `folderId`.
6. `POST /api/folders/{id}/mark-synced`: Marks subfolder and contents synced.
7. `POST /api/files/{id}/mark-synced`: Marks individual file synced.
8. `POST /api/upload`: Multi-part file upload with `folderId`.
9. `GET /api/media/thumbnail?id={id}`: JPEG thumbnail stream for grid/list preview.
10. `GET /api/media/file?id={id}`: Full media stream / video byte-range stream.

### Stream-Only Performance Policy
- Full photos/videos are **never** bulk-downloaded or cached to disk.
- Grid and List views request **thumbnails only** (`/api/media/thumbnail`).
- Tapping a photo/video opens the fullscreen viewer which streams that specific item on-demand.
- Downloads to local device storage occur only when the user explicitly taps "Download".

---

## 3. UI & UX Specifications (Google Drive Material 3)

### Screen 1: Login Screen
- Centered Material 3 elevated card with Drive Photo Library branding.
- Username and password text fields (`OutlinedTextField`).
- Loading indicator during authentication and clear error banner if credentials fail.

### Screen 2: Main Drive Screen
- **Material 3 SearchBar**:
  - Embedded at the top of the screen (`DockedSearchBar` / rounded pill).
  - Search query text field with clear button.
  - View mode toggle icon button: switch between Grid (⊞ `Icons.Default.GridView`) and List (☰ `Icons.Default.ViewList`).
  - User avatar circle triggering the Settings & Logout menu.
- **Filter Tabs**:
  - M3 `SecondaryTabRow` with: `Not-sync`, `Synced`, `All`.
- **Breadcrumb Navigation**:
  - Horizontally scrollable chip row: `Drive > Travel Inbox > Kyoto`.
  - Back arrow button visible whenever navigation depth > 1 to quickly ascend to parent folder.
  - Pull-to-refresh (`PullToRefreshBox` / `SwipeRefresh`) to reload file lists.
- **Content Section**:
  - **Folders Header & Cards**:
    - Grid: 2-column M3 elevated cards with folder icon, folder name, item count, sync status chip, and inline "Sync" action.
    - List: Compact rows with folder icon, name, and status.
  - **Media Grid Mode (Lenso UI + Material 3)**:
    - 2-column `LazyVerticalGrid`.
    - Aspect ratio 1:1 rounded cards (`RoundedCornerShape(16.dp)`).
    - Floating badges:
      - Top-left: Sync pill (green for Synced, amber for Not-sync).
      - Top-right: Media type badge (play icon for videos, camera for photos).
      - Bottom: Gradient scrim with filename and formatted size.
  - **Media List Mode**:
    - `LazyColumn` with 48×48dp thumbnail, filename, size, date, sync chip, and quick download button.
- **Floating Action Button (FAB) & Bottom Sheet**:
  - Bottom-right anchored `FloatingActionButton` (`+`).
  - Tap opens M3 `ModalBottomSheet` with:
    - "New folder" (opens dialog to create subfolder).
    - "Upload photos & videos" (launches Android system Photo Picker).
    - "Upload files" (launches Android system file picker).

### Screen 3: Fullscreen Media Viewer
- Fullscreen dark backdrop with translucent controls.
- **HorizontalPager**:
  - Fluid swipe left/right to browse adjacent photos and videos in the active folder.
  - Touch pinch-to-zoom for photos.
  - Media3 ExoPlayer with stream-only byte range playback for videos.
- **Floating Bottom Bar**:
  - Previous / Next navigation buttons.
  - Item counter (`4 of 24`).
  - Download button (saves to device MediaStore).
  - "Mark as synced" button if file is currently not-sync.
