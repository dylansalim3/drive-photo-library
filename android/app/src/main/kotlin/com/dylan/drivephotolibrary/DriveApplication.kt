package com.dylan.drivephotolibrary

import android.app.Application
import coil3.ImageLoader
import coil3.PlatformContext
import coil3.SingletonImageLoader
import coil3.network.okhttp.OkHttpNetworkFetcherFactory
import com.dylan.drivephotolibrary.data.network.NetworkModule

class DriveApplication : Application(), SingletonImageLoader.Factory {

    override fun onCreate() {
        super.onCreate()
        NetworkModule.initialize(this)
    }

    override fun newImageLoader(context: PlatformContext): ImageLoader {
        val okHttpClient = NetworkModule.getOkHttpClient(this)
        return ImageLoader.Builder(context)
            .components {
                add(OkHttpNetworkFetcherFactory(callFactory = { okHttpClient }))
            }
            .build()
    }
}
