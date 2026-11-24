# Background Camera Auto-Backup, Advanced Video Gestures & Biometric App Lock Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a flagship feature trio: (1) Background Camera Auto-Backup on Android with Two-Tier Deduplication (Local SQLite ledger + Drive MD5 preflight check) under Wi-Fi & Charging constraints; (2) YouTube/Netflix-tier Video Player Gestures (double-tap 10s skip with ripple overlay, vertical swipe for volume/brightness, and playback speed picker); (3) Biometric App Lock & Privacy (Fingerprint/Face unlock, configurable timeout, and Recent Apps screen obscuring).

**Architecture:** 
- **Auto-Backup & Deduplication**: Cloudflare Pages Function `/api/upload/check` performs Google Drive MD5 and filename+size preflight deduplication. Android Android WorkManager `AutoBackupWorker` periodically queries `DCIM/Camera` in `MediaStore`, consults local SQLite `sync_ledger` (Tier 1 instant skip), verifies remote MD5 with Drive (Tier 2 zero-byte skip), and uses `ResumableUploader` for new media.
- **Video Player Gestures**: `MediaViewerScreen.kt` overlays pointer input gesture detectors handling double-tap seeks (±10s) with animated badge indicators, dual-zone vertical drags for volume (`AudioManager`) and screen brightness (`WindowAttributes`), and an ExoPlayer playback speed selector (`0.5x` to `2.0x`).
- **Biometric App Lock & Privacy**: `androidx.biometric:biometric` integrated with `SecurityPreferences`, managing cold start and background timeout unlocks with full-screen lock scrim and `WindowManager.LayoutParams.FLAG_SECURE` app switcher privacy masking.

**Tech Stack:** Kotlin, Jetpack Compose (Material 3), ExoPlayer (`androidx.media3`), Android WorkManager (`androidx.work:work-runtime-ktx`), Android Biometric (`androidx.biometric:biometric`), SQLite, TypeScript, Cloudflare Pages Functions, Google Drive v3 API.

---

### Task 1: Remote Pre-flight Deduplication Endpoint (`GET /api/upload/check`)

**Files:**
- Create: `functions/api/upload/check.ts`
- Modify: `functions/_lib/drive.ts`

