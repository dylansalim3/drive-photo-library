package com.dylan.drivephotolibrary.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Logout
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.CloudDownload
import androidx.compose.material.icons.filled.FolderShared
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SystemUpdate
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.dylan.drivephotolibrary.data.update.UpdateStatus
import com.dylan.drivephotolibrary.ui.viewmodel.ViewMode

@Composable
fun DriveTopBar(
    searchQuery: String,
    onSearchQueryChange: (String) -> Unit,
    viewMode: ViewMode,
    onViewModeChange: (ViewMode) -> Unit,
    username: String?,
    role: String? = null,
    onLogout: () -> Unit,
    onOpenVacationSync: () -> Unit,
    onOpenUserManagement: () -> Unit = {},
    onOpenSharedDriveConfig: () -> Unit = {},
    onOpenSettings: () -> Unit = {},
    updateStatus: UpdateStatus = UpdateStatus.Idle,
    onCheckForUpdates: () -> Unit = {},
    modifier: Modifier = Modifier
) {
    var showMenu by remember { mutableStateOf(false) }

    Surface(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        shape = RoundedCornerShape(28.dp),
        color = MaterialTheme.colorScheme.surfaceContainerHigh,
        shadowElevation = 2.dp
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 12.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Icon(
                imageVector = Icons.Default.Search,
                contentDescription = "Search",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(start = 4.dp, end = 8.dp)
            )

            TextField(
                value = searchQuery,
                onValueChange = onSearchQueryChange,
                placeholder = {
                    Text(
                        "Search in Drive",
                        style = MaterialTheme.typography.bodyLarge,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                },
                singleLine = true,
                colors = TextFieldDefaults.colors(
                    focusedContainerColor = Color.Transparent,
                    unfocusedContainerColor = Color.Transparent,
                    focusedIndicatorColor = Color.Transparent,
                    unfocusedIndicatorColor = Color.Transparent
                ),
                modifier = Modifier.weight(1f)
            )

            if (searchQuery.isNotEmpty()) {
                IconButton(onClick = { onSearchQueryChange("") }) {
                    Icon(
                        imageVector = Icons.Default.Close,
                        contentDescription = "Clear search",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // View Mode Toggle Button (Grid -> List -> Map -> Grid)
            IconButton(onClick = {
                val nextMode = when (viewMode) {
                    ViewMode.GRID -> ViewMode.LIST
                    ViewMode.LIST -> ViewMode.MAP
                    ViewMode.MAP -> ViewMode.GRID
                }
                onViewModeChange(nextMode)
            }) {
                val (icon, desc) = when (viewMode) {
                    ViewMode.GRID -> Pair(Icons.AutoMirrored.Filled.ViewList, "Switch to list view")
                    ViewMode.LIST -> Pair(Icons.Default.Map, "Switch to travel map view")
                    ViewMode.MAP -> Pair(Icons.Default.GridView, "Switch to grid view")
                }
                Icon(
                    imageVector = icon,
                    contentDescription = desc,
                    tint = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            // Vacation Sync Center Quick Action Button
            IconButton(onClick = onOpenVacationSync) {
                Icon(
                    imageVector = Icons.Default.CloudDownload,
                    contentDescription = "Vacation Sync Center",
                    tint = MaterialTheme.colorScheme.primary
                )
            }

            // Profile Avatar with Dropdown
            Box {
                val initial = username?.firstOrNull()?.uppercaseChar()?.toString() ?: "D"
                Box(
                    modifier = Modifier
                        .size(32.dp)
                        .clip(CircleShape)
                        .background(MaterialTheme.colorScheme.primary)
                        .clickable { showMenu = true },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = initial,
                        color = MaterialTheme.colorScheme.onPrimary,
                        style = MaterialTheme.typography.titleSmall,
                        fontWeight = FontWeight.Bold
                    )
                }

                DropdownMenu(
                    expanded = showMenu,
                    onDismissRequest = { showMenu = false }
                ) {
                    DropdownMenuItem(
                        text = {
                            Column {
                                Text(
                                    text = "@${username ?: "user"}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = role?.replaceFirstChar { it.uppercase() } ?: "Editor",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = MaterialTheme.colorScheme.outline
                                )
                            }
                        },
                        onClick = { },
                        enabled = false
                    )
                    DropdownMenuItem(
                        text = { Text("Settings") },
                        leadingIcon = {
                            Icon(Icons.Default.Settings, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                        },
                        onClick = {
                            showMenu = false
                            onOpenSettings()
                        }
                    )
                    DropdownMenuItem(
                        text = { Text("Users & Security") },
                        leadingIcon = {
                            Icon(Icons.Default.Security, contentDescription = null)
                        },
                        onClick = {
                            showMenu = false
                            onOpenUserManagement()
                        }
                    )
                    DropdownMenuItem(
                        text = { Text("Shared Drive / Folder") },
                        leadingIcon = {
                            Icon(Icons.Default.FolderShared, contentDescription = null)
                        },
                        onClick = {
                            showMenu = false
                            onOpenSharedDriveConfig()
                        }
                    )
                    DropdownMenuItem(
                        text = { Text("Vacation Sync Center") },
                        leadingIcon = {
                            Icon(Icons.Default.CloudDownload, contentDescription = null)
                        },
                        onClick = {
                            showMenu = false
                            onOpenVacationSync()
                        }
                    )
                    DropdownMenuItem(
                        text = {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = when (updateStatus) {
                                        is UpdateStatus.ReadyToInstall -> "Install Update (Ready)"
                                        is UpdateStatus.Available -> "Update to v${updateStatus.info.latestVersion}"
                                        is UpdateStatus.Downloading -> "Downloading update..."
                                        else -> "Check for Updates"
                                    }
                                )
                                if (updateStatus is UpdateStatus.ReadyToInstall || updateStatus is UpdateStatus.Available) {
                                    Spacer(modifier = Modifier.width(6.dp))
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .clip(CircleShape)
                                            .background(Color(0xFF10B981))
                                    )
                                }
                            }
                        },
                        leadingIcon = {
                            Icon(
                                Icons.Default.SystemUpdate,
                                contentDescription = null,
                                tint = if (updateStatus is UpdateStatus.ReadyToInstall) Color(0xFF10B981) else MaterialTheme.colorScheme.onSurface
                            )
                        },
                        onClick = {
                            showMenu = false
                            onCheckForUpdates()
                        }
                    )
                    DropdownMenuItem(
                        text = { Text("Sign out") },
                        leadingIcon = {
                            Icon(Icons.AutoMirrored.Filled.Logout, contentDescription = null)
                        },
                        onClick = {
                            showMenu = false
                            onLogout()
                        }
                    )
                }
            }
        }
    }
}
