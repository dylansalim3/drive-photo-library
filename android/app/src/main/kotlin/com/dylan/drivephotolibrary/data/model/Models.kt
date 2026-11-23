package com.dylan.drivephotolibrary.data.model

import kotlinx.serialization.Serializable

@Serializable
data class LocationData(
    val latitude: Double? = null,
    val longitude: Double? = null,
    val altitude: Double? = null
)

@Serializable
data class ImageMediaMetadata(
    val width: Int? = null,
    val height: Int? = null,
    val rotation: Int? = null,
    val location: LocationData? = null,
    val time: String? = null,
    val cameraMake: String? = null,
    val cameraModel: String? = null,
    val exposureTime: Float? = null,
    val aperture: Float? = null,
    val focalLength: Float? = null,
    val isoSpeed: Int? = null,
    val lens: String? = null
)

@Serializable
data class VideoMediaMetadata(
    val width: Int? = null,
    val height: Int? = null,
    val durationMillis: String? = null
)

@Serializable
data class DriveFile(
    val id: String,
    val name: String,
    val mimeType: String = "",
    val size: String? = null,
    val createdTime: String? = null,
    val modifiedTime: String? = null,
    val isVideo: Boolean = false,
    val syncStatus: String = "not-sync",
    val uploadedBy: String? = null,
    val thumbnailLink: String? = null,
    val imageMediaMetadata: ImageMediaMetadata? = null,
    val videoMediaMetadata: VideoMediaMetadata? = null
)

@Serializable
data class DriveFolder(
    val id: String,
    val name: String,
    val mimeType: String = "application/vnd.google-apps.folder",
    val syncStatus: String = "not-sync"
)

@Serializable
data class Breadcrumb(
    val id: String,
    val name: String
)

@Serializable
data class FilesResponse(
    val files: List<DriveFile> = emptyList(),
    val subfolders: List<DriveFolder> = emptyList(),
    val breadcrumbs: List<Breadcrumb> = emptyList()
)

@Serializable
data class TreeItem(
    val id: String,
    val name: String,
    val path: String,
    val size: String? = null,
    val mimeType: String = ""
)

@Serializable
data class TreeResponse(
    val ok: Boolean = true,
    val folderId: String? = null,
    val folderName: String? = null,
    val count: Int = 0,
    val items: List<TreeItem> = emptyList()
)

@Serializable
data class AuthStatus(
    val configured: Boolean = false,
    val authenticated: Boolean = false,
    val driveConnected: Boolean = false,
    val username: String? = null,
    val role: String? = null,
    val rootFolderId: String? = null,
    val rootFolderName: String? = null,
    val googleEmail: String? = null,
    val googleDisplayName: String? = null
)

@Serializable
data class AppUser(
    val id: Int,
    val username: String,
    val role: String = "user",
    val createdAt: Long = 0
)

@Serializable
data class UsersResponse(
    val ok: Boolean = true,
    val users: List<AppUser> = emptyList()
)

@Serializable
data class CreateUserRequest(
    val username: String,
    val password: String,
    val role: String = "user"
)

@Serializable
data class CreateUserResponse(
    val ok: Boolean = true,
    val user: AppUser? = null
)

@Serializable
data class ChangePasswordRequest(
    val currentPassword: String,
    val newPassword: String
)

@Serializable
data class SharedDriveItem(
    val id: String,
    val name: String
)

@Serializable
data class SharedFolderItem(
    val id: String,
    val name: String,
    val owners: List<String> = emptyList()
)

@Serializable
data class DriveConfigResponse(
    val ok: Boolean = true,
    val rootFolderId: String = "",
    val rootFolderName: String? = null,
    val googleEmail: String? = null,
    val googleDisplayName: String? = null,
    val sharedDrives: List<SharedDriveItem> = emptyList(),
    val sharedFolders: List<SharedFolderItem> = emptyList()
)

@Serializable
data class SetRootFolderRequest(
    val folderId: String? = null,
    val resetDefault: Boolean? = null
)

@Serializable
data class SessionItem(
    val tokenHashPrefix: String,
    val username: String,
    val expiresAt: Long,
    val isCurrent: Boolean = false
)

@Serializable
data class SessionsResponse(
    val ok: Boolean = true,
    val sessions: List<SessionItem> = emptyList()
)

@Serializable
data class RevokeSessionRequest(
    val tokenHashPrefix: String? = null,
    val revokeAllOthers: Boolean = false,
    val username: String? = null
)

@Serializable
data class LoginRequest(
    val username: String,
    val password: String
)

@Serializable
data class LoginResponse(
    val success: Boolean = true,
    val username: String? = null
)

@Serializable
data class CreateFolderRequest(
    val name: String,
    val parentId: String? = null
)

@Serializable
data class CreateFolderResponse(
    val folder: DriveFolder
)

@Serializable
data class ActionResponse(
    val success: Boolean = true,
    val movedCount: Int? = null,
    val message: String? = null
)

@Serializable
data class InitUploadRequest(
    val fileName: String,
    val mimeType: String,
    val size: Long? = null,
    val folderId: String? = null,
    val folderPath: String? = null
)

@Serializable
data class InitUploadResponse(
    val ok: Boolean = true,
    val uploadUrl: String,
    val targetFolderId: String? = null
)

@Serializable
data class TrashRequest(
    val fileIds: List<String> = emptyList(),
    val folderIds: List<String> = emptyList()
)

@Serializable
data class EmptyTrashRequest(
    val olderThanDays: Int? = null
)

@Serializable
data class TrashActionResponse(
    val ok: Boolean = true,
    val count: Int = 0,
    val total: Int = 0,
    val deletedCount: Int = 0
)

@Serializable
data class StorageBreakdown(
    val ok: Boolean = true,
    val limit: String? = null,
    val usage: String? = null,
    val usageInDrive: String? = null,
    val usageInDriveTrash: String? = null,
    val usagePercent: Float? = null,
    val stagingSize: Long = 0,
    val stagingCount: Int = 0,
    val archiveSize: Long = 0,
    val archiveCount: Int = 0,
    val trashSize: Long = 0,
    val trashCount: Int = 0
)