- [ ] **Step 1: Add `findExistingDriveFile` to `functions/_lib/drive.ts`**
Add helper that queries Google Drive for files matching MD5 checksum or filename + size:
```typescript
export async function findExistingDriveFile(
  env: Env,
  params: { md5?: string; fileName?: string; size?: number; folderId?: string }
): Promise<{ id: string; name: string; matchType: "md5" | "name_size" } | null> {
  const rootId = await getRootFolderId(env);
  const targetFolderId = params.folderId || (await findOrCreateFolder(env, INBOX_FOLDER, rootId, null));
  if (!targetFolderId) return null;

  // 1. If MD5 provided, query globally within root or staging
  if (params.md5) {
    const md5Query = `trashed = false and md5Checksum = '${params.md5.replace(/'/g, "\\'")}'`;
    const res = await driveFetch(env, `/drive/v3/files?q=${encodeURIComponent(md5Query)}&fields=${encodeURIComponent("files(id, name, md5Checksum, size)")}&pageSize=1`);
    if (res && res.ok) {
      const data = (await res.json()) as { files?: Array<{ id: string; name: string }> };
      if (data.files && data.files.length > 0) {
        return { id: data.files[0].id, name: data.files[0].name, matchType: "md5" };
      }
    }
  }

  // 2. Fallback check: name and size in target folder
  if (params.fileName && params.size && params.size > 0) {
    const nameQuery = `trashed = false and '${targetFolderId}' in parents and name = '${params.fileName.replace(/'/g, "\\'")}'`;
    const res = await driveFetch(env, `/drive/v3/files?q=${encodeURIComponent(nameQuery)}&fields=${encodeURIComponent("files(id, name, size)")}&pageSize=1`);
    if (res && res.ok) {
      const data = (await res.json()) as { files?: Array<{ id: string; name: string; size?: string }> };
      if (data.files && data.files.length > 0) {
        const f = data.files[0];
        if (!f.size || parseInt(f.size, 10) === params.size) {
          return { id: f.id, name: f.name, matchType: "name_size" };
        }
      }
    }
  }

  return null;
}
```

- [ ] **Step 2: Create `functions/api/upload/check.ts`**
Create endpoint handling `GET /api/upload/check?md5=...&size=...&fileName=...&folderId=...`:
```typescript
import { findExistingDriveFile } from "../../_lib/drive";
import { errorResponse, jsonResponse, requireSession } from "../../_lib/http";
import type { PagesContext } from "../../_lib/types";

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const session = await requireSession(context);
  if (typeof session !== "string") return session;

  const url = new URL(context.request.url);
  const md5 = url.searchParams.get("md5")?.trim().toLowerCase() || undefined;
  const fileName = url.searchParams.get("fileName")?.trim() || undefined;
  const sizeStr = url.searchParams.get("size");
  const folderId = url.searchParams.get("folderId")?.trim() || undefined;
  const size = sizeStr ? parseInt(sizeStr, 10) : undefined;

  if (!md5 && (!fileName || !size)) {
    return errorResponse("BAD_REQUEST", "Provide either 'md5' or both 'fileName' and 'size'.", 400);
  }

  try {
    const existing = await findExistingDriveFile(context.env, { md5, fileName, size, folderId });
    if (existing) {
      return jsonResponse({
        ok: true,
        exists: true,
        fileId: existing.id,
        fileName: existing.name,
        matchType: existing.matchType,
      });
    }

    return jsonResponse({
      ok: true,
      exists: false,
    });
  } catch (err) {
    return errorResponse(
      "SERVER_ERROR",
      err instanceof Error ? err.message : "Failed to check file existence.",
      500
    );
  }
}
```

- [ ] **Step 3: Verify build with `npm run build`**
Run: `npm run build`
Expected: PASS with no TypeScript errors.

- [ ] **Step 4: Commit**
```bash
git add functions/_lib/drive.ts functions/api/upload/check.ts
git commit -m "feat(api): add remote preflight upload deduplication endpoint"
```

---

### Task 2: Android Two-Tier Deduplication & Local Sync Ledger

**Files:**
- Create: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/data/backup/SyncLedgerDatabase.kt`
- Create: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/data/backup/HashUtils.kt`
- Modify: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/data/api/DriveApiService.kt`
- Modify: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/data/model/Models.kt`
- Modify: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/data/repository/DriveRepository.kt`

- [ ] **Step 1: Define API Models & `DriveApiService` endpoint**
In `Models.kt`:
```kotlin
@Serializable
data class FileCheckResponse(
    val ok: Boolean = true,
    val exists: Boolean = false,
    val fileId: String? = null,
    val fileName: String? = null,
    val matchType: String? = null
)
```
In `DriveApiService.kt`:
```kotlin
@GET("upload/check")
suspend fun checkFileExists(
    @Query("md5") md5: String? = null,
    @Query("fileName") fileName: String? = null,
    @Query("size") size: Long? = null,
    @Query("folderId") folderId: String? = null
): FileCheckResponse
```

- [ ] **Step 2: Implement `HashUtils.kt` for MD5 calculation**
Create `android/app/src/main/kotlin/com/dylan/drivephotolibrary/data/backup/HashUtils.kt`:
```kotlin
package com.dylan.drivephotolibrary.data.backup

import android.content.ContentResolver
import android.net.Uri
import java.security.MessageDigest

object HashUtils {
    fun calculateMd5(contentResolver: ContentResolver, uri: Uri): String? {
        return try {
            val digest = MessageDigest.getInstance("MD5")
            contentResolver.openInputStream(uri)?.use { stream ->
                val buffer = ByteArray(8192)
                var bytesRead: Int
                while (stream.read(buffer).also { bytesRead = it } != -1) {
                    digest.update(buffer, 0, bytesRead)
                }
            } ?: return null
            digest.digest().joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            null
        }
    }
}
```

