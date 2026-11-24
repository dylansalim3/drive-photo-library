package com.dylan.drivephotolibrary.data.settings

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class AutoBackupPreferences(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("dpl_auto_backup_prefs", Context.MODE_PRIVATE)

    private val _backupEnabled = MutableStateFlow(prefs.getBoolean(KEY_BACKUP_ENABLED, false))
    val backupEnabled: StateFlow<Boolean> = _backupEnabled.asStateFlow()

    private val _wifiOnly = MutableStateFlow(prefs.getBoolean(KEY_WIFI_ONLY, true))
    val wifiOnly: StateFlow<Boolean> = _wifiOnly.asStateFlow()

    private val _chargingOnly = MutableStateFlow(prefs.getBoolean(KEY_CHARGING_ONLY, true))
    val chargingOnly: StateFlow<Boolean> = _chargingOnly.asStateFlow()

    private val _lastBackupTime = MutableStateFlow(prefs.getLong(KEY_LAST_BACKUP_TIME, 0L))
    val lastBackupTime: StateFlow<Long> = _lastBackupTime.asStateFlow()

    private val _lastBackupResult = MutableStateFlow(prefs.getString(KEY_LAST_BACKUP_RESULT, "") ?: "")
    val lastBackupResult: StateFlow<String> = _lastBackupResult.asStateFlow()

    fun setBackupEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_BACKUP_ENABLED, enabled).apply()
        _backupEnabled.value = enabled
    }

    fun setWifiOnly(wifiOnly: Boolean) {
        prefs.edit().putBoolean(KEY_WIFI_ONLY, wifiOnly).apply()
        _wifiOnly.value = wifiOnly
    }

    fun setChargingOnly(chargingOnly: Boolean) {
        prefs.edit().putBoolean(KEY_CHARGING_ONLY, chargingOnly).apply()
        _chargingOnly.value = chargingOnly
    }

    fun setLastBackupResult(timestamp: Long, resultMessage: String) {
        prefs.edit()
            .putLong(KEY_LAST_BACKUP_TIME, timestamp)
            .putString(KEY_LAST_BACKUP_RESULT, resultMessage)
            .apply()
        _lastBackupTime.value = timestamp
        _lastBackupResult.value = resultMessage
    }

    companion object {
        private const val KEY_BACKUP_ENABLED = "auto_backup_enabled"
        private const val KEY_WIFI_ONLY = "auto_backup_wifi_only"
        private const val KEY_CHARGING_ONLY = "auto_backup_charging_only"
        private const val KEY_LAST_BACKUP_TIME = "auto_backup_last_time"
        private const val KEY_LAST_BACKUP_RESULT = "auto_backup_last_result"

        @Volatile
        private var instance: AutoBackupPreferences? = null

        fun getInstance(context: Context): AutoBackupPreferences {
            return instance ?: synchronized(this) {
                instance ?: AutoBackupPreferences(context.applicationContext).also { instance = it }
            }
        }
    }
}
