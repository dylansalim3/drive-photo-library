package com.dylan.drivephotolibrary.data.update

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.util.concurrent.TimeUnit

class AppUpdateManager(
    private val context: Context,
    private val okHttpClient: OkHttpClient = OkHttpClient.Builder()
        .followRedirects(true)
        .followSslRedirects(true)
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()
) {
    private val json = Json { ignoreUnknownKeys = true }

    companion object {
        private const val GITHUB_LATEST_RELEASE_URL =
            "https://api.github.com/repos/dylansalim3/drive-photo-library/releases/latest"
    }

    /**
     * Checks GitHub for the latest release and returns UpdateInfo if found.
     */
    suspend fun checkForUpdate(): Result<UpdateInfo?> = withContext(Dispatchers.IO) {
        try {
            val currentVersion = getCurrentVersionName()
            val request = Request.Builder()
                .url(GITHUB_LATEST_RELEASE_URL)
                .header("User-Agent", "DrivePhotoLibrary-Android")
                .header("Accept", "application/vnd.github.v3+json")
                .build()

            okHttpClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(
                        IOException("GitHub API responded with code: ${response.code}")
                    )
                }

                val bodyString = response.body?.string()
                    ?: return@withContext Result.failure(IOException("Empty response body"))

                val release = json.decodeFromString<GitHubRelease>(bodyString)
                val cleanLatest = release.tagName.removePrefix("v").removePrefix("V")
                val cleanCurrent = currentVersion.removePrefix("v").removePrefix("V")

                val apkAsset = release.assets.firstOrNull {
                    it.name.endsWith(".apk", ignoreCase = true)
                }

                val isNewer = isVersionNewer(cleanCurrent, cleanLatest)
                val downloadUrl = apkAsset?.browserDownloadUrl.orEmpty()
                val size = apkAsset?.size ?: 0L

                val info = UpdateInfo(
                    currentVersion = currentVersion,
                    latestVersion = cleanLatest,
                    releaseNotes = release.body.orEmpty().trim(),
                    downloadUrl = downloadUrl,
                    apkSize = size,
                    isUpdateAvailable = isNewer && downloadUrl.isNotBlank()
                )

                Result.success(info)
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Downloads the APK file to app cache with real-time progress callbacks.
     */
    suspend fun downloadUpdate(
        info: UpdateInfo,
        onProgress: (progress: Float, downloadedBytes: Long, totalBytes: Long) -> Unit
    ): Result<File> = withContext(Dispatchers.IO) {
        try {
            val updatesDir = File(context.cacheDir, "updates")
            if (!updatesDir.exists()) {
                updatesDir.mkdirs()
            }

            val apkFile = File(updatesDir, "drive-photo-library-${info.latestVersion}.apk")
            if (apkFile.exists()) {
                apkFile.delete()
            }

            val request = Request.Builder()
                .url(info.downloadUrl)
                .header("User-Agent", "DrivePhotoLibrary-Android")
                .build()

            okHttpClient.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    return@withContext Result.failure(
                        IOException("Download failed with HTTP ${response.code}")
                    )
                }

                val body = response.body
                    ?: return@withContext Result.failure(IOException("Download response body is empty"))

                val totalLength = if (info.apkSize > 0) info.apkSize else body.contentLength()
                var downloaded: Long = 0

                body.byteStream().use { input ->
                    FileOutputStream(apkFile).use { output ->
                        val buffer = ByteArray(8192)
                        var bytesRead: Int
                        while (input.read(buffer).also { bytesRead = it } != -1) {
                            output.write(buffer, 0, bytesRead)
                            downloaded += bytesRead
                            val progress = if (totalLength > 0) {
                                (downloaded.toFloat() / totalLength).coerceIn(0f, 1f)
                            } else 0f
                            onProgress(progress, downloaded, totalLength)
                        }
                        output.flush()
                    }
                }
            }

            Result.success(apkFile)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Checks if permission is required to install unknown apps, or launches the PackageInstaller.
     */
    fun installApk(activityContext: Context, apkFile: File): Result<Unit> {
        try {
            if (!apkFile.exists()) {
                return Result.failure(IOException("APK file not found on disk"))
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                if (!activityContext.packageManager.canRequestPackageInstalls()) {
                    val manageIntent = Intent(
                        Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                        Uri.parse("package:${activityContext.packageName}")
                    ).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    activityContext.startActivity(manageIntent)
                    return Result.success(Unit)
                }
            }

            val apkUri: Uri = FileProvider.getUriForFile(
                activityContext,
                "${activityContext.packageName}.fileprovider",
                apkFile
            )

            val installIntent = Intent(Intent.ACTION_VIEW).apply {
                setDataAndType(apkUri, "application/vnd.android.package-archive")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }

            activityContext.startActivity(installIntent)
            return Result.success(Unit)
        } catch (e: Exception) {
            return Result.failure(e)
        }
    }

    private fun getCurrentVersionName(): String {
        return try {
            val packageInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                context.packageManager.getPackageInfo(
                    context.packageName,
                    PackageManager.PackageInfoFlags.of(0)
                )
            } else {
                @Suppress("DEPRECATION")
                context.packageManager.getPackageInfo(context.packageName, 0)
            }
            packageInfo.versionName ?: "1.0.0"
        } catch (e: Exception) {
            "1.0.0"
        }
    }

    private fun isVersionNewer(current: String, latest: String): Boolean {
        try {
            val curParts = current.split(".").map { it.toIntOrNull() ?: 0 }
            val latParts = latest.split(".").map { it.toIntOrNull() ?: 0 }
            val length = maxOf(curParts.size, latParts.size)

            for (i in 0 until length) {
                val c = curParts.getOrElse(i) { 0 }
                val l = latParts.getOrElse(i) { 0 }
                if (l > c) return true
                if (l < c) return false
            }
            return false
        } catch (e: Exception) {
            return latest != current
        }
    }
}