- [ ] **Step 3: Implement `SyncLedgerDatabase.kt` (SQLite Ledger)**
Create `android/app/src/main/kotlin/com/dylan/drivephotolibrary/data/backup/SyncLedgerDatabase.kt` using `SQLiteOpenHelper`:
```kotlin
package com.dylan.drivephotolibrary.data.backup

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper

class SyncLedgerDatabase(context: Context) : SQLiteOpenHelper(context, DATABASE_NAME, null, DATABASE_VERSION) {

    companion object {
        private const val DATABASE_NAME = "dpl_sync_ledger.db"
        private const val DATABASE_VERSION = 1
        const val TABLE_LEDGER = "media_sync_ledger"
        const val COL_MEDIA_STORE_ID = "media_store_id"
        const val COL_CONTENT_HASH = "content_hash"
        const val COL_FILE_NAME = "file_name"
        const val COL_FILE_SIZE = "file_size"
        const val COL_DATE_MODIFIED = "date_modified"
        const val COL_DRIVE_FILE_ID = "drive_file_id"
        const val COL_SYNC_STATUS = "sync_status" // SYNCED, SKIPPED_DUPLICATE, FAILED
        const val COL_SYNCED_AT = "synced_at"
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            """
            CREATE TABLE $TABLE_LEDGER (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                $COL_MEDIA_STORE_ID INTEGER UNIQUE NOT NULL,
                $COL_CONTENT_HASH TEXT,
                $COL_FILE_NAME TEXT NOT NULL,
                $COL_FILE_SIZE INTEGER NOT NULL,
                $COL_DATE_MODIFIED INTEGER NOT NULL,
                $COL_DRIVE_FILE_ID TEXT,
                $COL_SYNC_STATUS TEXT NOT NULL,
                $COL_SYNCED_AT INTEGER NOT NULL
            )
            """.trimIndent()
        )
        db.execSQL("CREATE INDEX idx_media_store ON $TABLE_LEDGER($COL_MEDIA_STORE_ID);")
        db.execSQL("CREATE INDEX idx_hash ON $TABLE_LEDGER($COL_CONTENT_HASH);")
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        db.execSQL("DROP TABLE IF EXISTS $TABLE_LEDGER")
        onCreate(db)
    }

    fun isAlreadySynced(mediaStoreId: Long, dateModified: Long): Boolean {
        readableDatabase.rawQuery(
            "SELECT 1 FROM $TABLE_LEDGER WHERE $COL_MEDIA_STORE_ID = ? AND $COL_DATE_MODIFIED = ? AND $COL_SYNC_STATUS IN ('SYNCED', 'SKIPPED_DUPLICATE') LIMIT 1",
            arrayOf(mediaStoreId.toString(), dateModified.toString())
        ).use { cursor ->
            return cursor.moveToFirst()
        }
    }

    fun recordSyncResult(
        mediaStoreId: Long,
        contentHash: String?,
        fileName: String,
        fileSize: Long,
        dateModified: Long,
        driveFileId: String?,
        status: String
    ) {
        val values = ContentValues().apply {
            put(COL_MEDIA_STORE_ID, mediaStoreId)
            put(COL_CONTENT_HASH, contentHash)
            put(COL_FILE_NAME, fileName)
            put(COL_FILE_SIZE, fileSize)
            put(COL_DATE_MODIFIED, dateModified)
            put(COL_DRIVE_FILE_ID, driveFileId)
            put(COL_SYNC_STATUS, status)
            put(COL_SYNCED_AT, System.currentTimeMillis())
        }
        writableDatabase.insertWithOnConflict(TABLE_LEDGER, null, values, SQLiteDatabase.CONFLICT_REPLACE)
    }

    fun getSyncedCount(): Int {
        readableDatabase.rawQuery("SELECT COUNT(*) FROM $TABLE_LEDGER WHERE $COL_SYNC_STATUS IN ('SYNCED', 'SKIPPED_DUPLICATE')", null).use { cursor ->
            return if (cursor.moveToFirst()) cursor.getInt(0) else 0
        }
    }
}
```

