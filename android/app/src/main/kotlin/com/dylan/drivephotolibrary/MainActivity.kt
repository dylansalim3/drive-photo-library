package com.dylan.drivephotolibrary

import android.os.Bundle
import android.view.WindowManager
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.fragment.app.FragmentActivity
import androidx.lifecycle.lifecycleScope
import com.dylan.drivephotolibrary.data.settings.SecurityPreferences
import com.dylan.drivephotolibrary.ui.screens.DriveScreen
import com.dylan.drivephotolibrary.ui.screens.LockScreen
import com.dylan.drivephotolibrary.ui.screens.LoginScreen
import com.dylan.drivephotolibrary.ui.security.BiometricAuthManager
import com.dylan.drivephotolibrary.ui.theme.DrivePhotoLibraryTheme
import com.dylan.drivephotolibrary.ui.viewmodel.DriveViewModel
import kotlinx.coroutines.launch

class MainActivity : FragmentActivity() {
    private val viewModel: DriveViewModel by viewModels()
    private val securityPreferences by lazy { SecurityPreferences.getInstance(this) }
    private var isAppLocked by mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Set initial lock state if biometric is enabled
        if (securityPreferences.biometricEnabled.value) {
            isAppLocked = true
            promptBiometricUnlock()
        }

        // Apply Recent Apps privacy flag
        lifecycleScope.launch {
            securityPreferences.hideInRecentApps.collect { hide ->
                if (hide) {
                    window.addFlags(WindowManager.LayoutParams.FLAG_SECURE)
                } else {
                    window.clearFlags(WindowManager.LayoutParams.FLAG_SECURE)
                }
            }
        }

        setContent {
            val uiState by viewModel.uiState.collectAsState()

            DrivePhotoLibraryTheme(
                themeMode = uiState.themeMode,
                dynamicColor = uiState.dynamicColor
            ) {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    if (isAppLocked) {
                        LockScreen(
                            onUnlockClick = { promptBiometricUnlock() }
                        )
                    } else if (uiState.isLoadingAuth && uiState.authStatus == null) {
                        Box(
                            modifier = Modifier.fillMaxSize(),
                            contentAlignment = Alignment.Center
                        ) {
                            CircularProgressIndicator()
                        }
                    } else if (uiState.authStatus?.authenticated == true) {
                        DriveScreen(viewModel = viewModel)
                    } else {
                        LoginScreen(
                            isLoading = uiState.isLoadingAuth,
                            errorMessage = uiState.authError,
                            onLogin = { username, password ->
                                viewModel.login(username, password)
                            }
                        )
                    }
                }
            }
        }
    }

    override fun onResume() {
        super.onResume()
        if (securityPreferences.shouldLockOnResume()) {
            isAppLocked = true
            promptBiometricUnlock()
        }
    }

    override fun onStop() {
        super.onStop()
        securityPreferences.recordBackgroundTimestamp()
    }

    private fun promptBiometricUnlock() {
        if (!securityPreferences.biometricEnabled.value) {
            isAppLocked = false
            return
        }

        BiometricAuthManager.authenticate(
            activity = this,
            title = "Unlock Drive Photo Library",
            subtitle = "Verify your biometric credential to continue",
            onSuccess = {
                isAppLocked = false
            },
            onError = { _ ->
                // Keep locked so user can tap "Unlock Library" to retry
            }
        )
    }
}
