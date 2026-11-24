package com.dylan.drivephotolibrary.data.api

import com.dylan.drivephotolibrary.data.model.ActionResponse
import com.dylan.drivephotolibrary.data.model.AuthStatus
import com.dylan.drivephotolibrary.data.model.ChangePasswordRequest
import com.dylan.drivephotolibrary.data.model.CreateFolderRequest
import com.dylan.drivephotolibrary.data.model.CreateFolderResponse
import com.dylan.drivephotolibrary.data.model.CreateUserRequest
import com.dylan.drivephotolibrary.data.model.CreateUserResponse
import com.dylan.drivephotolibrary.data.model.DriveConfigResponse
import com.dylan.drivephotolibrary.data.model.EmptyTrashRequest
import com.dylan.drivephotolibrary.data.model.FileCheckResponse
import com.dylan.drivephotolibrary.data.model.FilesResponse
import com.dylan.drivephotolibrary.data.model.InitUploadRequest
import com.dylan.drivephotolibrary.data.model.InitUploadResponse
import com.dylan.drivephotolibrary.data.model.LoginRequest
import com.dylan.drivephotolibrary.data.model.LoginResponse
import com.dylan.drivephotolibrary.data.model.RevokeSessionRequest
import com.dylan.drivephotolibrary.data.model.SessionsResponse
import com.dylan.drivephotolibrary.data.model.SetRootFolderRequest
import com.dylan.drivephotolibrary.data.model.StorageBreakdown
import com.dylan.drivephotolibrary.data.model.TrashActionResponse
import com.dylan.drivephotolibrary.data.model.TrashRequest
import com.dylan.drivephotolibrary.data.model.TreeResponse
import com.dylan.drivephotolibrary.data.model.UsersResponse
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.http.Body
import retrofit2.http.DELETE
import retrofit2.http.GET
import retrofit2.http.Multipart
import retrofit2.http.POST
import retrofit2.http.Part
import retrofit2.http.Path
import retrofit2.http.Query

interface DriveApiService {

    @GET("auth/status")
    suspend fun getStatus(): AuthStatus

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): LoginResponse

    @POST("auth/logout")
    suspend fun logout(): ActionResponse

    @GET("files")
    suspend fun listFiles(
        @Query("filter") filter: String? = null,
        @Query("search") search: String? = null,
        @Query("folderId") folderId: String? = null
    ): FilesResponse

    @GET("tree")
    suspend fun getTree(
        @Query("folderId") folderId: String? = null,
        @Query("filter") filter: String? = null
    ): TreeResponse

    @POST("folders")
    suspend fun createFolder(@Body request: CreateFolderRequest): CreateFolderResponse

    @POST("folders/{id}/mark-synced")
    suspend fun markFolderSynced(@Path("id") id: String): ActionResponse

    @POST("files/{id}/mark-synced")
    suspend fun markFileSynced(@Path("id") id: String): ActionResponse

    @Multipart
    @POST("upload")
    suspend fun uploadFile(
        @Part file: MultipartBody.Part,
        @Part("folderId") folderId: RequestBody? = null,
        @Part("folderPath") folderPath: RequestBody? = null
    ): ActionResponse

    // Multi-User Management API (Phase 2)
    @GET("users")
    suspend fun listUsers(): UsersResponse

    @POST("users")
    suspend fun createUser(@Body request: CreateUserRequest): CreateUserResponse

    @DELETE("users/{id}")
    suspend fun deleteUser(@Path("id") id: Int): ActionResponse

    @POST("users/change-password")
    suspend fun changePassword(@Body request: ChangePasswordRequest): ActionResponse

    // Approach A: Shared Drive & Folder Routing
    @GET("drive/config")
    suspend fun getDriveConfig(@Query("search") search: String? = null): DriveConfigResponse

    @POST("drive/config")
    suspend fun updateDriveConfig(@Body request: SetRootFolderRequest): DriveConfigResponse

    // Active Sessions & Revocation
    @GET("sessions")
    suspend fun listSessions(): SessionsResponse

    @POST("sessions/revoke")
    suspend fun revokeSession(@Body request: RevokeSessionRequest): ActionResponse

    // Pre-flight Deduplication Check
    @GET("upload/check")
    suspend fun checkFileExists(
        @Query("md5") md5: String? = null,
        @Query("fileName") fileName: String? = null,
        @Query("size") size: Long? = null,
        @Query("folderId") folderId: String? = null
    ): FileCheckResponse

    // Phase 3: Resumable Uploads
    @POST("upload/init")
    suspend fun initUpload(@Body request: InitUploadRequest): InitUploadResponse

    // Phase 5: Soft Delete, Trash & Storage Management
    @POST("trash")
    suspend fun moveToTrash(@Body request: TrashRequest): TrashActionResponse

    @POST("trash/restore")
    suspend fun restoreFromTrash(@Body request: TrashRequest): TrashActionResponse

    @POST("trash/empty")
    suspend fun emptyTrash(@Body request: EmptyTrashRequest): TrashActionResponse

    @GET("storage")
    suspend fun getStorageBreakdown(): StorageBreakdown
}
