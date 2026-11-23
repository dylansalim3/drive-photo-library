package com.dylan.drivephotolibrary.data.upload

import android.content.Context
import android.net.Uri
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import androidx.work.workDataOf
import com.dylan.drivephotolibrary.data.repository.DriveRepository

class UploadWorker(
    appContext: Context,
    params: WorkerParameters
) : CoroutineWorker(appContext, params) {

    companion object {
        const val KEY_URI = "uri"
        const val KEY_FILE_NAME = "fileName"
        const val KEY_MIME_TYPE = "mimeType"
        const val KEY_FOLDER_ID = "folderId"
        const val KEY_FOLDER_PATH = "folderPath"

        const val PROGRESS_PERCENT = "progress_percent"
        const val PROGRESS_BYTES = "progress_bytes"
        const val TOTAL_BYTES = "total_bytes"
        const val KEY_RESULT = "result_message"
    }

    override suspend fun doWork(): Result {
        val uriStr = inputData.getString(KEY_URI) ?: return Result.failure()
        val fileName = inputData.getString(KEY_FILE_NAME) ?: return Result.failure()
        val mimeType = inputData.getString(KEY_MIME_TYPE) ?: "application/octet-stream"
        val folderId = inputData.getString(KEY_FOLDER_ID)
        val folderPath = inputData.getString(KEY_FOLDER_PATH)

        val uri = Uri.parse(uriStr)
        val repository = DriveRepository(applicationContext)
        val uploader = ResumableUploader(applicationContext, repository)

        val result = uploader.uploadFile(
            uri = uri,
            fileName = fileName,
            mimeType = mimeType,
            folderId = folderId,
            folderPath = folderPath
        ) { uploadedBytes, totalBytes, percent ->
            setProgressAsync(
                workDataOf(
                    PROGRESS_PERCENT to percent,
                    PROGRESS_BYTES to uploadedBytes,
                    TOTAL_BYTES to totalBytes
                )
            )
        }

        return if (result.isSuccess) {
            Result.success(
                workDataOf(KEY_RESULT to "Uploaded $fileName")
            )
        } else {
            val err = result.exceptionOrNull()?.message ?: "Upload failed"
            if (runAttemptCount < 3) {
                Result.retry()
            } else {
                Result.failure(workDataOf(KEY_RESULT to err))
            }
        }
    }
}
