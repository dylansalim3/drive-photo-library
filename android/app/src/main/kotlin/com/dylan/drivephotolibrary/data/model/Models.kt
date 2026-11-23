package com.dylan.drivephotolibrary.data.model

import kotlinx.serialization.Serializable

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
    val thumbnailLink: String? = null
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
data class AuthStatus(
    val configured: Boolean = false,
    val authenticated: Boolean = false,
    val driveConnected: Boolean = false,
    val username: String? = null,
    val rootFolderId: String? = null
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
