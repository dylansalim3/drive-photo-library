package com.dylan.drivephotolibrary

import android.os.Bundle
import androidx.activity.ComponentActivity
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import com.dylan.drivephotolibrary.ui.screens.DriveScreen
import com.dylan.drivephotolibrary.ui.screens.LoginScreen
import com.dylan.drivephotolibrary.ui.theme.DrivePhotoLibraryTheme
import com.dylan.drivephotolibrary.ui.viewmodel.DriveViewModel

class MainActivity : ComponentActivity() {
    private val viewModel: DriveViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            DrivePhotoLibraryTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background
                ) {
                    val uiState by viewModel.uiState.collectAsState()

                    if (uiState.isLoadingAuth && uiState.authStatus == null) {
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
}
