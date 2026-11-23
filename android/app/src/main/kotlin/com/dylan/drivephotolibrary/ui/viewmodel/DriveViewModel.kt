package com.dylan.drivephotolibrary.ui.viewmodel

import android.app.Application
import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.dylan.drivephotolibrary.data.model.AuthStatus
import com.dylan.drivephotolibrary.data.model.Breadcrumb
import com.dylan.drivephotolibrary.data.model.DriveFile
import com.dylan.drivephotolibrary.data.model.DriveFolder
import com.dylan.drivephotolibrary.data.repository.DriveRepository
import com.dylan.drivephotolibrary.ui.util.Formatters
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

enum class ViewMode {
    GRID, LIST
}

enum class SortOption(val label: String) {
    DATE_DESC("Date (Newest)"),
    DATE_ASC("Date (Oldest)"),
    NAME_ASC("Name (A → Z)"),
    NAME_DESC("Name (Z → A)"),
    SIZE_DESC("Size (Largest)"),
    SIZE_ASC("Size (Smallest)")
}

enum class MediaTypeFilter(val label: String) {
    ALL("All"),
    PHOTOS("Photos"),
    VIDEOS("Videos")
}

enum class DateGroupingMode(val label: String) {
    GROUPED("Grouped"),
    CONTINUOUS("Continuous")
}

data class MediaDateGroup(
    val dateKey: String,
    val dateLabel: String,
    val files: List<DriveFile>,
    val startIndex: Int
)

fun groupFilesByDate(files: List<DriveFile>): List<MediaDateGroup> {
    val map = LinkedHashMap<String, MutableList<DriveFile>>()
    for (file in files) {
        val key = file.createdTime?.take(10) ?: file.modifiedTime?.take(10) ?: "earlier"
        map.getOrPut(key) { mutableListOf() }.add(file)
    }
    var runningIndex = 0
    return map.map { (key, groupFiles) ->
        val label = Formatters.getDateGroupLabel(groupFiles.firstOrNull()?.createdTime ?: groupFiles.firstOrNull()?.modifiedTime)
        val group = MediaDateGroup(
            dateKey = key,
            dateLabel = label,
            files = groupFiles,
            startIndex = runningIndex
        )
        runningIndex += groupFiles.size
        group
    }
}

data class DriveUiState(
    val authStatus: AuthStatus? = null,
    val isLoadingAuth: Boolean = false,
    val authError: String? = null,
    val filter: String = "not-sync",
    val searchQuery: String = "",
    val currentFolderId: String? = null,
    val breadcrumbs: List<Breadcrumb> = emptyList(),
    val subfolders: List<DriveFolder> = emptyList(),
    val files: List<DriveFile> = emptyList(),
    val isLoadingFiles: Boolean = false,
    val filesError: String? = null,
    val viewMode: ViewMode = ViewMode.GRID,
    val sortOption: SortOption = SortOption.DATE_DESC,
    val mediaTypeFilter: MediaTypeFilter = MediaTypeFilter.ALL,
    val dateGrouping: DateGroupingMode = DateGroupingMode.GROUPED,
    val selectedFileIndex: Int? = null,
    val isUploading: Boolean = false,
    val uploadNotice: String? = null,
    val actionNotice: String? = null
) {
    val processedFiles: List<DriveFile>
        get() {
            val filtered = when (mediaTypeFilter) {
                MediaTypeFilter.ALL -> files
                MediaTypeFilter.PHOTOS -> files.filter { !it.isVideo }
                MediaTypeFilter.VIDEOS -> files.filter { it.isVideo }
            }
            return when (sortOption) {
                SortOption.DATE_DESC -> filtered.sortedByDescending { it.createdTime ?: it.modifiedTime ?: "" }
                SortOption.DATE_ASC -> filtered.sortedBy { it.createdTime ?: it.modifiedTime ?: "" }
                SortOption.NAME_ASC -> filtered.sortedBy { it.name.lowercase() }
                SortOption.NAME_DESC -> filtered.sortedByDescending { it.name.lowercase() }
                SortOption.SIZE_DESC -> filtered.sortedByDescending { it.size?.toLongOrNull() ?: 0L }
                SortOption.SIZE_ASC -> filtered.sortedBy { it.size?.toLongOrNull() ?: 0L }
            }
        }
}

class DriveViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = DriveRepository(application)
    private val prefs = application.getSharedPreferences("drive_prefs", Context.MODE_PRIVATE)

    private val initialViewMode = try {
        ViewMode.valueOf(prefs.getString("view_mode", ViewMode.GRID.name) ?: ViewMode.GRID.name)
    } catch (_: Exception) {
        ViewMode.GRID
    }

    private val initialSortOption = try {
        SortOption.valueOf(prefs.getString("sort_option", SortOption.DATE_DESC.name) ?: SortOption.DATE_DESC.name)
    } catch (_: Exception) {
        SortOption.DATE_DESC
    }

    private val initialDateGrouping = try {
        DateGroupingMode.valueOf(prefs.getString("date_grouping", DateGroupingMode.GROUPED.name) ?: DateGroupingMode.GROUPED.name)
    } catch (_: Exception) {
        DateGroupingMode.GROUPED
    }

    private val _uiState = MutableStateFlow(
        DriveUiState(
            viewMode = initialViewMode,
            sortOption = initialSortOption,
            dateGrouping = initialDateGrouping
        )
    )
    val uiState: StateFlow<DriveUiState> = _uiState.asStateFlow()

    private var searchDebounceJob: Job? = null

    init {
        checkAuth()
    }

    fun checkAuth() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingAuth = true, authError = null) }
            repository.getStatus().fold(
                onSuccess = { status ->
                    _uiState.update { it.copy(authStatus = status, isLoadingAuth = false) }
                    if (status.authenticated && status.driveConnected) {
                        loadFiles()
                    }
                },
                onFailure = { err ->
                    _uiState.update { it.copy(isLoadingAuth = false, authError = err.message ?: "Failed to check status") }
                }
            )
        }
    }

    fun login(username: String, pass: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingAuth = true, authError = null) }
            repository.login(username, pass).fold(
                onSuccess = {
                    checkAuth()
                },
                onFailure = { err ->
                    _uiState.update { it.copy(isLoadingAuth = false, authError = err.message ?: "Login failed") }
                }
            )
        }
    }

    fun logout() {
        viewModelScope.launch {
            repository.logout()
            _uiState.update {
                DriveUiState(authStatus = AuthStatus(configured = true, authenticated = false))
            }
        }
    }

    fun setFilter(newFilter: String) {
        _uiState.update { it.copy(filter = newFilter, currentFolderId = null) }
        loadFiles()
    }

    fun setSearchQuery(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
        searchDebounceJob?.cancel()
        searchDebounceJob = viewModelScope.launch {
            delay(400)
            loadFiles()
        }
    }

    fun setViewMode(mode: ViewMode) {
        prefs.edit().putString("view_mode", mode.name).apply()
        _uiState.update { it.copy(viewMode = mode) }
    }

    fun setSortOption(option: SortOption) {
        prefs.edit().putString("sort_option", option.name).apply()
        _uiState.update { it.copy(sortOption = option) }
    }

    fun setMediaTypeFilter(filter: MediaTypeFilter) {
        _uiState.update { it.copy(mediaTypeFilter = filter) }
    }

    fun setDateGrouping(mode: DateGroupingMode) {
        prefs.edit().putString("date_grouping", mode.name).apply()
        _uiState.update { it.copy(dateGrouping = mode) }
    }

    fun navigateToFolder(folderId: String?) {
        _uiState.update { it.copy(currentFolderId = folderId) }
        loadFiles()
    }

    fun loadFiles() {
        val state = _uiState.value
        viewModelScope.launch {
            _uiState.update { it.copy(isLoadingFiles = true, filesError = null) }
            repository.listFiles(
                filter = state.filter,
                search = state.searchQuery.ifBlank { null },
                folderId = state.currentFolderId
            ).fold(
                onSuccess = { res ->
                    _uiState.update {
                        it.copy(
                            files = res.files,
                            subfolders = res.subfolders,
                            breadcrumbs = res.breadcrumbs,
                            isLoadingFiles = false
                        )
                    }
                },
                onFailure = { err ->
                    _uiState.update {
                        it.copy(
                            files = emptyList(),
                            subfolders = emptyList(),
                            isLoadingFiles = false,
                            filesError = err.message ?: "Could not load files"
                        )
                    }
                }
            )
        }
    }

    fun createFolder(name: String) {
        val state = _uiState.value
        viewModelScope.launch {
            repository.createFolder(name, state.currentFolderId).fold(
                onSuccess = {
                    _uiState.update { it.copy(actionNotice = "Folder '$name' created") }
                    loadFiles()
                },
                onFailure = { err ->
                    _uiState.update { it.copy(filesError = err.message ?: "Failed to create folder") }
                }
            )
        }
    }

    fun markFolderSynced(folderId: String) {
        viewModelScope.launch {
            repository.markFolderSynced(folderId).fold(
                onSuccess = { res ->
                    _uiState.update { it.copy(actionNotice = "Folder marked as synced (${res.movedCount ?: 0} items moved)") }
                    loadFiles()
                },
                onFailure = { err ->
                    _uiState.update { it.copy(filesError = err.message ?: "Failed to sync folder") }
                }
            )
        }
    }

    fun markFileSynced(fileId: String) {
        viewModelScope.launch {
            repository.markFileSynced(fileId).fold(
                onSuccess = {
                    _uiState.update { curr ->
                        val updatedFiles = curr.files.map { f ->
                            if (f.id == fileId) f.copy(syncStatus = "synced") else f
                        }
                        curr.copy(files = updatedFiles, actionNotice = "File marked as synced")
                    }
                },
                onFailure = { err ->
                    _uiState.update { it.copy(filesError = err.message ?: "Failed to sync file") }
                }
            )
        }
    }

    fun uploadUris(uris: List<Uri>) {
        if (uris.isEmpty()) return
        val currentFolderId = _uiState.value.currentFolderId
        viewModelScope.launch {
            _uiState.update { it.copy(isUploading = true, uploadNotice = "Uploading ${uris.size} file(s)...") }
            val context = getApplication<Application>()
            var uploadedCount = 0

            for (uri in uris) {
                var fileName = "upload_${System.currentTimeMillis()}"
                val mimeType = context.contentResolver.getType(uri)

                context.contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                    val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (nameIndex != -1 && cursor.moveToFirst()) {
                        fileName = cursor.getString(nameIndex) ?: fileName
                    }
                }

                repository.uploadUri(uri, fileName, mimeType, currentFolderId).fold(
                    onSuccess = { uploadedCount++ },
                    onFailure = { /* continue next */ }
                )
            }

            _uiState.update {
                it.copy(
                    isUploading = false,
                    uploadNotice = "Uploaded $uploadedCount of ${uris.size} file(s)"
                )
            }
            loadFiles()
        }
    }

    fun selectFile(index: Int?) {
        _uiState.update { it.copy(selectedFileIndex = index) }
    }

    fun clearNotices() {
        _uiState.update { it.copy(actionNotice = null, uploadNotice = null) }
    }
}
