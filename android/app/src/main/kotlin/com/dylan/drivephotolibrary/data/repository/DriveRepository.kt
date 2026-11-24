package com.dylan.drivephotolibrary.data.repository

import android.content.Context
import android.net.Uri
import com.dylan.drivephotolibrary.data.api.DriveApiService
import com.dylan.drivephotolibrary.data.model.ActionResponse
import com.dylan.drivephotolibrary.data.model.AuthStatus
import com.dylan.drivephotolibrary.data.model.CreateFolderRequest
import com.dylan.drivephotolibrary.data.model.CreateFolderResponse
import com.dylan.drivephotolibrary.data.model.CreateUserResponse
import com.dylan.drivephotolibrary.data.model.DriveConfigResponse
import com.dylan.drivephotolibrary.data.model.FilesResponse
import com.dylan.drivephotolibrary.data.model.InitUploadResponse
import com.dylan.drivephotolibrary.data.model.LoginRequest
import com.dylan.drivephotolibrary.data.model.LoginResponse
import com.dylan.drivephotolibrary.data.model.SessionsResponse
import com.dylan.drivephotolibrary.data.model.TreeResponse
import com.dylan.drivephotolibrary.data.model.UsersResponse
import com.dylan.drivephotolibrary.data.network.NetworkModule
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.toRequestBody

class DriveRepository(private val context: Context) {
    private val api: DriveApiService by lazy { NetworkModule.getApiService(context) }

