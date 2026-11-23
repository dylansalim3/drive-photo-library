package com.dylan.drivephotolibrary.ui.screens

import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
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
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Archive
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.DeleteForever
import androidx.compose.material.icons.filled.FolderOpen
import androidx.compose.material.icons.filled.Restore
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dylan.drivephotolibrary.data.model.DriveFolder
import com.dylan.drivephotolibrary.ui.components.BreadcrumbsBar
import com.dylan.drivephotolibrary.ui.components.DriveTopBar
import com.dylan.drivephotolibrary.ui.components.FolderGridCard
import com.dylan.drivephotolibrary.ui.components.FolderListItem
import com.dylan.drivephotolibrary.ui.components.MediaGrid
import com.dylan.drivephotolibrary.ui.components.MediaList
import com.dylan.drivephotolibrary.ui.components.MediaSortFilterBar
import com.dylan.drivephotolibrary.ui.components.SharedDriveConfigBottomSheet
import com.dylan.drivephotolibrary.ui.components.UploadFabSheet
import com.dylan.drivephotolibrary.ui.components.UserManagementBottomSheet
import com.dylan.drivephotolibrary.ui.components.VacationSyncBottomSheet
import com.dylan.drivephotolibrary.ui.viewmodel.DriveViewModel
import com.dylan.drivephotolibrary.ui.viewmodel.ViewMode

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DriveScreen(
    viewModel: DriveViewModel,
    modifier: Modifier = Modifier
) {
    val uiState by viewModel.uiState.collectAsState()
    val snackbarHostState = remember { SnackbarHostState() }
    val vacationSheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

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
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
            ) {
                DriveTopBar(
                    searchQuery = uiState.searchQuery,
                    onSearchQueryChange = { viewModel.setSearchQuery(it) },
                    viewMode = uiState.viewMode,
                    onViewModeChange = { viewModel.setViewMode(it) },
                    username = uiState.authStatus?.username,
                    role = uiState.authStatus?.role,
                    onLogout = { viewModel.logout() },
                    onOpenVacationSync = {
                        viewModel.setShowVacationSyncSheet(true)
                        viewModel.loadStorageBreakdown()
                    },
                    onOpenUserManagement = { viewModel.openUserManagement() },
                    onOpenSharedDriveConfig = { viewModel.openSharedDriveConfig() }
                )

                // Breadcrumbs Bar with Back Navigation & Refresh (Full gallery height maximized)
                BreadcrumbsBar(
                    breadcrumbs = uiState.breadcrumbs,
                    currentFolderId = uiState.currentFolderId,
                    onNavigate = { viewModel.navigateToFolder(it) },
                    onRefresh = { viewModel.loadFiles() },
                    isLoading = uiState.isLoadingFiles
                )

                // Resumable Chunked Upload Progress Banner
                if (uiState.isUploading && uiState.uploadProgress != null) {
                    val prog = uiState.uploadProgress!!
                    Surface(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp),
                        shape = RoundedCornerShape(12.dp),
                        color = MaterialTheme.colorScheme.secondaryContainer
                    ) {
                        Column(modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween
                            ) {
                                Text(
                                    text = "Uploading ${prog.fileName} (8MB chunks)",
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.Medium,
                                    maxLines = 1,
                                    modifier = Modifier.weight(1f)
                                )
                                Text(
                                    text = "${prog.percent}%",
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            Spacer(modifier = Modifier.height(4.dp))
                            LinearProgressIndicator(
                                progress = { prog.percent / 100f },
                                modifier = Modifier.fillMaxWidth()
                            )
                        }
                    }
                }
            }
        },
        floatingActionButton = {
            if (!uiState.isSelectMode) {
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
                                    onMarkSynced = { viewModel.markFolderSynced(folder.id) },
                                    onDownloadZip = { viewModel.downloadFolderZip(folder) },
                                    isSelectMode = uiState.isSelectMode,
                                    isSelected = uiState.selectedFolderIds.contains(folder.id),
                                    onToggleSelect = { viewModel.toggleFolderSelection(folder.id) }
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
                                    onMarkSynced = { viewModel.markFolderSynced(folder.id) },
                                    onDownloadZip = { viewModel.downloadFolderZip(folder) },
                                    isSelectMode = uiState.isSelectMode,
                                    isSelected = uiState.selectedFolderIds.contains(folder.id),
                                    onToggleSelect = { viewModel.toggleFolderSelection(folder.id) }
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
                        MediaSortFilterBar(
                            syncFilter = uiState.filter,
                            onSyncFilterChange = { viewModel.setFilter(it) },
                            mediaTypeFilter = uiState.mediaTypeFilter,
                            onMediaTypeFilterChange = { viewModel.setMediaTypeFilter(it) },
                            sortOption = uiState.sortOption,
                            onSortOptionChange = { viewModel.setSortOption(it) },
                            dateGrouping = uiState.dateGrouping,
                            onDateGroupingChange = { viewModel.setDateGrouping(it) },
                            isSelectMode = uiState.isSelectMode,
                            onToggleSelectMode = { viewModel.toggleSelectMode() },
                            totalCount = uiState.files.size,
                            uploaderFilter = uiState.uploaderFilter,
                            onUploaderFilterChange = { viewModel.setUploaderFilter(it) },
                            uploaders = uiState.uploaders
                        )

                        if (uiState.processedFiles.isEmpty()) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(32.dp),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = "No matching files for selected filter",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        } else if (uiState.viewMode == ViewMode.MAP) {
                            TravelMapScreen(
                                files = uiState.processedFiles,
                                onSelectFile = { file ->
                                    val index = uiState.processedFiles.indexOf(file)
                                    if (index >= 0) viewModel.selectFile(index)
                                },
                                modifier = Modifier.weight(1f)
                            )
                        } else if (uiState.viewMode == ViewMode.GRID) {
                            MediaGrid(
                                files = uiState.processedFiles,
                                onSelectFile = { _, index -> viewModel.selectFile(index) },
                                dateGrouping = uiState.dateGrouping,
                                isSelectMode = uiState.isSelectMode,
                                selectedFileIds = uiState.selectedFileIds,
                                onToggleSelectFile = { viewModel.toggleFileSelection(it.id) },
                                modifier = Modifier.weight(1f)
                            )
                        } else {
                            MediaList(
                                files = uiState.processedFiles,
                                onSelectFile = { _, index -> viewModel.selectFile(index) },
                                onDownloadFile = { viewModel.downloadFolderZip(DriveFolder(id = it.id, name = it.name)) },
                                dateGrouping = uiState.dateGrouping,
                                isSelectMode = uiState.isSelectMode,
                                selectedFileIds = uiState.selectedFileIds,
                                onToggleSelectFile = { viewModel.toggleFileSelection(it.id) },
                                modifier = Modifier.weight(1f)
                            )
                        }
                    }
                }
            }

            // Floating Multi-Selection Action Bar
            val selectedCount = uiState.selectedFileIds.size + uiState.selectedFolderIds.size
            AnimatedVisibility(
                visible = uiState.isSelectMode && selectedCount > 0,
                enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
                exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(horizontal = 16.dp, vertical = 16.dp)
            ) {
                Surface(
                    shape = RoundedCornerShape(24.dp),
                    color = MaterialTheme.colorScheme.surfaceContainerHighest,
                    shadowElevation = 10.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(
                            text = "$selectedCount selected",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold,
                            color = MaterialTheme.colorScheme.onSurface
                        )

                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            if (uiState.filter == "trash") {
                                Button(
                                    onClick = {
                                        viewModel.restoreFromTrash(
                                            uiState.selectedFileIds.toList(),
                                            uiState.selectedFolderIds.toList()
                                        )
                                    },
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Restore,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Restore", fontSize = 12.sp)
                                }

                                OutlinedButton(
                                    onClick = { viewModel.emptyTrash() },
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.DeleteForever,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.error,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Delete", fontSize = 12.sp, color = MaterialTheme.colorScheme.error)
                                }
                            } else {
                                Button(
                                    onClick = { viewModel.downloadSelectedZip() },
                                    shape = RoundedCornerShape(12.dp),
                                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Archive,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("ZIP", fontSize = 12.sp)
                                }

                                FilledTonalButton(
                                    onClick = { viewModel.syncSelected() },
                                    shape = RoundedCornerShape(12.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Check,
                                        contentDescription = null,
                                        modifier = Modifier.size(16.dp)
                                    )
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Text("Sync", fontSize = 12.sp)
                                }

                                IconButton(
                                    onClick = {
                                        viewModel.moveToTrash(
                                            uiState.selectedFileIds.toList(),
                                            uiState.selectedFolderIds.toList()
                                        )
                                    },
                                    modifier = Modifier.size(36.dp)
                                ) {
                                    Icon(
                                        imageVector = Icons.Default.Delete,
                                        contentDescription = "Move to Trash",
                                        tint = MaterialTheme.colorScheme.error
                                    )
                                }
                            }

                            IconButton(
                                onClick = { viewModel.clearSelection() },
                                modifier = Modifier.size(36.dp)
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Close,
                                    contentDescription = "Clear Selection",
                                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    // Fullscreen Swipeable Media Lightbox
    if (uiState.selectedFileIndex != null) {
        MediaViewerDialog(
            files = uiState.processedFiles,
            initialIndex = uiState.selectedFileIndex!!,
            onClose = { viewModel.selectFile(null) },
            onMarkSynced = { viewModel.markFileSynced(it) }
        )
    }

    // Vacation Sync Center Modal Bottom Sheet
    if (uiState.showVacationSyncSheet) {
        VacationSyncBottomSheet(
            sheetState = vacationSheetState,
            onDismissRequest = { viewModel.setShowVacationSyncSheet(false) },
            pendingCount = uiState.files.count { it.syncStatus == "not-sync" },
            isDownloadingZip = uiState.isDownloadingZip,
            zipProgress = uiState.zipDownloadProgress,
            isSyncingAll = uiState.isSyncingAll,
            onDownloadAllZip = { viewModel.downloadAllNotSyncZip() },
            onDownloadManifest = { viewModel.downloadManifestJson() },
            onMarkAllSynced = { viewModel.markAllNotSyncSynced() },
            storageBreakdown = uiState.storageBreakdown,
            onEmptyTrash = { viewModel.emptyTrash() }
        )
    }

    // Dedicated ZIP Progress Dialog (when downloading in background or outside sheet)
    if (uiState.isDownloadingZip && uiState.showZipProgressDialog && !uiState.showVacationSyncSheet) {
        val prog = uiState.zipDownloadProgress
        AlertDialog(
            onDismissRequest = { viewModel.setShowZipProgressDialog(false) },
            title = {
                Text("Creating ZIP Archive", fontWeight = FontWeight.Bold)
            },
            text = {
                Column {
                    if (prog != null) {
                        Text(
                            text = "${prog.percent}% • ${prog.current} of ${prog.total} files",
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Medium
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        LinearProgressIndicator(
                            progress = { prog.percent / 100f },
                            modifier = Modifier.fillMaxWidth()
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = prog.currentFileName,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1
                        )
                    } else {
                        CircularProgressIndicator(modifier = Modifier.size(24.dp))
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("Gathering items from Google Drive...")
                    }
                }
            },
            confirmButton = {
                TextButton(onClick = { viewModel.setShowZipProgressDialog(false) }) {
                    Text("Run in Background")
                }
            }
        )
    }

    // Phase 2: User Management & Active Sessions Modal Bottom Sheet
    if (uiState.showUserManagementSheet) {
        UserManagementBottomSheet(
            authStatus = uiState.authStatus,
            users = uiState.users,
            isLoadingUsers = uiState.isLoadingUsers,
            sessions = uiState.sessions,
            isLoadingSessions = uiState.isLoadingSessions,
            onDismiss = { viewModel.closeUserManagement() },
            onCreateUser = { username, pass, role, onDone ->
                viewModel.createUser(username, pass, role, onDone)
            },
            onDeleteUser = { id, onDone ->
                viewModel.deleteUser(id, onDone)
            },
            onChangePassword = { currentPass, newPass, onDone ->
                viewModel.changePassword(currentPass, newPass, onDone)
            },
            onRevokeSession = { prefix ->
                viewModel.revokeSession(prefix)
            },
            onRevokeOtherSessions = {
                viewModel.revokeOtherSessions()
            }
        )
    }

    // Phase 2: Approach A Shared Drive & Folder Configuration Modal Bottom Sheet
    if (uiState.showSharedDriveConfigSheet) {
        SharedDriveConfigBottomSheet(
            authStatus = uiState.authStatus,
            driveConfig = uiState.driveConfig,
            isLoading = uiState.isLoadingDriveConfig,
            onDismiss = { viewModel.closeSharedDriveConfig() },
            onSwitchFolder = { folderId ->
                viewModel.switchRootFolder(folderId)
            },
            onResetDefault = {
                viewModel.resetRootFolderDefault()
            },
            onRefresh = {
                viewModel.loadDriveConfig()
            }
        )
    }
}
