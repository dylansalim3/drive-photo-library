package com.dylan.drivephotolibrary.data.api

import com.dylan.drivephotolibrary.data.model.ActionResponse
import com.dylan.drivephotolibrary.data.model.AuthStatus
import com.dylan.drivephotolibrary.data.model.CreateFolderRequest
import com.dylan.drivephotolibrary.data.model.CreateFolderResponse
import com.dylan.drivephotolibrary.data.model.FilesResponse
import com.dylan.drivephotolibrary.data.model.LoginRequest
import com.dylan.drivephotolibrary.data.model.LoginResponse
import com.dylan.drivephotolibrary.data.model.TreeResponse
import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.http.Body
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
}