- [ ] **Step 4: Update `DriveRepository.kt`**
Add `checkFileExists(md5, fileName, size, folderId)` calling API service.

- [ ] **Step 5: Verify build with `cd android; .\gradlew assembleDebug`**
Run: `cd android; .\gradlew assembleDebug`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 6: Commit**
```bash
git add android/app/src/main/kotlin/com/dylan/drivephotolibrary/data/
git commit -m "feat(android): add two-tier deduplication ledger and hash utils"
```

---

### Task 3: Android Camera Auto-Backup Worker & Scheduler

**Files:**
- Create: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/data/settings/AutoBackupPreferences.kt`
- Create: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/data/backup/AutoBackupWorker.kt`
- Create: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/data/backup/AutoBackupScheduler.kt`
- Modify: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/viewmodel/DriveViewModel.kt`
- Modify: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/screens/SettingsScreen.kt`

- [ ] **Step 1: Create `AutoBackupPreferences.kt`**
Store SharedPreferences for:
- `autoBackupEnabled: Boolean` (default: false)
- `backupWifiOnly: Boolean` (default: true)
- `backupChargingOnly: Boolean` (default: true)
- `lastBackupTimestamp: Long`
- `lastBackupResult: String`

- [ ] **Step 2: Implement `AutoBackupWorker.kt`**
Worker steps:
1. Check `AutoBackupPreferences.isEnabled()`. If false, return `Result.success()`.
2. Query `MediaStore.Images.Media.EXTERNAL_CONTENT_URI` and `MediaStore.Video.Media.EXTERNAL_CONTENT_URI` where `DATA LIKE '%/DCIM/%'` or bucket name is Camera, ordered by `DATE_MODIFIED DESC`, limit to 50 items per run.
3. For each item:
   - Check Tier 1: `syncLedger.isAlreadySynced(mediaId, dateModified)`. If true, skip!
   - Compute MD5 using `HashUtils.calculateMd5()`.
   - Check Tier 2: `repository.checkFileExists(md5, fileName, fileSize)`. If exists:
     - Record `SKIPPED_DUPLICATE` in ledger.
     - Continue to next file (zero bytes transferred!).
   - If not exists:
     - Perform resumable upload via `ResumableUploader`.
     - On success: Record `SYNCED` in ledger with Drive file ID.
4. Update `AutoBackupPreferences.setLastBackupTimestamp(System.currentTimeMillis())`.
5. Return `Result.success()`.

- [ ] **Step 3: Implement `AutoBackupScheduler.kt`**
Helper to schedule/cancel WorkManager periodic request:
```kotlin
fun scheduleBackup(context: Context, wifiOnly: Boolean, chargingOnly: Boolean) {
    val constraints = Constraints.Builder().apply {
        setRequiredNetworkType(if (wifiOnly) NetworkType.UNMETERED else NetworkType.CONNECTED)
        setRequiresCharging(chargingOnly)
    }.build()

    val request = PeriodicWorkRequestBuilder<AutoBackupWorker>(15, TimeUnit.MINUTES)
        .setConstraints(constraints)
        .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.MINUTES)
        .build()

    WorkManager.getInstance(context).enqueueUniquePeriodicWork(
        "dpl_camera_autobackup",
        ExistingPeriodicWorkPolicy.UPDATE,
        request
    )
}

