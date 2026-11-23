package com.dylan.drivephotolibrary.data.repository

import android.content.Context
import android.net.Uri
import com.dylan.drivephotolibrary.data.api.DriveApiService
import com.dylan.drivephotolibrary.data.model.ActionResponse
import com.dylan.drivephotolibrary.data.model.AuthStatus
import com.dylan.drivephotolibrary.data.model.CreateFolderRequest
import com.dylan.drivephotolibrary.data.model.CreateFolderResponse
import com.dylan.drivephotolibrary.data.model.FilesResponse
import com.dylan.drivephotolibrary.data.model.LoginRequest
import com.dylan.drivephotolibrary.data.model.LoginResponse
import com.dylan.drivephotolibrary.data.model.TreeResponse
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
}
