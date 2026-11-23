package com.dylan.drivephotolibrary.ui.viewmodel

import android.app.Application
import android.net.Uri
import android.provider.OpenableColumns
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.dylan.drivephotolibrary.data.model.AuthStatus
import com.dylan.drivephotolibrary.data.model.Breadcrumb
import com.dylan.drivephotolibrary.data.model.DriveFile
import com.dylan.drivephotolibrary.data.model.DriveFolder
import com.dylan.drivephotolibrary.data.repository.DriveRepository
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
    val selectedFileIndex: Int? = null,
    val isUploading: Boolean = false,
    val uploadNotice: String? = null,
    val actionNotice: String? = null
)

class DriveViewModel(application: Application) : AndroidViewModel(application) {
    private val repository = DriveRepository(application)

    private val _uiState = MutableStateFlow(DriveUiState())
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
        _uiState.update { it.copy(viewMode = mode) }
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
