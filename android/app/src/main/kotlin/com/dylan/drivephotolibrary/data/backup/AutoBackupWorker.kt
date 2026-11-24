package com.dylan.drivephotolibrary.data.backup

import android.content.ContentUris
import android.content.Context
import android.net.Uri
import android.provider.MediaStore
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.dylan.drivephotolibrary.data.repository.DriveRepository
import com.dylan.drivephotolibrary.data.settings.AutoBackupPreferences
import com.dylan.drivephotolibrary.data.upload.ResumableUploader
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class AutoBackupWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val prefs = AutoBackupPreferences.getInstance(applicationContext)
        if (!prefs.backupEnabled.value) {
            return@withContext Result.success()
        }

        val repository = DriveRepository(applicationContext)
        val ledger = SyncLedgerDatabase.getInstance(applicationContext)
        val uploader = ResumableUploader(applicationContext, repository)
        val contentResolver = applicationContext.contentResolver

        var backedUpCount = 0
        var skippedCount = 0
        var errorCount = 0

        val mediaCollections = listOf(
            MediaStore.Images.Media.EXTERNAL_CONTENT_URI to "image/*",
            MediaStore.Video.Media.EXTERNAL_CONTENT_URI to "video/*"
        )

        for ((collectionUri, fallbackMime) in mediaCollections) {
            val projection = arrayOf(
                MediaStore.MediaColumns._ID,
                MediaStore.MediaColumns.DISPLAY_NAME,
                MediaStore.MediaColumns.MIME_TYPE,
                MediaStore.MediaColumns.SIZE,
                MediaStore.MediaColumns.DATE_MODIFIED,
                MediaStore.MediaColumns.DATA
            )

            val sortOrder = "${MediaStore.MediaColumns.DATE_MODIFIED} DESC"

            try {
                contentResolver.query(
                    collectionUri,
                    projection,
                    null,
                    null,
                    sortOrder
                )?.use { cursor ->
                    val idCol = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns._ID)
                    val nameCol = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DISPLAY_NAME)
                    val mimeCol = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.MIME_TYPE)
                    val sizeCol = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.SIZE)
                    val modCol = cursor.getColumnIndexOrThrow(MediaStore.MediaColumns.DATE_MODIFIED)
                    val dataCol = cursor.getColumnIndex(MediaStore.MediaColumns.DATA)

                    var processed = 0
                    while (cursor.moveToNext() && processed < 50) {
                        val mediaId = cursor.getLong(idCol)
                        val fileName = cursor.getString(nameCol) ?: "media_$mediaId"
                        val mimeType = cursor.getString(mimeCol) ?: fallbackMime
                        val size = cursor.getLong(sizeCol)
                        val dateModified = cursor.getLong(modCol)
                        val filePath = if (dataCol != -1) cursor.getString(dataCol) ?: "" else ""

                        // Filter to Camera / DCIM items
                        val isCameraMedia = filePath.isEmpty() ||
                            filePath.contains("/DCIM/", ignoreCase = true) ||
                            filePath.contains("/Camera/", ignoreCase = true) ||
                            filePath.contains("Pictures/Screenshots", ignoreCase = true)

                        if (!isCameraMedia || size <= 0) continue
                        processed++

                        // --- TIER 1 DEDUPLICATION: Local SQLite Ledger Check ---
                        if (ledger.isAlreadySynced(mediaId, dateModified)) {
                            skippedCount++
                            continue
                        }

                        val contentUri = ContentUris.withAppendedId(collectionUri, mediaId)

                        // Compute local MD5 hash for exact matching
                        val md5 = HashUtils.calculateMd5(contentResolver, contentUri)
                        if (md5 != null && ledger.isHashSynced(md5)) {
                            ledger.recordSyncResult(mediaId, md5, fileName, size, dateModified, null, "SKIPPED_DUPLICATE")
                            skippedCount++
                            continue
                        }

                        // --- TIER 2 DEDUPLICATION: Remote Drive Preflight Check ---
                        val checkResult = repository.checkFileExists(
                            md5 = md5,
                            fileName = fileName,
                            size = size
                        )

                        if (checkResult.isSuccess && checkResult.getOrNull()?.exists == true) {
                            val remoteFileId = checkResult.getOrNull()?.fileId
                            ledger.recordSyncResult(
                                mediaStoreId = mediaId,
                                contentHash = md5,
                                fileName = fileName,
                                fileSize = size,
                                dateModified = dateModified,
                                driveFileId = remoteFileId,
                                status = "SKIPPED_DUPLICATE"
                            )
                            skippedCount++
                            continue
                        }

                        // --- UPLOAD NEW MEDIA FILE ---
                        val uploadRes = uploader.uploadFile(
                            uri = contentUri,
                            fileName = fileName,
                            mimeType = mimeType,
                            folderId = null, // Defaults to Travel Inbox
                            folderPath = null
                        )

                        if (uploadRes.isSuccess) {
                            ledger.recordSyncResult(
                                mediaStoreId = mediaId,
                                contentHash = md5,
                                fileName = fileName,
                                fileSize = size,
                                dateModified = dateModified,
                                driveFileId = null,
                                status = "SYNCED"
                            )
                            backedUpCount++
                        } else {
                            errorCount++
                        }
                    }
                }
            } catch (e: Exception) {
                errorCount++
            }
        }

        val now = System.currentTimeMillis()
        val resultMessage = when {
            backedUpCount > 0 -> "Backed up $backedUpCount new items ($skippedCount skipped)"
            errorCount > 0 && backedUpCount == 0 -> "Completed with $errorCount errors ($skippedCount skipped)"
            else -> "Up to date ($skippedCount items verified)"
        }
        prefs.setLastBackupResult(now, resultMessage)

        Result.success(
            workDataOf(
                "backed_up_count" to backedUpCount,
                "skipped_count" to skippedCount,
                "error_count" to errorCount,
                "message" to resultMessage
            )
        )
    }
}
