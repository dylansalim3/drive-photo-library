package com.dylan.drivephotolibrary.ui.components

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.Sort
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Checklist
import androidx.compose.material.icons.filled.FilterList
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dylan.drivephotolibrary.ui.viewmodel.DateGroupingMode
import com.dylan.drivephotolibrary.ui.viewmodel.MediaTypeFilter
import com.dylan.drivephotolibrary.ui.viewmodel.SortOption

@Composable
fun MediaSortFilterBar(
    syncFilter: String,
    onSyncFilterChange: (String) -> Unit,
    mediaTypeFilter: MediaTypeFilter,
    onMediaTypeFilterChange: (MediaTypeFilter) -> Unit,
    sortOption: SortOption,
    onSortOptionChange: (SortOption) -> Unit,
    dateGrouping: DateGroupingMode,
    onDateGroupingChange: (DateGroupingMode) -> Unit,
    isSelectMode: Boolean,
    onToggleSelectMode: () -> Unit,
    totalCount: Int,
    modifier: Modifier = Modifier,
    uploaderFilter: String? = null,
    onUploaderFilterChange: ((String?) -> Unit)? = null,
    uploaders: List<String> = emptyList()
) {
    var sortMenuExpanded by remember { mutableStateOf(false) }
    var syncMenuExpanded by remember { mutableStateOf(false) }
    var uploaderMenuExpanded by remember { mutableStateOf(false) }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Media Type & Uploader Filter Chips (Scrollable)
        Row(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier
                .weight(1f, fill = false)
                .horizontalScroll(rememberScrollState())
        ) {
            FilterChip(
                selected = mediaTypeFilter == MediaTypeFilter.ALL,
                onClick = { onMediaTypeFilterChange(MediaTypeFilter.ALL) },
                label = { Text("All ($totalCount)", fontSize = 12.sp) },
                colors = FilterChipDefaults.filterChipColors()
            )

            FilterChip(
                selected = mediaTypeFilter == MediaTypeFilter.PHOTOS,
                onClick = { onMediaTypeFilterChange(MediaTypeFilter.PHOTOS) },
                label = { Text("Photos", fontSize = 12.sp) },
                leadingIcon = {
                    Icon(
                        imageVector = Icons.Default.Image,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                }
            )

            FilterChip(
                selected = mediaTypeFilter == MediaTypeFilter.VIDEOS,
                onClick = { onMediaTypeFilterChange(MediaTypeFilter.VIDEOS) },
                label = { Text("Videos", fontSize = 12.sp) },
                leadingIcon = {
                    Icon(
                        imageVector = Icons.Default.Videocam,
                        contentDescription = null,
                        modifier = Modifier.size(16.dp)
                    )
                }
            )

            // Uploader Filter Chip
            if (uploaders.isNotEmpty() && onUploaderFilterChange != null) {
                Box {
                    FilterChip(
                        selected = !uploaderFilter.isNullOrBlank() && uploaderFilter != "all",
                        onClick = { uploaderMenuExpanded = true },
                        label = {
                            Text(
                                text = if (!uploaderFilter.isNullOrBlank() && uploaderFilter != "all") {
                                    "@$uploaderFilter"
                                } else {
                                    "Uploaders"
                                },
                                fontSize = 12.sp
                            )
                        },
                        leadingIcon = {
                            Icon(
                                imageVector = Icons.Default.Person,
                                contentDescription = null,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    )

                    DropdownMenu(
                        expanded = uploaderMenuExpanded,
                        onDismissRequest = { uploaderMenuExpanded = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("All uploaders") },
                            trailingIcon = if (uploaderFilter.isNullOrBlank() || uploaderFilter == "all") {
                                {
                                    Icon(
                                        imageVector = Icons.Default.Check,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.primary
                                    )
                                }
                            } else null,
                            onClick = {
                                onUploaderFilterChange("all")
                                uploaderMenuExpanded = false
                            }
                        )
                        uploaders.forEach { uploader ->
                            DropdownMenuItem(
                                text = { Text("@$uploader") },
                                trailingIcon = if (uploaderFilter == uploader) {
                                    {
                                        Icon(
                                            imageVector = Icons.Default.Check,
                                            contentDescription = null,
                                            tint = MaterialTheme.colorScheme.primary
                                        )
                                    }
                                } else null,
                                onClick = {
                                    onUploaderFilterChange(uploader)
                                    uploaderMenuExpanded = false
                                }
                            )
                        }
                    }
                }
            }
        }

        // Right side: Date Sorting + Sync Filter Dropdown + Grouping Toggle + Select Toggle
        Row(
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // 1. Sort Dropdown
            Box {
                IconButton(
                    onClick = { sortMenuExpanded = true },
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.Sort,
                        contentDescription = "Sort: ${sortOption.label}",
                        tint = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                }

                DropdownMenu(
                    expanded = sortMenuExpanded,
                    onDismissRequest = { sortMenuExpanded = false }
                ) {
                    SortOption.values().forEach { option ->
                        DropdownMenuItem(
                            text = {
                                Text(
                                    text = option.label,
                                    fontWeight = if (option == sortOption) FontWeight.Bold else FontWeight.Normal
                                )
                            },
                            trailingIcon = if (option == sortOption) {
                                {
                                    Icon(
                                        imageVector = Icons.Default.Check,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.primary
                                    )
                                }
                            } else null,
                            onClick = {
                                onSortOptionChange(option)
                                sortMenuExpanded = false
                            }
                        )
                    }
                }
            }

            // 2. Sync Filter Dropdown (small button right side of date sorting)
            Box {
                IconButton(
                    onClick = { syncMenuExpanded = true },
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.FilterList,
                        contentDescription = "Sync Filter: $syncFilter",
                        tint = if (syncFilter != "all") MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(20.dp)
                    )
                }

                DropdownMenu(
                    expanded = syncMenuExpanded,
                    onDismissRequest = { syncMenuExpanded = false }
                ) {
                    listOf(
                        "not-sync" to "Pending (Not-sync)",
                        "synced" to "Synced only",
                        "all" to "All files"
                    ).forEach { (key, label) ->
                        DropdownMenuItem(
                            text = {
                                Text(
                                    text = label,
                                    fontWeight = if (syncFilter == key) FontWeight.Bold else FontWeight.Normal
                                )
                            },
                            trailingIcon = if (syncFilter == key) {
                                {
                                    Icon(
                                        imageVector = Icons.Default.Check,
                                        contentDescription = null,
                                        tint = MaterialTheme.colorScheme.primary
                                    )
                                }
                            } else null,
                            onClick = {
                                onSyncFilterChange(key)
                                syncMenuExpanded = false
                            }
                        )
                    }
                }
            }

            // 3. Date Grouping Toggle (Grouped 📅 vs Continuous ▦)
            IconButton(
                onClick = {
                    val nextMode = if (dateGrouping == DateGroupingMode.GROUPED) {
                        DateGroupingMode.CONTINUOUS
                    } else {
                        DateGroupingMode.GROUPED
                    }
                    onDateGroupingChange(nextMode)
                },
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    imageVector = if (dateGrouping == DateGroupingMode.GROUPED) {
                        Icons.Default.CalendarMonth
                    } else {
                        Icons.Default.GridView
                    },
                    contentDescription = "Grouping: ${dateGrouping.label}",
                    tint = if (dateGrouping == DateGroupingMode.GROUPED) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    },
                    modifier = Modifier.size(20.dp)
                )
            }

            // 4. Select Mode Toggle
            IconButton(
                onClick = onToggleSelectMode,
                modifier = Modifier.size(36.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.Checklist,
                    contentDescription = "Toggle multi-selection mode",
                    tint = if (isSelectMode) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}
