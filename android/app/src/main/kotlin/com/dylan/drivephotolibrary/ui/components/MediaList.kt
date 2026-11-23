package com.dylan.drivephotolibrary.ui.components

import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.SuggestionChipDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
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

@Composable
fun MediaList(
    files: List<DriveFile>,
    onSelectFile: (DriveFile, Int) -> Unit,
    onDownloadFile: (DriveFile) -> Unit,
    modifier: Modifier = Modifier,
    dateGrouping: DateGroupingMode = DateGroupingMode.GROUPED
) {
    if (files.isEmpty()) return

    LazyColumn(
        contentPadding = PaddingValues(vertical = 8.dp),
        modifier = modifier.fillMaxSize()
    ) {
        if (dateGrouping == DateGroupingMode.GROUPED) {
            val groups = groupFilesByDate(files)
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
                        onClick = { onSelectFile(file, group.startIndex + localIdx) },
                        onDownload = { onDownloadFile(file) }
                    )
                }
            }
        } else {
            itemsIndexed(files, key = { _, file -> file.id }) { index, file ->
                MediaListItem(
                    file = file,
                    onClick = { onSelectFile(file, index) },
                    onDownload = { onDownloadFile(file) }
                )
            }
        }
    }
}

@Composable
fun MediaListItem(
    file: DriveFile,
    onClick: () -> Unit,
    onDownload: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isNotSync = file.syncStatus == "not-sync"
    val thumbnailUrl = "${NetworkModule.BASE_URL}media/thumbnail?id=${file.id}"

    Row(
        modifier = modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
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
            Text(
                text = file.name,
                style = MaterialTheme.typography.bodyMedium,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
            )
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.padding(top = 2.dp)
            ) {
                val meta = listOfNotNull(
                    Formatters.formatBytes(file.size).ifBlank { null },
                    Formatters.formatDate(file.createdTime ?: file.modifiedTime).ifBlank { null },
                    file.uploadedBy?.let { "by @$it" }
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
            onClick = { /* info */ },
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
