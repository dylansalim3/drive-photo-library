package com.dylan.drivephotolibrary.data.upload

import android.content.Context
import android.net.Uri
import com.dylan.drivephotolibrary.data.network.NetworkModule
import com.dylan.drivephotolibrary.data.repository.DriveRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.InputStream
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean
import kotlin.math.min
import kotlin.math.pow

class ResumableUploader(
    private val context: Context,
    private val repository: DriveRepository
) {
    companion object {
        const val CHUNK_SIZE = 8 * 1024 * 1024 // 8 MiB (multiple of 256 KiB)
        const val MAX_RETRIES = 5
    }

    private val httpClient: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(60, TimeUnit.SECONDS)
        .writeTimeout(120, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    private val isCancelled = AtomicBoolean(false)
    private val isPaused = AtomicBoolean(false)

    fun pause() {
        isPaused.set(true)
    }

    fun resume() {
        isPaused.set(false)
    }

    fun cancel() {
        isCancelled.set(true)
    }

    suspend fun uploadFile(
        uri: Uri,
        fileName: String,
        mimeType: String,
        folderId: String? = null,
        folderPath: String? = null,
        onProgress: (uploadedBytes: Long, totalBytes: Long, percent: Int) -> Unit = { _, _, _ -> }
    ): Result<String> = withContext(Dispatchers.IO) {
        isCancelled.set(false)
        isPaused.set(false)

        try {
            val contentResolver = context.contentResolver
            val fileSize = contentResolver.openFileDescriptor(uri, "r")?.use { it.statSize } ?: -1L
            if (fileSize <= 0) {
                return@withContext Result.failure(Exception("File is empty or inaccessible."))
            }

            // 1. Initiate Resumable Upload Session
            val initRes = repository.initUpload(
                fileName = fileName,
                mimeType = mimeType,
                size = fileSize,
                folderId = folderId,
                folderPath = folderPath
            ).getOrElse { err ->
                return@withContext Result.failure(Exception("Failed to initiate upload: ${err.message}"))
            }

            val uploadUrl = initRes.uploadUrl

            // 2. Upload Chunks
            var uploadedOffset = 0L

            while (uploadedOffset < fileSize) {
                if (isCancelled.get()) {
                    return@withContext Result.failure(Exception("Upload cancelled."))
                }
                while (isPaused.get()) {
                    delay(500)
                    if (isCancelled.get()) return@withContext Result.failure(Exception("Upload cancelled."))
                }

                val chunkSize = min(CHUNK_SIZE.toLong(), fileSize - uploadedOffset).toInt()
                val chunkBytes = readChunk(contentResolver.openInputStream(uri), uploadedOffset, chunkSize)
                    ?: return@withContext Result.failure(Exception("Failed reading file chunk at offset $uploadedOffset."))

                val start = uploadedOffset
                val end = start + chunkBytes.size - 1

                var attempts = 0
                var chunkSent = false
                var lastErr: Exception? = null

                while (attempts < MAX_RETRIES && !chunkSent && !isCancelled.get()) {
                    attempts++
                    try {
                        val request = Request.Builder()
                            .url(uploadUrl)
                            .put(chunkBytes.toRequestBody("application/octet-stream".toMediaTypeOrNull()))
                            .addHeader("Content-Length", chunkBytes.size.toString())
                            .addHeader("Content-Range", "bytes $start-$end/$fileSize")
                            .build()

                        httpClient.newCall(request).execute().use { response ->
                            if (response.code == 308) {
                                // Chunk received, resume incomplete
                                val range = response.header("Range")
                                if (range != null) {
                                    val regex = "bytes=0-(\\d+)".toRegex()
                                    val match = regex.find(range)
                                    uploadedOffset = match?.groupValues?.get(1)?.toLongOrNull()?.plus(1L)
                                        ?: (end + 1L)
                                } else {
                                    uploadedOffset = end + 1L
                                }
                                chunkSent = true
                            } else if (response.isSuccessful) {
                                // Upload complete!
                                uploadedOffset = fileSize
                                chunkSent = true
                                val responseBody = response.body?.string() ?: ""
                                onProgress(fileSize, fileSize, 100)
                                return@withContext Result.success(responseBody)
                            } else {
                                throw Exception("Upload chunk rejected: HTTP ${response.code} ${response.message}")
                            }
                        }
                    } catch (e: Exception) {
                        lastErr = e
                        if (isCancelled.get()) return@withContext Result.failure(Exception("Upload cancelled."))
                        delay((1000 * 2.0.pow(attempts.toDouble())).toLong())
                        // Query remote offset
                        uploadedOffset = queryRemoteOffset(uploadUrl, fileSize)
                        if (uploadedOffset >= fileSize) {
                            return@withContext Result.success("Upload complete")
                        }
                    }
                }

                if (!chunkSent) {
                    return@withContext Result.failure(lastErr ?: Exception("Failed sending chunk after $MAX_RETRIES attempts."))
                }

                val percent = ((uploadedOffset.toDouble() / fileSize.toDouble()) * 100).toInt().coerceIn(0, 100)
                onProgress(uploadedOffset, fileSize, percent)
            }

            Result.success("Uploaded successfully")
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun readChunk(inputStream: InputStream?, offset: Long, length: Int): ByteArray? {
        if (inputStream == null) return null
        return inputStream.use { stream ->
            var skipped = 0L
            while (skipped < offset) {
                val s = stream.skip(offset - skipped)
                if (s <= 0) break
                skipped += s
            }
            val buffer = ByteArray(length)
            var totalRead = 0
            while (totalRead < length) {
                val r = stream.read(buffer, totalRead, length - totalRead)
                if (r < 0) break
                totalRead += r
            }
            if (totalRead == length) buffer else buffer.copyOf(totalRead)
        }
    }

    private fun queryRemoteOffset(uploadUrl: String, fileSize: Long): Long {
        return try {
            val req = Request.Builder()
                .url(uploadUrl)
                .put("".toRequestBody(null))
                .addHeader("Content-Range", "bytes */$fileSize")
                .build()

            httpClient.newCall(req).execute().use { response ->
                if (response.code == 308) {
                    val range = response.header("Range")
                    if (range != null) {
                        val match = "bytes=0-(\\d+)".toRegex().find(range)
                        match?.groupValues?.get(1)?.toLongOrNull()?.plus(1L) ?: 0L
                    } else 0L
                } else if (response.isSuccessful) {
                    fileSize
                } else 0L
            }
        } catch (_: Exception) {
            0L
        }
    }
}