    suspend fun getStatus(): Result<AuthStatus> = withContext(Dispatchers.IO) {
        try {
            Result.success(api.getStatus())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun login(username: String, pass: String): Result<LoginResponse> = withContext(Dispatchers.IO) {
        try {
            Result.success(api.login(LoginRequest(username, pass)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logout(): Result<ActionResponse> = withContext(Dispatchers.IO) {
        try {
            val res = api.logout()
            NetworkModule.getCookieJar(context).clear()
            Result.success(res)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun listFiles(
        filter: String? = null,
        search: String? = null,
        folderId: String? = null
    ): Result<FilesResponse> = withContext(Dispatchers.IO) {
        try {
            Result.success(api.listFiles(filter, search, folderId))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTree(
        folderId: String? = null,
        filter: String? = null
    ): Result<TreeResponse> = withContext(Dispatchers.IO) {
        try {
            Result.success(api.getTree(folderId, filter))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createFolder(name: String, parentId: String? = null): Result<CreateFolderResponse> =
        withContext(Dispatchers.IO) {
            try {
                Result.success(api.createFolder(CreateFolderRequest(name, parentId)))
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun markFolderSynced(folderId: String): Result<ActionResponse> = withContext(Dispatchers.IO) {
        try {
            Result.success(api.markFolderSynced(folderId))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun markFileSynced(fileId: String): Result<ActionResponse> = withContext(Dispatchers.IO) {
        try {
            Result.success(api.markFileSynced(fileId))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun uploadUri(
        uri: Uri,
        fileName: String,
        mimeType: String?,
        folderId: String?
    ): Result<ActionResponse> = withContext(Dispatchers.IO) {
        try {
            val contentResolver = context.contentResolver
            val inputStream = contentResolver.openInputStream(uri)
                ?: return@withContext Result.failure(Exception("Cannot open file stream"))
            val bytes = inputStream.use { it.readBytes() }
            val mediaType = (mimeType ?: "application/octet-stream").toMediaTypeOrNull()
            val filePart = MultipartBody.Part.createFormData(
                "file",
                fileName,
                bytes.toRequestBody(mediaType)
            )
            val folderIdPart = folderId?.toRequestBody("text/plain".toMediaTypeOrNull())

            Result.success(api.uploadFile(filePart, folderId = folderIdPart))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // Phase 2: Users Management
    suspend fun listUsers(): Result<UsersResponse> = withContext(Dispatchers.IO) {
        try {
            Result.success(api.listUsers())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun createUser(username: String, pass: String, role: String): Result<CreateUserResponse> =
        withContext(Dispatchers.IO) {
            try {
                Result.success(api.createUser(com.dylan.drivephotolibrary.data.model.CreateUserRequest(username, pass, role)))
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun deleteUser(id: Int): Result<ActionResponse> = withContext(Dispatchers.IO) {
        try {
            Result.success(api.deleteUser(id))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun changePassword(currentPass: String, newPass: String): Result<ActionResponse> =
        withContext(Dispatchers.IO) {
            try {
                Result.success(api.changePassword(com.dylan.drivephotolibrary.data.model.ChangePasswordRequest(currentPass, newPass)))
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    // Phase 2: Drive Configuration (Approach A)
    suspend fun getDriveConfig(search: String? = null): Result<DriveConfigResponse> = withContext(Dispatchers.IO) {
        try {
            Result.success(api.getDriveConfig(search))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun setSharedRootFolder(folderId: String): Result<DriveConfigResponse> =
        withContext(Dispatchers.IO) {
            try {
                Result.success(api.updateDriveConfig(com.dylan.drivephotolibrary.data.model.SetRootFolderRequest(folderId = folderId)))
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun resetRootFolder(): Result<DriveConfigResponse> = withContext(Dispatchers.IO) {
        try {
            Result.success(api.updateDriveConfig(com.dylan.drivephotolibrary.data.model.SetRootFolderRequest(resetDefault = true)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // Phase 2: Session Management
    suspend fun listSessions(): Result<SessionsResponse> = withContext(Dispatchers.IO) {
        try {
            Result.success(api.listSessions())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun revokeSession(prefix: String? = null, revokeAllOthers: Boolean = false): Result<ActionResponse> =
        withContext(Dispatchers.IO) {
            try {
                Result.success(api.revokeSession(com.dylan.drivephotolibrary.data.model.RevokeSessionRequest(tokenHashPrefix = prefix, revokeAllOthers = revokeAllOthers)))
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    // Pre-flight Deduplication Check
    suspend fun checkFileExists(
        md5: String? = null,
        fileName: String? = null,
        size: Long? = null,
        folderId: String? = null
    ): Result<com.dylan.drivephotolibrary.data.model.FileCheckResponse> = withContext(Dispatchers.IO) {
        try {
            Result.success(api.checkFileExists(md5, fileName, size, folderId))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // Phase 3: Resumable Upload
    suspend fun initUpload(
        fileName: String,
        mimeType: String,
        size: Long? = null,
        folderId: String? = null,
        folderPath: String? = null
    ): Result<InitUploadResponse> = withContext(Dispatchers.IO) {
        try {
            Result.success(api.initUpload(com.dylan.drivephotolibrary.data.model.InitUploadRequest(fileName, mimeType, size, folderId, folderPath)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // Phase 5: Soft Delete, Trash & Storage Breakdown
    suspend fun moveToTrash(fileIds: List<String>, folderIds: List<String>): Result<com.dylan.drivephotolibrary.data.model.TrashActionResponse> =
        withContext(Dispatchers.IO) {
            try {
                Result.success(api.moveToTrash(com.dylan.drivephotolibrary.data.model.TrashRequest(fileIds, folderIds)))
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun restoreFromTrash(fileIds: List<String>, folderIds: List<String>): Result<com.dylan.drivephotolibrary.data.model.TrashActionResponse> =
        withContext(Dispatchers.IO) {
            try {
                Result.success(api.restoreFromTrash(com.dylan.drivephotolibrary.data.model.TrashRequest(fileIds, folderIds)))
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun emptyTrash(olderThanDays: Int? = null): Result<com.dylan.drivephotolibrary.data.model.TrashActionResponse> =
        withContext(Dispatchers.IO) {
            try {
                Result.success(api.emptyTrash(com.dylan.drivephotolibrary.data.model.EmptyTrashRequest(olderThanDays)))
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun getStorageBreakdown(): Result<com.dylan.drivephotolibrary.data.model.StorageBreakdown> =
        withContext(Dispatchers.IO) {
            try {
                Result.success(api.getStorageBreakdown())
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
}
