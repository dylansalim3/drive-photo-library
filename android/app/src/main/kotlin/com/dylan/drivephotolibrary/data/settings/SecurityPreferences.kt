package com.dylan.drivephotolibrary.data.settings

import android.content.Context
import android.content.SharedPreferences
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow

class SecurityPreferences(context: Context) {
    private val prefs: SharedPreferences =
        context.getSharedPreferences("dpl_security_prefs", Context.MODE_PRIVATE)

    private val _biometricEnabled = MutableStateFlow(prefs.getBoolean(KEY_BIOMETRIC_ENABLED, false))
    val biometricEnabled: StateFlow<Boolean> = _biometricEnabled.asStateFlow()

    private val _lockTimeoutMinutes = MutableStateFlow(prefs.getInt(KEY_LOCK_TIMEOUT_MINUTES, 0))
    val lockTimeoutMinutes: StateFlow<Int> = _lockTimeoutMinutes.asStateFlow()

    private val _hideInRecentApps = MutableStateFlow(prefs.getBoolean(KEY_HIDE_IN_RECENT_APPS, false))
    val hideInRecentApps: StateFlow<Boolean> = _hideInRecentApps.asStateFlow()

    fun setBiometricEnabled(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_BIOMETRIC_ENABLED, enabled).apply()
        _biometricEnabled.value = enabled
    }

    fun setLockTimeoutMinutes(minutes: Int) {
        prefs.edit().putInt(KEY_LOCK_TIMEOUT_MINUTES, minutes).apply()
        _lockTimeoutMinutes.value = minutes
    }

    fun setHideInRecentApps(enabled: Boolean) {
        prefs.edit().putBoolean(KEY_HIDE_IN_RECENT_APPS, enabled).apply()
        _hideInRecentApps.value = enabled
    }

    fun recordBackgroundTimestamp() {
        prefs.edit().putLong(KEY_LAST_BACKGROUND_TIME, System.currentTimeMillis()).apply()
    }

    fun shouldLockOnResume(): Boolean {
        if (!_biometricEnabled.value) return false
        val timeoutMinutes = _lockTimeoutMinutes.value
        if (timeoutMinutes < 0) return false // Never
        if (timeoutMinutes == 0) return true // Immediately

        val lastBg = prefs.getLong(KEY_LAST_BACKGROUND_TIME, 0L)
        if (lastBg == 0L) return true
        val elapsed = System.currentTimeMillis() - lastBg
        return elapsed >= (timeoutMinutes * 60 * 1000L)
    }

    companion object {
        private const val KEY_BIOMETRIC_ENABLED = "sec_biometric_enabled"
        private const val KEY_LOCK_TIMEOUT_MINUTES = "sec_lock_timeout_minutes"
        private const val KEY_HIDE_IN_RECENT_APPS = "sec_hide_in_recent_apps"
        private const val KEY_LAST_BACKGROUND_TIME = "sec_last_background_time"

        @Volatile
        private var instance: SecurityPreferences? = null

        fun getInstance(context: Context): SecurityPreferences {
            return instance ?: synchronized(this) {
                instance ?: SecurityPreferences(context.applicationContext).also { instance = it }
            }
        }
    }
}
