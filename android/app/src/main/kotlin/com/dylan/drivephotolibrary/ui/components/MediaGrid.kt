package com.dylan.drivephotolibrary.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import com.dylan.drivephotolibrary.data.model.DriveFile
import com.dylan.drivephotolibrary.data.network.NetworkModule
import com.dylan.drivephotolibrary.ui.util.Formatters
import com.dylan.drivephotolibrary.ui.viewmodel.DateGroupingMode
import com.dylan.drivephotolibrary.ui.viewmodel.groupFilesByDate

@Composable
fun MediaGrid(
    files: List<DriveFile>,
    onSelectFile: (DriveFile, Int) -> Unit,
    modifier: Modifier = Modifier,
    dateGrouping: DateGroupingMode = DateGroupingMode.GROUPED
) {
    if (files.isEmpty()) return

    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
        modifier = modifier.fillMaxSize()
    ) {
        if (dateGrouping == DateGroupingMode.GROUPED) {
            val groups = groupFilesByDate(files)
            groups.forEach { group ->
                item(
                    key = "header_${group.dateKey}",
                    span = { GridItemSpan(maxLineSpan) }
                ) {
                    DateGroupHeader(
                        dateLabel = group.dateLabel,
                        count = group.files.size
                    )
                }
                itemsIndexed(group.files, key = { _, file -> file.id }) { localIdx, file ->
                    MediaGridItem(
                        file = file,
                        onClick = { onSelectFile(file, group.startIndex + localIdx) }
                    )
                }
            }
        } else {
            itemsIndexed(files, key = { _, file -> file.id }) { index, file ->
                MediaGridItem(
                    file = file,
                    onClick = { onSelectFile(file, index) }
                )
            }
        }
    }
}

@Composable
fun DateGroupHeader(
    dateLabel: String,
    count: Int,
    modifier: Modifier = Modifier
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .padding(top = 10.dp, bottom = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = dateLabel,
            style = MaterialTheme.typography.titleSmall,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
        )
        Text(
            text = "$count ${if (count == 1) "item" else "items"}",
            style = MaterialTheme.typography.labelSmall,
            color = MaterialTheme.colorScheme.outline
        )
    }
}

@Composable
fun MediaGridItem(
    file: DriveFile,
    onClick: () -> Unit,
    modifier: Modifier = Modifier
) {
    val isNotSync = file.syncStatus == "not-sync"
    val thumbnailUrl = "${NetworkModule.BASE_URL}media/thumbnail?id=${file.id}"

    ElevatedCard(
        modifier = modifier
            .fillMaxWidth()
            .aspectRatio(1f)
            .clickable(onClick = onClick),
        shape = RoundedCornerShape(16.dp)
    ) {
        Box(modifier = Modifier.fillMaxSize()) {
            AsyncImage(
                model = thumbnailUrl,
                contentDescription = file.name,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize()
            )

            // Top-Left Floating Sync Badge (Lenso UI style)
            Surface(
                shape = RoundedCornerShape(12.dp),
                color = if (isNotSync) Color(0xCC78350F) else Color(0xCC064E3B),
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(8.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .clip(CircleShape)
                            .background(if (isNotSync) Color(0xFFFBBF24) else Color(0xFF34D399))
                    )
                    Text(
                        text = if (isNotSync) "Not-sync" else "Synced",
                        color = Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold
                    )
                }
            }

            // Top-Right Media Type Pill (Video badge)
            if (file.isVideo) {
                Surface(
                    shape = RoundedCornerShape(12.dp),
                    color = Color(0xCC000000),
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(3.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.PlayArrow,
                            contentDescription = "Video",
                            tint = Color.White,
                            modifier = Modifier.size(12.dp)
                        )
                        Text(
                            text = "Video",
                            color = Color.White,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold
                        )
                    }
                }
            }

            // Bottom Gradient Overlay with File Details
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .background(
                        Brush.verticalGradient(
                            colors = listOf(Color.Transparent, Color(0xDD000000)),
                            startY = 0f
                        )
                    )
                    .padding(horizontal = 8.dp, vertical = 8.dp)
            ) {
                Column {
                    Text(
                        text = file.name,
                        color = Color.White,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                    val meta = listOfNotNull(
                        Formatters.formatBytes(file.size).ifBlank { null },
                        Formatters.formatDate(file.createdTime ?: file.modifiedTime).ifBlank { null },
                        file.uploadedBy?.let { "@$it" }
                    ).joinToString(" • ")
                    Text(
                        text = meta,
                        color = Color(0xCCFFFFFF),
                        fontSize = 10.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}
