package com.dylan.drivephotolibrary.ui.components

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Clear
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.FolderShared
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Link
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Search
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dylan.drivephotolibrary.data.model.AuthStatus
import com.dylan.drivephotolibrary.data.model.DriveConfigResponse
import kotlinx.coroutines.delay

fun extractFolderId(input: String): String {
    val trimmed = input.trim()
    val folderMatch = Regex("""/folders/([a-zA-Z0-9_-]+)""").find(trimmed)
    if (folderMatch != null) return folderMatch.groupValues[1]
    val driveMatch = Regex("""/drives/([a-zA-Z0-9_-]+)""").find(trimmed)
    if (driveMatch != null) return driveMatch.groupValues[1]
    val idParamMatch = Regex("""[?&]id=([a-zA-Z0-9_-]+)""").find(trimmed)
    if (idParamMatch != null) return idParamMatch.groupValues[1]
    return trimmed
}

fun looksLikeFolderIdOrUrl(input: String): Boolean {
    val trimmed = input.trim()
    if (trimmed.contains("drive.google.com") || trimmed.contains("/folders/") || trimmed.contains("/drives/")) {
        return true
    }
    // Drive IDs are typically 20-50 alphanumeric characters with underscores or hyphens, no spaces
    if (trimmed.length >= 20 && !trimmed.contains(" ") && trimmed.matches(Regex("""^[a-zA-Z0-9_-]+$"""))) {
        return true
    }
    return false
}

