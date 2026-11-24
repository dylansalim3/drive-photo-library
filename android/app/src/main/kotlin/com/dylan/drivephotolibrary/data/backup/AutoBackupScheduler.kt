package com.dylan.drivephotolibrary.data.backup

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.ExistingPeriodicWorkPolicy
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.PeriodicWorkRequestBuilder
import androidx.work.WorkManager
import java.util.concurrent.TimeUnit

object AutoBackupScheduler {
    const val UNIQUE_PERIODIC_WORK_NAME = "dpl_camera_autobackup"
    const val UNIQUE_IMMEDIATE_WORK_NAME = "dpl_camera_autobackup_immediate"

    fun schedule(context: Context, wifiOnly: Boolean, chargingOnly: Boolean) {
        val constraints = Constraints.Builder().apply {
            setRequiredNetworkType(if (wifiOnly) NetworkType.UNMETERED else NetworkType.CONNECTED)
            setRequiresCharging(chargingOnly)
        }.build()

        val periodicWork = PeriodicWorkRequestBuilder<AutoBackupWorker>(15, TimeUnit.MINUTES)
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.MINUTES)
            .build()

        WorkManager.getInstance(context).enqueueUniquePeriodicWork(
            UNIQUE_PERIODIC_WORK_NAME,
            ExistingPeriodicWorkPolicy.UPDATE,
            periodicWork
        )
    }

    fun cancel(context: Context) {
        WorkManager.getInstance(context).cancelUniqueWork(UNIQUE_PERIODIC_WORK_NAME)
    }

    fun triggerImmediate(context: Context) {
        val immediateWork = OneTimeWorkRequestBuilder<AutoBackupWorker>()
            .build()

        WorkManager.getInstance(context).enqueueUniqueWork(
            UNIQUE_IMMEDIATE_WORK_NAME,
            ExistingWorkPolicy.REPLACE,
            immediateWork
        )
    }
}
