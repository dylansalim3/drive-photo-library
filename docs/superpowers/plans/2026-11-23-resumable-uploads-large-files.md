# Phase 3: Resumable Uploads & Large File Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Google Drive Direct Resumable Upload protocol to overcome Cloudflare's 100MB body limit, support 4K video uploads in 8MB chunks with Pause/Resume, and integrate Android WorkManager for reliable background uploads.

**Architecture:** The server initiates a Google Drive resumable upload session (`POST /api/upload/init`) and returns the signed `uploadUrl`. The client (Web and Android) slices large files into 8MiB chunks, sends them with `Content-Range: bytes start-end/total`, queries upload progress with `bytes */total` to resume interrupted transfers, and Android manages long-running transfers via WorkManager.

**Tech Stack:** TypeScript, Cloudflare Pages Functions, Google Drive v3 Resumable Upload API, Web Streams / Blob Slicing, Kotlin, OkHttp3, Android WorkManager (`androidx.work:work-runtime-ktx`).

---

### Task 1: Backend Resumable Upload Session Endpoint (`POST /api/upload/init`)

**Files:**
- Create: `functions/api/upload/init.ts`
- Modify: `functions/_lib/drive.ts`

- [ ] **Step 1: Add `initiateResumableUpload` to `functions/_lib/drive.ts`**
Add helper that calls Google Drive API:
`POST https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true` with file metadata, `X-Upload-Content-Type`, and `X-Upload-Content-Length`.

- [ ] **Step 2: Create `functions/api/upload/init.ts`**
Endpoint requires session, validates file name, size, mimeType, resolves destination folder (`folderId` or `folderPath`), initiates resumable session, and returns `{ ok: true, uploadUrl, folderId }`.

- [ ] **Step 3: Verify build with `npm run build`**

---

### Task 2: Web Chunked & Resumable Uploader (`src/utils/chunkedUploader.ts`)

**Files:**
- Create: `src/utils/chunkedUploader.ts`
- Modify: `src/api.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create `src/utils/chunkedUploader.ts`**
Implement `ChunkedUploader` class:
- Slices file into 8 MiB (8 * 1024 * 1024 bytes) chunks.
- Supports `upload()`, `pause()`, `resume()`, and `cancel()`.
- Queries status on resume with `PUT uploadUrl` and `Content-Range: bytes */total`.
- Dispatches `onProgress(uploadedBytes, totalBytes, percent)`.

- [ ] **Step 2: Update `src/api.ts`**
Add `initResumableUpload(params)` calling `/api/upload/init`.

- [ ] **Step 3: Update `src/App.tsx` queue management**
Support Pause, Resume, and Cancel actions in the upload queue with progress bars and speed estimates.

- [ ] **Step 4: Verify build with `npm run build`**

---

### Task 3: Android Resumable Chunked Uploader & WorkManager

**Files:**
- Modify: `android/gradle/libs.versions.toml`
- Modify: `android/app/build.gradle.kts`
- Modify: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/data/api/DriveApiService.kt`
- Modify: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/data/model/Models.kt`
- Modify: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/data/repository/DriveRepository.kt`
- Create: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/data/upload/ResumableUploader.kt`
- Create: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/data/upload/UploadWorker.kt`
- Modify: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/viewmodel/DriveViewModel.kt`

- [ ] **Step 1: Add WorkManager dependency in Gradle**
Add `androidx.work:work-runtime-ktx` to `libs.versions.toml` and `build.gradle.kts`.

- [ ] **Step 2: Add `initUpload` to `DriveApiService` and `DriveRepository`**
Define `InitUploadRequest` and `InitUploadResponse`.

- [ ] **Step 3: Implement `ResumableUploader.kt` in Android**
Uses OkHttp to slice Uri/InputStream in 8MB chunks, query resume byte offset, and upload chunks.

- [ ] **Step 4: Implement `UploadWorker.kt` with WorkManager**
`CoroutineWorker` that handles background uploads, progress updates, and exponential backoff on network failure.

- [ ] **Step 5: Hook into `DriveViewModel.kt` and UI**
Enqueue background uploads via `WorkManager` when files are selected.

- [ ] **Step 6: Verify Android build with `gradlew.bat assembleDebug`**

---

### Task 4: Documentation & Roadmap Verification

**Files:**
- Modify: `TODO.md`
- Update: `AGENTS.md` / `README.md`

- [ ] **Step 1: Mark Phase 3 complete in `TODO.md`**
- [ ] **Step 2: Run final end-to-end builds for Web and Android**
