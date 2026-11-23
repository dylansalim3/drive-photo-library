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
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Sort
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilterChip
import androidx.compose.material3.FilterChipDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
    mediaTypeFilter: MediaTypeFilter,
    onMediaTypeFilterChange: (MediaTypeFilter) -> Unit,
    sortOption: SortOption,
    onSortOptionChange: (SortOption) -> Unit,
    dateGrouping: DateGroupingMode,
    onDateGroupingChange: (DateGroupingMode) -> Unit,
    totalCount: Int,
    modifier: Modifier = Modifier
) {
    var sortMenuExpanded by remember { mutableStateOf(false) }

    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Media Type Filter Chips (All, Photos, Videos)
        Row(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.weight(1f, fill = false).horizontalScroll(rememberScrollState())
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
        }

        // Right side: Sort Dropdown & Grouping Toggle
        Row(
            horizontalArrangement = Arrangement.spacedBy(4.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Sort Dropdown
            Box {
                IconButton(
                    onClick = { sortMenuExpanded = true },
                    modifier = Modifier.size(36.dp)
                ) {
                    Icon(
                        imageVector = Icons.Default.Sort,
                        contentDescription = "Sort media: ${sortOption.label}",
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

            // Date Grouping Toggle (Grouped 📅 vs Continuous ▦)
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
                    contentDescription = "Toggle grouping: currently ${dateGrouping.label}",
                    tint = if (dateGrouping == DateGroupingMode.GROUPED) {
                        MaterialTheme.colorScheme.primary
                    } else {
                        MaterialTheme.colorScheme.onSurfaceVariant
                    },
                    modifier = Modifier.size(20.dp)
                )
            }
        }
    }
}