fun triggerImmediateBackup(context: Context) {
    val request = OneTimeWorkRequestBuilder<AutoBackupWorker>().build()
    WorkManager.getInstance(context).enqueueUniqueWork(
        "dpl_camera_autobackup_immediate",
        ExistingWorkPolicy.REPLACE,
        request
    )
}
```

- [ ] **Step 4: Expose Auto-Backup State in `DriveViewModel.kt`**
Add state variables:
- `autoBackupEnabled`, `backupWifiOnly`, `backupChargingOnly`, `lastBackupTime`, `syncedCount`, `isBackingUpNow`
- Functions: `toggleAutoBackup(enabled)`, `updateBackupConstraints(...)`, `triggerBackupNow()`

- [ ] **Step 5: Integrate Camera Auto-Backup Card into `SettingsScreen.kt`**
Add a dedicated card in `SettingsScreen.kt`:
- Toggle Switch: "Camera Auto-Backup"
- Sub-toggles: "Wi-Fi Only", "While Charging Only"
- Status text: "Synced: X files • Last run: ..."
- "Backup Now" button with running spinner indicator

- [ ] **Step 6: Verify build with `cd android; .\gradlew assembleDebug`**
Run: `cd android; .\gradlew assembleDebug`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 7: Commit**
```bash
git add android/app/src/main/kotlin/com/dylan/drivephotolibrary/
git commit -m "feat(android): implement Camera Auto-Backup with WorkManager and Settings UI"
```

---

### Task 4: Advanced Video Player Gestures (Seek, Volume, Brightness, Speed)

**Files:**
- Modify: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/screens/MediaViewerScreen.kt`

- [ ] **Step 1: Create Double-Tap 10s Seek Detection & Ripple Animation**
In `MediaViewerScreen.kt`:
- Add state for seek indicators: `showSeekForwardRipple: Boolean`, `showSeekBackwardRipple: Boolean`.
- Detect double taps on left and right screen halves:
  - Left half: `exoPlayer.seekTo(maxOf(0L, exoPlayer.currentPosition - 10_000L))`, trigger animated rewind badge overlay `<< 10s` with haptic feedback tick (`HapticFeedbackType.TextHandleMove`).
  - Right half: `exoPlayer.seekTo(minOf(exoPlayer.duration, exoPlayer.currentPosition + 10_000L))`, trigger animated forward badge overlay `10s >>` with haptic feedback tick.
  - Single tap maintains existing toolbar/system bar show/hide toggle.

- [ ] **Step 2: Create Vertical Drag Gestures for Volume & Screen Brightness**
In `VideoPlayerItem`:
- Vertical swipe on left half: Adjust screen brightness via `activity.window.attributes.screenBrightness` (clamped 0.0f..1.0f).
- Vertical swipe on right half: Adjust stream volume via `audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, ...)`.
- Render a sleek floating pill overlay in the center with icon (`Icon(Icons.Default.BrightnessMedium)` or `Icon(Icons.Default.VolumeUp)`) and percentage progress bar (`Brightness 75%`, `Volume 60%`). Auto-hides 1.2s after drag release.

- [ ] **Step 3: Add Playback Speed Selector**
In video controls bottom bar:
- Add speed chip button displaying current speed (e.g. `1.0x`).
- Tapping opens a compact modal / popup with options: `0.5x`, `0.75x`, `1.0x`, `1.25x`, `1.5x`, `2.0x`.
- When selected: `exoPlayer.setPlaybackSpeed(speed)` with instant visual update.

- [ ] **Step 4: Verify build with `cd android; .\gradlew assembleDebug`**
Run: `cd android; .\gradlew assembleDebug`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 5: Commit**
```bash
git add android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/screens/MediaViewerScreen.kt
git commit -m "feat(android): add double-tap seek, brightness/volume swipe, and playback speed to video player"
```

---

### Task 5: Biometric App Lock & Privacy (Android)

**Files:**
- Modify: `android/gradle/libs.versions.toml`
- Modify: `android/app/build.gradle.kts`
- Create: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/data/settings/SecurityPreferences.kt`
- Create: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/security/BiometricAuthManager.kt`
- Create: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/screens/LockScreen.kt`
- Modify: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/MainActivity.kt`
- Modify: `android/app/src/main/kotlin/com/dylan/drivephotolibrary/ui/screens/SettingsScreen.kt`

