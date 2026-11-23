package com.dylan.drivephotolibrary.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SecondaryTabRow
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.dylan.drivephotolibrary.ui.components.BreadcrumbsBar
import com.dylan.drivephotolibrary.ui.components.DriveTopBar
import com.dylan.drivephotolibrary.ui.components.FolderGridCard
import com.dylan.drivephotolibrary.ui.components.FolderListItem
import com.dylan.drivephotolibrary.ui.components.MediaGrid
import com.dylan.drivephotolibrary.ui.components.MediaList
import com.dylan.drivephotolibrary.ui.components.UploadFabSheet
import com.dylan.drivephotolibrary.ui.viewmodel.DriveViewModel
import com.dylan.drivephotolibrary.ui.viewmodel.ViewMode

@Composable
fun DriveScreen(
    viewModel: DriveViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }

    // System Media Picker
    val photoPickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.PickMultipleVisualMedia()
    ) { uris ->
        if (uris.isNotEmpty()) {
            viewModel.uploadUris(uris)
        }
    }

    // System File Picker
    val filePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenMultipleDocuments()
    ) { uris ->
        if (uris.isNotEmpty()) {
            viewModel.uploadUris(uris)
        }
    }

    LaunchedEffect(uiState.actionNotice, uiState.uploadNotice) {
        val notice = uiState.actionNotice ?: uiState.uploadNotice
        if (notice != null) {
            snackbarHostState.showSnackbar(notice)
            viewModel.clearNotices()
        }
    }

    Scaffold(
        modifier = modifier.fillMaxSize(),
        snackbarHost = { SnackbarHost(snackbarHostState) },
        topBar = {
            Column {
                DriveTopBar(
                    searchQuery = uiState.searchQuery,
                    onSearchQueryChange = { viewModel.setSearchQuery(it) },
                    viewMode = uiState.viewMode,
                    onViewModeChange = { viewModel.setViewMode(it) },
                    username = uiState.authStatus?.username,
                    onLogout = { viewModel.logout() }
                )

                // Material 3 Filter Tabs (Not-sync, Synced, All)
                val tabs = listOf("not-sync" to "Not-sync", "synced" to "Synced", "all" to "All")
                val selectedTabIndex = tabs.indexOfFirst { it.first == uiState.filter }.coerceAtLeast(0)

                SecondaryTabRow(selectedTabIndex = selectedTabIndex) {
                    tabs.forEachIndexed { index, (key, title) ->
                        Tab(
                            selected = selectedTabIndex == index,
                            onClick = { viewModel.setFilter(key) },
                            text = { Text(title, fontWeight = FontWeight.SemiBold) }
                        )
                    }
                }

                // Breadcrumbs Bar with Back Navigation & Refresh
                BreadcrumbsBar(
                    breadcrumbs = uiState.breadcrumbs,
                    currentFolderId = uiState.currentFolderId,
                    onNavigate = { viewModel.navigateToFolder(it) },
                    onRefresh = { viewModel.loadFiles() },
                    isLoading = uiState.isLoadingFiles
                )
            }
        },
        floatingActionButton = {
            UploadFabSheet(
                onNewFolder = { viewModel.createFolder(it) },
                onUploadPhotosClick = {
                    photoPickerLauncher.launch(
                        PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageAndVideo)
                    )
                },
                onUploadFilesClick = {
                    filePickerLauncher.launch(arrayOf("image/*", "video/*", "*/*"))
                }
            )
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Uploading progress banner
                if (uiState.isUploading && uiState.uploadNotice != null) {
                    Surface(
                        color = MaterialTheme.colorScheme.secondaryContainer,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 6.dp),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                strokeWidth = 2.dp
                            )
                            Spacer(modifier = Modifier.size(10.dp))
                            Text(
                                text = uiState.uploadNotice ?: "",
                                style = MaterialTheme.typography.bodyMedium
                            )
                        }
                    }
                }

                // Error banner
                if (uiState.filesError != null) {
                    Surface(
                        color = MaterialTheme.colorScheme.errorContainer,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 6.dp),
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = uiState.filesError ?: "",
                                color = MaterialTheme.colorScheme.onErrorContainer,
                                style = MaterialTheme.typography.bodyMedium,
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }

                // Subfolders Section
                if (uiState.subfolders.isNotEmpty()) {
                    Text(
                        text = "Folders (${uiState.subfolders.size})",
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 4.dp)
                    )

                    if (uiState.viewMode == ViewMode.GRID) {
                        LazyVerticalGrid(
                            columns = GridCells.Fixed(2),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp),
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            items(uiState.subfolders, key = { it.id }) { folder ->
                                FolderGridCard(
                                    folder = folder,
                                    onClick = { viewModel.navigateToFolder(folder.id) },
                                    onMarkSynced = { viewModel.markFolderSynced(folder.id) }
                                )
                            }
                        }
                    } else {
                        LazyColumn(
                            contentPadding = PaddingValues(vertical = 4.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            items(uiState.subfolders, key = { it.id }) { folder ->
                                FolderListItem(
                                    folder = folder,
                                    onClick = { viewModel.navigateToFolder(folder.id) },
                                    onMarkSynced = { viewModel.markFolderSynced(folder.id) }
                                )
                            }
                        }
                    }
                }

                // Media Files Section
                if (uiState.isLoadingFiles && uiState.files.isEmpty() && uiState.subfolders.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        CircularProgressIndicator()
                    }
                } else if (uiState.files.isEmpty() && uiState.subfolders.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .weight(1f),
                        contentAlignment = Alignment.Center
                    ) {
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Icon(
                                imageVector = Icons.Default.FolderOpen,
                                contentDescription = null,
                                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.size(56.dp)
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "No items in this folder",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                            Text(
                                text = "Tap + to upload photos, videos, or create subfolders",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.outline
                            )
                        }
                    }
                } else {
                    if (uiState.files.isNotEmpty()) {
                        Text(
                            text = "Files (${uiState.files.size})",
                            style = MaterialTheme.typography.titleSmall,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            modifier = Modifier.padding(start = 16.dp, top = 8.dp, bottom = 4.dp)
                        )

                        if (uiState.viewMode == ViewMode.GRID) {
                            MediaGrid(
                                files = uiState.files,
                                onSelectFile = { _, index -> viewModel.selectFile(index) },
                                modifier = Modifier.weight(1f)
                            )
                        } else {
                            MediaList(
                                files = uiState.files,
                                onSelectFile = { _, index -> viewModel.selectFile(index) },
                                onDownloadFile = { /* handled in viewer or single item */ },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }
        }
    }

    // Fullscreen Swipeable Media Lightbox
    if (uiState.selectedFileIndex != null) {
        MediaViewerDialog(
            files = uiState.files,
            initialIndex = uiState.selectedFileIndex!!,
            onClose = { viewModel.selectFile(null) },
            onMarkSynced = { viewModel.markFileSynced(it) }
        )
    }
}
