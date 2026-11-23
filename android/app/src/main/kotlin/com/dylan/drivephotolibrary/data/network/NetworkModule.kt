package com.dylan.drivephotolibrary.data.network

import android.content.Context
import com.dylan.drivephotolibrary.data.api.DriveApiService
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit

object NetworkModule {
    const val BASE_URL = "https://drive-photo-library.pages.dev/api/"

    private var cookieJar: PersistentCookieJar? = null
    private var okHttpClient: OkHttpClient? = null
    private var apiService: DriveApiService? = null

    fun initialize(context: Context) {
        if (cookieJar == null) {
            cookieJar = PersistentCookieJar(context.applicationContext)
        }
    }

    fun getCookieJar(context: Context): PersistentCookieJar {
        initialize(context)
        return cookieJar!!
    }

    fun getOkHttpClient(context: Context): OkHttpClient {
        if (okHttpClient == null) {
            val jar = getCookieJar(context)
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BASIC
            }

            okHttpClient = OkHttpClient.Builder()
                .cookieJar(jar)
                .addInterceptor(logging)
                .connectTimeout(30, TimeUnit.SECONDS)
                .readTimeout(60, TimeUnit.SECONDS)
                .writeTimeout(60, TimeUnit.SECONDS)
                .build()
        }
        return okHttpClient!!
    }

    fun getApiService(context: Context): DriveApiService {
        if (apiService == null) {
            val client = getOkHttpClient(context)
            val json = Json {
                ignoreUnknownKeys = true
                isLenient = true
                coerceInputValues = true
            }

            val retrofit = Retrofit.Builder()
                .baseUrl(BASE_URL)
                .client(client)
                .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
                .build()

            apiService = retrofit.create(DriveApiService::class.java)
        }
        return apiService!!
    }
}