@OptIn(ExperimentalMaterial3Api::class, ExperimentalFoundationApi::class)
@Composable
fun SharedDriveConfigBottomSheet(
    authStatus: AuthStatus?,
    driveConfig: DriveConfigResponse?,
    isLoading: Boolean,
    onDismiss: () -> Unit,
    onSwitchFolder: (folderId: String) -> Unit,
    onResetDefault: () -> Unit,
    onRefresh: () -> Unit,
    onSearch: (query: String) -> Unit = {}
) {
    val context = LocalContext.current
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    val activeEmail = driveConfig?.googleEmail ?: authStatus?.googleEmail ?: "server-connected@gmail.com"
    val activeRootId = driveConfig?.rootFolderId ?: authStatus?.rootFolderId ?: ""
    val activeRootName = driveConfig?.rootFolderName ?: authStatus?.rootFolderName ?: "Default Photos & Videos"

    var copied by remember { mutableStateOf(false) }
    var showHowTo by remember { mutableStateOf(false) }
    var selectedTab by remember { mutableIntStateOf(0) }
    var searchFolderQuery by remember { mutableStateOf("") }

    val isDirectIdOrUrl = remember(searchFolderQuery) {
        looksLikeFolderIdOrUrl(searchFolderQuery)
    }
    val detectedFolderId = remember(searchFolderQuery) {
        if (isDirectIdOrUrl) extractFolderId(searchFolderQuery) else ""
    }

    LaunchedEffect(searchFolderQuery) {
        val trimmed = searchFolderQuery.trim()
        if (trimmed.isEmpty()) {
            onRefresh()
        } else if (!looksLikeFolderIdOrUrl(trimmed)) {
            delay(400)
            onSearch(trimmed)
        }
    }

    fun copyEmail() {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText("Google Account Email", activeEmail)
        clipboard.setPrimaryClip(clip)
        copied = true
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        sheetState = sheetState,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp),
        containerColor = MaterialTheme.colorScheme.surfaceContainerLow,
        modifier = Modifier.fillMaxHeight(0.92f)
    ) {
        val selfFolders = driveConfig?.selfFolders.orEmpty()
        val sharedFolders = driveConfig?.sharedFolders.orEmpty()
        val sharedDrives = driveConfig?.sharedDrives.orEmpty()
        val searchResults = driveConfig?.searchResults.orEmpty()

        LazyColumn(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            // 1. Header
            item(key = "header") {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Default.FolderShared,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(24.dp)
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Text(
                                text = "Shared Drive & Folders",
                                style = MaterialTheme.typography.titleLarge,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = "Approach A: External Google Drive routing",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.outline
                            )
                        }
                    }
                    IconButton(onClick = onDismiss) {
                        Icon(imageVector = Icons.Default.Close, contentDescription = "Close")
                    }
                }
            }

            // 2. Central Connected Server Email Card
            item(key = "connected_email") {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surfaceContainer,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Connected Server Account",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.outline
                            )
                            Text(
                                text = activeEmail,
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold
                            )
                            Text(
                                text = "Ask friends/family to share folders with this email as Editor",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary
                            )
                        }
                        IconButton(onClick = { copyEmail() }) {
                            Icon(
                                imageVector = if (copied) Icons.Default.Check else Icons.Default.ContentCopy,
                                contentDescription = "Copy email",
                                tint = if (copied) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    }
                }
            }

            // 3. Active Root Folder Card
            item(key = "active_root") {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = MaterialTheme.colorScheme.surfaceContainerHigh,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(14.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Current Active Root Folder",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.outline
                            )
                            Text(
                                text = activeRootName,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.Bold
                            )
                            Text(
                                text = activeRootId,
                                fontFamily = FontFamily.Monospace,
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.outline
                            )
                        }
                        TextButton(onClick = onResetDefault) {
                            Text("Reset", fontSize = 12.sp)
                        }
                    }
                }
            }

            // 4. Section Divider & Header
            item(key = "section_header") {
                Column(modifier = Modifier.fillMaxWidth().padding(top = 4.dp)) {
                    HorizontalDivider()
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = "Discovered Drives & Folders",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.SemiBold
                        )
                        IconButton(onClick = onRefresh) {
                            if (isLoading) {
                                CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
                            } else {
                                Icon(imageVector = Icons.Default.Refresh, contentDescription = "Refresh")
                            }
                        }
                    }
                }
            }

            // 5. STICKY HEADER: Unified Search & Connect Bar + Category Filter Chips
            stickyHeader(key = "sticky_search_and_filters") {
                Surface(
                    color = MaterialTheme.colorScheme.surfaceContainerLow,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                    ) {
                        // Unified Search & Connect Input
                        OutlinedTextField(
                            value = searchFolderQuery,
                            onValueChange = { searchFolderQuery = it },
                            placeholder = {
                                Text("Search folders or paste Drive link / ID...", fontSize = 13.sp)
                            },
                            leadingIcon = {
                                Icon(
                                    imageVector = if (isDirectIdOrUrl) Icons.Default.Link else Icons.Default.Search,
                                    contentDescription = null,
                                    tint = if (isDirectIdOrUrl) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                                    modifier = Modifier.size(18.dp)
                                )
                            },
                            trailingIcon = {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    if (isDirectIdOrUrl && detectedFolderId.isNotBlank()) {
                                        Button(
                                            onClick = {
                                                onSwitchFolder(detectedFolderId)
                                                searchFolderQuery = ""
                                            },
                                            modifier = Modifier
                                                .height(34.dp)
                                                .padding(end = 4.dp),
                                            enabled = !isLoading
                                        ) {
                                            Text("Connect", fontSize = 12.sp)
                                        }
                                    }
                                    if (searchFolderQuery.isNotEmpty()) {
                                        IconButton(onClick = { searchFolderQuery = "" }) {
                                            Icon(
                                                imageVector = Icons.Default.Clear,
                                                contentDescription = "Clear search",
                                                modifier = Modifier.size(18.dp)
                                            )
                                        }
                                    }
                                }
                            },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )

                        // Tab Filter Chips (shown when not actively searching or when direct ID not pasted)
                        if (searchFolderQuery.isBlank()) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(top = 6.dp, bottom = 4.dp),
                                horizontalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                FilterChip(
                                    selected = selectedTab == 0,
                                    onClick = { selectedTab = 0 },
                                    label = { Text("My Drive (${selfFolders.size})", fontSize = 12.sp) }
                                )
                                FilterChip(
                                    selected = selectedTab == 1,
                                    onClick = { selectedTab = 1 },
                                    label = { Text("Shared with Me (${sharedFolders.size})", fontSize = 12.sp) }
                                )
                                FilterChip(
                                    selected = selectedTab == 2,
                                    onClick = { selectedTab = 2 },
                                    label = { Text("Shared Drives (${sharedDrives.size})", fontSize = 12.sp) }
                                )
                            }
                        } else if (!isDirectIdOrUrl) {
                            Text(
                                text = "Search results for \"${searchFolderQuery.trim()}\":",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.outline,
                                modifier = Modifier.padding(top = 6.dp, bottom = 2.dp)
                            )
                        }
                    }
                }
            }

            // 6. Direct Folder Link/ID Detected Action Card
            if (isDirectIdOrUrl && detectedFolderId.isNotBlank()) {
                item(key = "direct_connect_banner") {
                    Surface(
                        shape = RoundedCornerShape(16.dp),
                        color = MaterialTheme.colorScheme.primaryContainer,
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 4.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(14.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(
                                modifier = Modifier.weight(1f),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    imageVector = Icons.Default.Link,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(22.dp)
                                )
                                Spacer(modifier = Modifier.width(10.dp))
                                Column {
                                    Text(
                                        text = "Direct Folder Link/ID Detected",
                                        style = MaterialTheme.typography.labelMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer
                                    )
                                    Text(
                                        text = detectedFolderId,
                                        fontFamily = FontFamily.Monospace,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onPrimaryContainer.copy(alpha = 0.8f)
                                    )
                                }
                            }
                            Button(
                                onClick = {
                                    onSwitchFolder(detectedFolderId)
                                    searchFolderQuery = ""
                                },
                                enabled = !isLoading
                            ) {
                                Text("Connect Now")
                            }
                        }
                    }
                }
            }

            // 7. Folder Items / Results (Rendered directly in LazyColumn for maximum scrolling height)
            if (searchFolderQuery.isNotBlank() && !isDirectIdOrUrl) {
                // Search Results
                if (searchResults.isEmpty()) {
                    item(key = "search_empty") {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surfaceContainer,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                        ) {
                            Text(
                                text = if (isLoading) "Searching Google Drive..." else "No folders found matching \"${searchFolderQuery.trim()}\".",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.outline,
                                modifier = Modifier.padding(14.dp)
                            )
                        }
                    }
                } else {
                    items(searchResults, key = { it.id }) { folder ->
                        FolderItemCard(
                            name = folder.name,
                            badgeText = if (folder.canEdit) "Editor" else "View Only",
                            badgeColor = if (folder.canEdit) Color(0xFF10B981) else Color(0xFFF59E0B),
                            subtitle = folder.sharedBy?.let { "Owner: $it" } ?: folder.id,
                            isCurrent = folder.id == activeRootId,
                            onSelect = { onSwitchFolder(folder.id) }
                        )
                    }
                }
            } else if (selectedTab == 0) {
                // Tab 0: My Drive Folders
                if (selfFolders.isEmpty()) {
                    item(key = "self_empty") {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surfaceContainer,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                        ) {
                            Text(
                                text = "No personal folders found in your Google Drive.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.outline,
                                modifier = Modifier.padding(14.dp)
                            )
                        }
                    }
                } else {
                    items(selfFolders, key = { it.id }) { folder ->
                        FolderItemCard(
                            name = folder.name,
                            badgeText = "Personal",
                            badgeColor = Color(0xFF10B981),
                            subtitle = folder.sharedBy ?: folder.id,
                            isCurrent = folder.id == activeRootId,
                            onSelect = { onSwitchFolder(folder.id) }
                        )
                    }
                }
            } else if (selectedTab == 1) {
                // Tab 1: Shared with Me Folders
                if (sharedFolders.isEmpty()) {
                    item(key = "shared_empty") {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surfaceContainer,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                        ) {
                            Text(
                                text = "No shared folders discovered yet. Ask friends or family to share a Google Drive folder with $activeEmail as Editor to see it appear here.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.outline,
                                modifier = Modifier.padding(14.dp)
                            )
                        }
                    }
                } else {
                    items(sharedFolders, key = { it.id }) { folder ->
                        FolderItemCard(
                            name = folder.name,
                            badgeText = if (folder.canEdit) "Editor" else "View Only",
                            badgeColor = if (folder.canEdit) Color(0xFF10B981) else Color(0xFFF59E0B),
                            subtitle = if (!folder.sharedBy.isNullOrBlank()) "Shared by ${folder.sharedBy}" else folder.id,
                            isCurrent = folder.id == activeRootId,
                            onSelect = { onSwitchFolder(folder.id) }
                        )
                    }
                }
            } else {
                // Tab 2: Shared Drives
                if (sharedDrives.isEmpty()) {
                    item(key = "drives_empty") {
                        Surface(
                            shape = RoundedCornerShape(12.dp),
                            color = MaterialTheme.colorScheme.surfaceContainer,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 4.dp)
                        ) {
                            Text(
                                text = "No Google Workspace Shared Drives discovered.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.outline,
                                modifier = Modifier.padding(14.dp)
                            )
                        }
                    }
                } else {
                    items(sharedDrives, key = { it.id }) { drive ->
                        FolderItemCard(
                            name = drive.name,
                            badgeText = "Shared Drive",
                            badgeColor = Color(0xFF3B82F6),
                            subtitle = drive.id,
                            isCurrent = drive.id == activeRootId,
                            onSelect = { onSwitchFolder(drive.id) }
                        )
                    }
                }
            }

            // 8. How to use Approach A toggle
            item(key = "how_to_guide") {
                Column(modifier = Modifier.fillMaxWidth().padding(top = 8.dp)) {
                    TextButton(
                        onClick = { showHowTo = !showHowTo },
                        modifier = Modifier.align(Alignment.Start)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = null,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            if (showHowTo) "Hide setup guide" else "How does Approach A work?",
                            fontSize = 12.sp
                        )
                    }

                    if (showHowTo) {
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 4.dp)
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp)
                            ) {
                                Text(
                                    text = "1. Your friend/family creates a Google Drive folder (e.g., 'Japan 2026') or a Shared Drive.",
                                    style = MaterialTheme.typography.bodySmall
                                )
                                Text(
                                    text = "2. They share it with Editor permissions to $activeEmail.",
                                    style = MaterialTheme.typography.bodySmall
                                )
                                Text(
                                    text = "3. Select the shared folder above, or paste its link into the search bar. Everyone in your group can now view, stream, and upload to that shared folder!",
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                        }
                    }
                }
            }

            // 9. Bottom Navigation Bar Padding
            item(key = "bottom_spacer") {
                Spacer(modifier = Modifier.height(48.dp))
            }
        }
    }
}

@Composable
private fun FolderItemCard(
    name: String,
    badgeText: String,
    badgeColor: Color,
    subtitle: String,
    isCurrent: Boolean,
    onSelect: () -> Unit
) {
    Surface(
        shape = RoundedCornerShape(14.dp),
        color = if (isCurrent) MaterialTheme.colorScheme.primaryContainer else MaterialTheme.colorScheme.surfaceContainer,
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 3.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 10.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = name,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = FontWeight.SemiBold
                    )
                    Spacer(modifier = Modifier.width(6.dp))
                    Surface(
                        shape = RoundedCornerShape(6.dp),
                        color = badgeColor.copy(alpha = 0.2f)
                    ) {
                        Text(
                            text = badgeText,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
                            color = badgeColor,
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                        )
                    }
                }
                Text(
                    text = subtitle,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.outline
                )
            }
            if (isCurrent) {
                Text(
                    text = "Active",
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onPrimaryContainer
                )
            } else {
                Button(
                    onClick = onSelect,
                    modifier = Modifier.height(34.dp)
                ) {
                    Text("Select", fontSize = 12.sp)
                }
            }
        }
    }
}
