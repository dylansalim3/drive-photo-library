package com.dylan.drivephotolibrary.ui.components

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.SuggestionChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import com.dylan.drivephotolibrary.data.model.DriveFile
import com.dylan.drivephotolibrary.data.network.NetworkModule
import com.dylan.drivephotolibrary.ui.util.Formatters
import com.dylan.drivephotolibrary.ui.viewmodel.DateGroupingMode
import com.dylan.drivephotolibrary.ui.viewmodel.groupFilesByDate
import kotlinx.coroutines.launch

@Composable
fun MediaList(
    files: List<DriveFile>,
    onSelectFile: (DriveFile, Int) -> Unit,
    onDownloadFile: (DriveFile) -> Unit,
    modifier: Modifier = Modifier,
    dateGrouping: DateGroupingMode = DateGroupingMode.GROUPED,
    isSelectMode: Boolean = false,
    selectedFileIds: Set<String> = emptySet(),
    onToggleSelectFile: (DriveFile) -> Unit = {}
) {
    if (files.isEmpty()) return

    val listState = rememberLazyListState()
    val coroutineScope = rememberCoroutineScope()
    val groups = remember(files) { groupFilesByDate(files) }

    val activeGroupIndex = remember(listState.firstVisibleItemIndex, groups) {
        if (groups.isEmpty()) 0
        else {
            var accum = 0
            var found = 0
            for (i in groups.indices) {
                val groupSize = 1 + groups[i].files.size
                if (listState.firstVisibleItemIndex >= accum) {
                    found = i
                }
                accum += groupSize
            }
            found
        }
    }

    Box(modifier = modifier.fillMaxSize()) {
        LazyColumn(
            state = listState,
            contentPadding = PaddingValues(top = 8.dp, bottom = 80.dp),
            modifier = Modifier.fillMaxSize()
        ) {
            if (dateGrouping == DateGroupingMode.GROUPED) {
                groups.forEach { group ->
                    item(key = "header_${group.dateKey}") {
                        DateGroupHeader(
                            dateLabel = group.dateLabel,
                            count = group.files.size,
                            modifier = Modifier.padding(horizontal = 16.dp)
                        )
                    }
                    itemsIndexed(group.files, key = { _, file -> file.id }) { localIdx, file ->
                        MediaListItem(
                            file = file,
                            isSelected = selectedFileIds.contains(file.id),
                            isSelectMode = isSelectMode,
                            onClick = { onSelectFile(file, group.startIndex + localIdx) },
                            onToggleSelect = { onToggleSelectFile(file) },
                            onDownload = { onDownloadFile(file) }
                        )
                    }
                }
            } else {
                itemsIndexed(files, key = { _, file -> file.id }) { index, file ->
                    MediaListItem(
                        file = file,
                        isSelected = selectedFileIds.contains(file.id),
                        isSelectMode = isSelectMode,
                        onClick = { onSelectFile(file, index) },
                        onToggleSelect = { onToggleSelectFile(file) },
                        onDownload = { onDownloadFile(file) }
                    )
                }
            }
        }

        // Apple Date Scrubber along right edge
        if (dateGrouping == DateGroupingMode.GROUPED && groups.size > 1) {
            AppleDateScrubber(
                groups = groups,
                activeGroupIndex = activeGroupIndex,
                onScrubToGroup = { targetGroupIdx ->
                    coroutineScope.launch {
                        var targetItemIndex = 0
                        for (i in 0 until targetGroupIdx.coerceIn(0, groups.size - 1)) {
                            targetItemIndex += 1 + groups[i].files.size
                        }
                        listState.scrollToItem(targetItemIndex)
                    }
                },
                modifier = Modifier.align(Alignment.CenterEnd)
            )
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun MediaListItem(
    file: DriveFile,
    isSelected: Boolean,
    isSelectMode: Boolean,
    onClick: () -> Unit,
    onToggleSelect: () -> Unit,
    onDownload: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isNotSync = file.syncStatus == "not-sync"
    val thumbnailUrl = "${NetworkModule.BASE_URL}media/thumbnail?id=${file.id}"

    Row(
        modifier = modifier
            .fillMaxWidth()
            .then(
                if (isSelected) {
                    Modifier.background(MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.25f))
                } else Modifier
            )
            .combinedClickable(
                onClick = {
                    if (isSelectMode) onToggleSelect() else onClick()
                },
                onLongClick = {
                    onToggleSelect()
                }
            )
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        if (isSelectMode) {
            Checkbox(
                checked = isSelected,
                onCheckedChange = { onToggleSelect() },
                modifier = Modifier.padding(end = 8.dp)
            )
        }

        // Thumbnail Preview with Media Icon
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(RoundedCornerShape(8.dp))
        ) {
            AsyncImage(
                model = thumbnailUrl,
                contentDescription = file.name,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )
            Icon(
                imageVector = if (file.isVideo) Icons.Default.PlayArrow else Icons.Default.Image,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(2.dp)
                    .size(14.dp)
            )
        }

        // File Metadata
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 12.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Text(
                    text = file.name,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false)
                )
                if (!file.uploadedBy.isNullOrBlank()) {
                    UploaderAvatarPill(
                        username = file.uploadedBy,
                        size = PillSize.XSMALL,
                        isGlass = false
                    )
                }
            }
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(top = 2.dp)
            ) {
                val meta = listOfNotNull(
                    Formatters.formatBytes(file.size).ifBlank { null },
                    Formatters.formatDate(file.createdTime ?: file.modifiedTime).ifBlank { null }
                ).joinToString(" • ")
                Text(
                    text = meta,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }

        // Sync Status Tag
        SuggestionChip(
            onClick = { },
            label = {
                Text(
                    text = if (isNotSync) "Not-sync" else "Synced",
                    style = MaterialTheme.typography.labelSmall
                )
            },
            colors = SuggestionChipDefaults.suggestionChipColors(
                containerColor = if (isNotSync) MaterialTheme.colorScheme.tertiaryContainer else MaterialTheme.colorScheme.secondaryContainer,
                labelColor = if (isNotSync) MaterialTheme.colorScheme.onTertiaryContainer else MaterialTheme.colorScheme.onSecondaryContainer
            )
        )

        // Download Action
        IconButton(onClick = onDownload) {
            Icon(
                imageVector = Icons.Default.Download,
                contentDescription = "Download ${file.name}",
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}
