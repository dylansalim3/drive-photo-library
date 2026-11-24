package com.dylan.drivephotolibrary.data.update

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import java.io.File

@Serializable
data class GitHubRelease(
    @SerialName("tag_name")
    val tagName: String,
    val name: String? = null,
    val body: String? = null,
    val assets: List<GitHubAsset> = emptyList()
)

@Serializable
data class GitHubAsset(
    val name: String,
    val size: Long = 0L,
    @SerialName("browser_download_url")
    val browserDownloadUrl: String
)

data class UpdateInfo(
    val currentVersion: String,
    val latestVersion: String,
    val releaseNotes: String,
    val downloadUrl: String,
    val apkSize: Long,
    val isUpdateAvailable: Boolean
)

sealed interface UpdateStatus {
    data object Idle : UpdateStatus
    data object Checking : UpdateStatus
    data class Available(val info: UpdateInfo) : UpdateStatus
    data class UpToDate(val info: UpdateInfo) : UpdateStatus
    data class Downloading(
        val info: UpdateInfo,
        val progress: Float, // 0.0f to 1.0f
        val bytesDownloaded: Long,
        val totalBytes: Long
    ) : UpdateStatus
    data class ReadyToInstall(
        val info: UpdateInfo,
        val apkFile: File
    ) : UpdateStatus
    data class Error(val message: String) : UpdateStatus
}