- [ ] **Step 1: Add `androidx.biometric` dependency in Gradle**
In `android/gradle/libs.versions.toml`:
```toml
[versions]
biometric = "1.1.0"

[libraries]
androidx-biometric = { module = "androidx.biometric:biometric", version.ref = "biometric" }
```
In `android/app/build.gradle.kts`:
```kotlin
implementation(libs.androidx.biometric)
```

- [ ] **Step 2: Create `SecurityPreferences.kt`**
Store:
- `biometricEnabled: Boolean` (default: false)
- `lockTimeoutMinutes: Int` (0 = Immediately, 1, 5, 15, -1 = Never; default: 0)
- `hideInRecentApps: Boolean` (default: false)
- `lastActiveTimestamp: Long`

- [ ] **Step 3: Implement `BiometricAuthManager.kt`**
Wraps `BiometricPrompt` and `BiometricManager`:
- `canAuthenticate()`: Returns true if hardware is available and enrolled.
- `showPrompt(activity, onAuthenticated, onError)`: Shows standard Android biometric dialog.

- [ ] **Step 4: Create `LockScreen.kt`**
Aesthetic frosted glass/dark lock screen:
- App logo / Lock icon with pulsing animation.
- Text: "Drive Photo Library is Locked".
- "Unlock with Biometrics" button with fingerprint icon.
- Fallback device credential PIN/pattern support.

- [ ] **Step 5: Integrate Lock Screen & Privacy in `MainActivity.kt`**
- Check `SecurityPreferences.hideInRecentApps`: If true, set `window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)`, else `clearFlags`.
- In `onStart`/`onResume`: Calculate elapsed time since `lastActiveTimestamp`. If `elapsed > timeout`, set `isAppLocked = true` and trigger `BiometricAuthManager.showPrompt()`.
- If `isAppLocked`, display `LockScreen` covering the app content until authentication succeeds.

- [ ] **Step 6: Integrate Security Controls into `SettingsScreen.kt`**
Under "Account & Security" section:
- "Require Biometric to Unlock App" Switch
- "Lock Timeout" Dropdown (Immediately, 1 min, 5 mins, 15 mins)
- "Hide in Recent Apps (App Switcher)" Switch

- [ ] **Step 7: Verify build with `cd android; .\gradlew assembleDebug`**
Run: `cd android; .\gradlew assembleDebug`
Expected: BUILD SUCCESSFUL.

- [ ] **Step 8: Commit**
```bash
git add android/
git commit -m "feat(android): implement Biometric App Lock, configurable timeouts, and Recent Apps privacy masking"
```

---

### Task 6: End-to-End Build, Release Packaging & Documentation

**Files:**
- Modify: `TODO.md`
- Modify: `android/app/build.gradle.kts` (version bump to 1.3.0, versionCode 5)
- Modify: `package.json` (version bump to 1.3.0)

- [ ] **Step 1: Bump version to 1.3.0 across project**
Update `versionName = "1.3.0"`, `versionCode = 5` in `android/app/build.gradle.kts` and `"version": "1.3.0"` in `package.json`.

- [ ] **Step 2: Update `TODO.md`**
Add Phase 7 ("Camera Auto-Backup, Video Gestures & Biometrics") with completed items.

- [ ] **Step 3: Execute full verification builds**
Run:
- Web: `npm run build`
- Android Debug: `cd android; .\gradlew assembleDebug`
- Android Release: `.\gradlew assembleRelease`
- Copy release APK: `Copy-Item -Path android/app/build/outputs/apk/release/app-release.apk -Destination release/drive-photo-library.apk -Force`

- [ ] **Step 4: Commit and Push**
```bash
git add .
git commit -m "chore: release v1.3.0 with Camera Auto-Backup, Video Gestures, and Biometric Lock"
git push origin main
```
