package com.dylan.drivephotolibrary.ui.screens

import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
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
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dylan.drivephotolibrary.data.model.DriveFile
import com.dylan.drivephotolibrary.data.model.DriveFolder
import com.dylan.drivephotolibrary.ui.components.AppUpdateBanner
import com.dylan.drivephotolibrary.ui.components.AppUpdateDialog
import com.dylan.drivephotolibrary.ui.components.BreadcrumbsBar
import com.dylan.drivephotolibrary.ui.components.DriveDualPaneContent
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
import com.dylan.drivephotolibrary.ui.util.DevicePosture
import com.dylan.drivephotolibrary.ui.util.rememberDevicePosture
import com.dylan.drivephotolibrary.ui.viewmodel.DriveViewModel
import com.dylan.drivephotolibrary.ui.viewmodel.ViewMode

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DriveScreen(
    viewModel: DriveViewModel,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()
    val devicePosture by rememberDevicePosture()
    var focusedFile by remember { mutableStateOf<DriveFile?>(null) }
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
                    onOpenSharedDriveConfig = { viewModel.openSharedDriveConfig() },
                    onOpenSettings = { viewModel.setShowSettingsScreen(true) },
                    updateStatus = uiState.updateStatus,
                    onCheckForUpdates = { viewModel.checkForAppUpdates(silent = false) }
                )

                // Remote In-App OTA Update Progress & Fallback Banner
                AppUpdateBanner(
                    status = uiState.updateStatus,
                    onOpenDialog = { viewModel.showAppUpdateDialog() },
                    onInstallDirectly = { viewModel.installDownloadedApk(context) }
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

                // Foldable Adaptive Dual-Pane or Standard Single-Pane Layout
                val isDualPane = devicePosture is DevicePosture.DualPaneExpanded || devicePosture is DevicePosture.Book

                if (isDualPane && uiState.viewMode != ViewMode.MAP) {
                    DriveDualPaneContent(
                        uiState = uiState,
                        focusedFile = focusedFile,
                        onFocusFile = { focusedFile = it },
                        onOpenFileLightbox = { viewModel.selectFile(it) },
                        onNavigateFolder = { viewModel.navigateToFolder(it) },
                        onMarkSynced = { viewModel.markFileSynced(it) },
                        onTrashFile = { viewModel.moveToTrash(listOf(it), emptyList()) },
                        onDownloadFile = { viewModel.downloadFolderZip(DriveFolder(id = it.id, name = it.name)) },
                        onToggleSelectFile = { viewModel.toggleFileSelection(it) },
                        onToggleSelectFolder = { viewModel.toggleFolderSelection(it) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .weight(1f)
                    )
                } else {
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
            }

            // Floating Multi-Selection Action Bar
            val selectedCount = uiState.selectedFileIds.size + uiState.selectedFolderIds.size
            AnimatedVisibility(
                visible = uiState.isSelectMode && selectedCount > 0,
                enter = slideInVertically(initialOffsetY = { it }) + fadeIn(),
                exit = slideOutVertically(targetOffsetY = { it }) + fadeOut(),
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .navigationBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 12.dp)
            ) {
                Surface(
                    shape = RoundedCornerShape(28.dp),
                    color = Color(0xF20F172A),
                    border = BorderStroke(1.dp, Color(0x33FFFFFF)),
                    shadowElevation = 12.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        // Prominent High-Contrast Selection Count Pill
                        Surface(
                            shape = RoundedCornerShape(16.dp),
                            color = Color(0x2238BDF8),
                            border = BorderStroke(1.dp, Color(0x4438BDF8)),
                            modifier = Modifier.weight(1f, fill = false)
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(CircleShape)
                                        .background(Color(0xFF38BDF8))
                                )
                                Text(
                                    text = "$selectedCount selected",
                                    style = MaterialTheme.typography.titleSmall,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White,
                                    maxLines = 1
                                )
                            }
                        }

                        Spacer(modifier = Modifier.width(8.dp))

                        // Styled Action Icon-Pills with generous 38dp touch targets
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            if (uiState.filter == "trash") {
                                // Restore Button
                                Surface(
                                    shape = CircleShape,
                                    color = Color(0x3310B981),
                                    modifier = Modifier
                                        .size(38.dp)
                                        .clickable {
                                            viewModel.restoreFromTrash(
                                                uiState.selectedFileIds.toList(),
                                                uiState.selectedFolderIds.toList()
                                            )
                                        }
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            imageVector = Icons.Default.Restore,
                                            contentDescription = "Restore",
                                            tint = Color(0xFF34D399),
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                }

                                // Delete Permanently Button
                                Surface(
                                    shape = CircleShape,
                                    color = Color(0x33EF4444),
                                    modifier = Modifier
                                        .size(38.dp)
                                        .clickable { viewModel.emptyTrash() }
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            imageVector = Icons.Default.DeleteForever,
                                            contentDescription = "Delete",
                                            tint = Color(0xFFF87171),
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                }
                            } else {
                                // Download ZIP Button
                                Surface(
                                    shape = CircleShape,
                                    color = Color(0x330284C7),
                                    modifier = Modifier
                                        .size(38.dp)
                                        .clickable { viewModel.downloadSelectedZip() }
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            imageVector = Icons.Default.Archive,
                                            contentDescription = "Download ZIP",
                                            tint = Color(0xFF38BDF8),
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                }

                                // Mark Synced Button
                                Surface(
                                    shape = CircleShape,
                                    color = Color(0x3310B981),
                                    modifier = Modifier
                                        .size(38.dp)
                                        .clickable { viewModel.syncSelected() }
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            imageVector = Icons.Default.Check,
                                            contentDescription = "Mark as Synced",
                                            tint = Color(0xFF34D399),
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                }

                                // Move to Trash Button
                                Surface(
                                    shape = CircleShape,
                                    color = Color(0x33EF4444),
                                    modifier = Modifier
                                        .size(38.dp)
                                        .clickable {
                                            viewModel.moveToTrash(
                                                uiState.selectedFileIds.toList(),
                                                uiState.selectedFolderIds.toList()
                                            )
                                        }
                                ) {
                                    Box(contentAlignment = Alignment.Center) {
                                        Icon(
                                            imageVector = Icons.Default.Delete,
                                            contentDescription = "Move to Trash",
                                            tint = Color(0xFFF87171),
                                            modifier = Modifier.size(20.dp)
                                        )
                                    }
                                }
                            }

                            // Clear Selection (Close) Button
                            Surface(
                                shape = CircleShape,
                                color = Color(0x22FFFFFF),
                                modifier = Modifier
                                    .size(38.dp)
                                    .clickable { viewModel.clearSelection() }
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Icon(
                                        imageVector = Icons.Default.Close,
                                        contentDescription = "Clear Selection",
                                        tint = Color.White,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
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
            },
            onSearch = { query ->
                viewModel.loadDriveConfig(query)
            }
        )
    }

    // Remote In-App OTA Update Modal Dialog (with progress bar, changelog & install action)
    if (uiState.showUpdateDialog) {
        AppUpdateDialog(
            status = uiState.updateStatus,
            onStartDownload = { viewModel.startAppUpdateDownload(it) },
            onInstall = { viewModel.installDownloadedApk(context) },
            onCancelDownload = { viewModel.cancelAppUpdate() },
            onDismiss = { viewModel.dismissAppUpdateDialog() }
        )
    }

    // Dedicated Full-Screen Settings Page
    if (uiState.showSettingsScreen) {
        BackHandler {
            viewModel.setShowSettingsScreen(false)
        }
        SettingsScreen(
            uiState = uiState,
            viewModel = viewModel,
            onBack = { viewModel.setShowSettingsScreen(false) }
        )
    }
}
