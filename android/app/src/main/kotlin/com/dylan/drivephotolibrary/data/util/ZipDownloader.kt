package com.dylan.drivephotolibrary.data.util

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.ContentValues
import android.content.Context
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import androidx.core.app.NotificationCompat
import com.dylan.drivephotolibrary.data.model.TreeItem
import com.dylan.drivephotolibrary.data.network.NetworkModule
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.Request
import java.io.BufferedOutputStream
import java.io.File
import java.io.FileOutputStream
import java.io.OutputStream
import java.util.zip.ZipEntry
import java.util.zip.ZipOutputStream

object ZipDownloader {

    private const val CHANNEL_ID = "drive_zip_downloads"
    private const val CHANNEL_NAME = "Library Downloads"

    data class Progress(
        val current: Int,
        val total: Int,
        val currentFileName: String,
        val percent: Int
    )

    suspend fun downloadZip(
        context: Context,
        items: List<TreeItem>,
        zipName: String,
        onProgress: (Progress) -> Unit
    ): Result<String> = withContext(Dispatchers.IO) {
        if (items.isEmpty()) {
            return@withContext Result.failure(IllegalArgumentException("No items to download."))
        }

        val client = NetworkModule.getOkHttpClient(context)
        val finalZipName = if (zipName.lowercase().endsWith(".zip")) zipName else "$zipName.zip"
        val total = items.size

        createNotificationChannel(context)
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        val notificationId = (System.currentTimeMillis() % 10000).toInt()

        // Disambiguate paths to avoid duplicate entry collisions in the ZIP archive
        val preparedItems = disambiguatePaths(items)

        var outputUri: Uri? = null
        var outputStream: OutputStream? = null

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val contentValues = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, finalZipName)
                    put(MediaStore.Downloads.MIME_TYPE, "application/zip")
                    put(MediaStore.Downloads.IS_PENDING, 1)
                }
                outputUri = context.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                    ?: return@withContext Result.failure(Exception("Cannot create file in Downloads"))
                outputStream = context.contentResolver.openOutputStream(outputUri)
            } else {
                @Suppress("DEPRECATION")
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                if (!downloadsDir.exists()) downloadsDir.mkdirs()
                val targetFile = File(downloadsDir, finalZipName)
                outputStream = FileOutputStream(targetFile)
            }

            if (outputStream == null) {
                return@withContext Result.failure(Exception("Could not open destination output stream"))
            }

            ZipOutputStream(BufferedOutputStream(outputStream)).use { zipOut ->
                val buffer = ByteArray(32 * 1024)

                for (i in preparedItems.indices) {
                    val item = preparedItems[i]
                    val percent = Math.round(((i + 1).toFloat() / total.toFloat()) * 100f)

                    onProgress(Progress(i + 1, total, item.name, percent))

                    val downloadUrl = "${NetworkModule.BASE_URL}media/file?id=${Uri.encode(item.id)}&download=1"
                    val request = Request.Builder().url(downloadUrl).build()

                    client.newCall(request).execute().use { response ->
                        if (!response.isSuccessful) {
                            throw Exception("Failed to download ${item.name} (${response.code})")
                        }

                        val body = response.body ?: throw Exception("Empty response for ${item.name}")
                        val entry = ZipEntry(item.path)
                        zipOut.putNextEntry(entry)

                        body.byteStream().use { input ->
                            var read: Int
                            while (input.read(buffer).also { read = it } != -1) {
                                zipOut.write(buffer, 0, read)
                            }
                        }
                        zipOut.closeEntry()
                    }
                }
            }

            // Mark IS_PENDING = 0 on Android 10+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && outputUri != null) {
                val contentValues = ContentValues().apply {
                    put(MediaStore.Downloads.IS_PENDING, 0)
                }
                context.contentResolver.update(outputUri, contentValues, null, null)
            }

            // Post success system notification
            postSuccessNotification(context, notificationManager, notificationId, finalZipName, total)

            Result.success("Saved $finalZipName to Downloads ($total files)")
        } catch (e: Exception) {
            // Clean up incomplete pending file if failed
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q && outputUri != null) {
                try {
                    context.contentResolver.delete(outputUri, null, null)
                } catch (_: Exception) {}
            }
            Result.failure(e)
        }
    }

    suspend fun saveManifestJson(
        context: Context,
        jsonString: String,
        fileName: String = "dpl-manifest.json"
    ): Result<String> = withContext(Dispatchers.IO) {
        try {
            val finalName = if (fileName.lowercase().endsWith(".json")) fileName else "$fileName.json"
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val contentValues = ContentValues().apply {
                    put(MediaStore.Downloads.DISPLAY_NAME, finalName)
                    put(MediaStore.Downloads.MIME_TYPE, "application/json")
                    put(MediaStore.Downloads.IS_PENDING, 1)
                }
                val uri = context.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, contentValues)
                    ?: return@withContext Result.failure(Exception("Cannot create file in Downloads"))
                context.contentResolver.openOutputStream(uri)?.use { out ->
                    out.write(jsonString.toByteArray(Charsets.UTF_8))
                }
                val doneValues = ContentValues().apply {
                    put(MediaStore.Downloads.IS_PENDING, 0)
                }
                context.contentResolver.update(uri, doneValues, null, null)
            } else {
                @Suppress("DEPRECATION")
                val downloadsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                if (!downloadsDir.exists()) downloadsDir.mkdirs()
                val targetFile = File(downloadsDir, finalName)
                targetFile.writeText(jsonString, Charsets.UTF_8)
            }
            Result.success("Saved $finalName to Downloads")
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun disambiguatePaths(items: List<TreeItem>): List<TreeItem> {
        val seen = HashMap<String, Int>()
        return items.map { item ->
            var p = item.path.trim().replace('\\', '/').trimStart('/')
            if (p.isEmpty()) p = item.name

            val finalPath = if (seen.containsKey(p)) {
                val count = (seen[p] ?: 0) + 1
                seen[p] = count
                val lastDot = p.lastIndexOf('.')
                val lastSlash = p.lastIndexOf('/')
                if (lastDot > lastSlash) {
                    "${p.substring(0, lastDot)} ($count)${p.substring(lastDot)}"
                } else {
                    "$p ($count)"
                }
            } else {
                seen[p] = 0
                p
            }

            item.copy(path = finalPath)
        }
    }

    private fun createNotificationChannel(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Notifications for completed ZIP downloads"
            }
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
            manager?.createNotificationChannel(channel)
        }
    }

    private fun postSuccessNotification(
        context: Context,
        manager: NotificationManager?,
        id: Int,
        fileName: String,
        count: Int
    ) {
        try {
            val builder = NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.stat_sys_download_done)
                .setContentTitle("Download Complete")
                .setContentText("Saved $fileName ($count items) to Downloads")
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true)

            manager?.notify(id, builder.build())
        } catch (_: Exception) {
            // Notifications may be suppressed or require runtime permission on Android 13+
        }
    }
}
