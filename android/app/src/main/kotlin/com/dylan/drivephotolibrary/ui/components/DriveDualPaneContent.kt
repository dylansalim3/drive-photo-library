package com.dylan.drivephotolibrary.ui.components

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.PlayCircle
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ElevatedCard
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.VerticalDivider
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.SubcomposeAsyncImage
import com.dylan.drivephotolibrary.data.model.DriveFile
import com.dylan.drivephotolibrary.data.model.DriveFolder
import com.dylan.drivephotolibrary.data.network.NetworkModule
import com.dylan.drivephotolibrary.ui.util.ExifFormatter
import com.dylan.drivephotolibrary.ui.util.Formatters
import com.dylan.drivephotolibrary.ui.viewmodel.DriveUiState
import com.dylan.drivephotolibrary.ui.viewmodel.ViewMode

@Composable
fun DriveDualPaneContent(
    uiState: DriveUiState,
    focusedFile: DriveFile?,
    onFocusFile: (DriveFile) -> Unit,
    onOpenFileLightbox: (Int) -> Unit,
    onNavigateFolder: (String) -> Unit,
    onMarkSynced: (String) -> Unit,
    onTrashFile: (String) -> Unit,
    onDownloadFile: (DriveFile) -> Unit,
    onToggleSelectFile: (String) -> Unit,
    onToggleSelectFolder: (String) -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current

    Row(modifier = modifier.fillMaxSize()) {
        // Left Master Pane: Gallery & Folders (45% width)
        Box(
            modifier = Modifier
                .weight(0.45f)
                .fillMaxHeight()
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                // Subfolders list if any
                if (uiState.subfolders.isNotEmpty()) {
                    Text(
                        text = "Folders (${uiState.subfolders.size})",
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Bold,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp)
                    )
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 4.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        for (folder in uiState.subfolders.take(4)) {
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = MaterialTheme.colorScheme.surfaceContainerHigh,
                                modifier = Modifier
                                    .clickable { onNavigateFolder(folder.id) }
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Text(
                                        text = folder.name,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Medium,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                }

                // Media Grid
                if (uiState.processedFiles.isEmpty()) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(24.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "No files found",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                } else {
                    MediaGrid(
                        files = uiState.processedFiles,
                        onSelectFile = { file, index ->
                            onFocusFile(file)
                        },
                        dateGrouping = uiState.dateGrouping,
                        isSelectMode = uiState.isSelectMode,
                        selectedFileIds = uiState.selectedFileIds,
                        onToggleSelectFile = { onToggleSelectFile(it.id) },
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }
        }

        // Hinge / Divider
        VerticalDivider(
            color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f),
            thickness = 1.dp
        )

        // Right Detail Pane: Live Preview & EXIF Inspector (55% width)
        Box(
            modifier = Modifier
                .weight(0.55f)
                .fillMaxHeight()
                .background(MaterialTheme.colorScheme.surfaceContainerLowest)
        ) {
            val file = focusedFile ?: uiState.processedFiles.firstOrNull()

            if (file == null) {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.5f),
                            modifier = Modifier.size(48.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "Select a photo or video to inspect",
                            style = MaterialTheme.typography.bodyLarge,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }
            } else {
                DualPaneDetailInspector(
                    file = file,
                    onOpenFullscreen = {
                        val idx = uiState.processedFiles.indexOf(file)
                        if (idx >= 0) onOpenFileLightbox(idx)
                    },
                    onMarkSynced = { onMarkSynced(file.id) },
                    onTrash = { onTrashFile(file.id) },
                    onDownload = { onDownloadFile(file) }
                )
            }
        }
    }
}

@Composable
fun DualPaneDetailInspector(
    file: DriveFile,
    onOpenFullscreen: () -> Unit,
    onMarkSynced: () -> Unit,
    onTrash: () -> Unit,
    onDownload: () -> Unit,
    modifier: Modifier = Modifier
) {
    val context = LocalContext.current
    val scrollState = rememberScrollState()
    val fullUrl = "${NetworkModule.BASE_URL}media/file?id=${file.id}"
    val exif = file.imageMediaMetadata
    val videoExif = file.videoMediaMetadata

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(scrollState)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        // Header Row: Title, Uploader, Fullscreen button
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = file.name,
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
                Text(
                    text = listOfNotNull(
                        Formatters.formatBytes(file.size).ifBlank { null },
                        Formatters.formatDate(file.createdTime ?: file.modifiedTime).ifBlank { null }
                    ).joinToString(" · "),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }

            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                if (!file.uploadedBy.isNullOrBlank()) {
                    UploaderAvatarPill(username = file.uploadedBy, size = PillSize.SMALL)
                }
                IconButton(onClick = onOpenFullscreen) {
                    Icon(
                        imageVector = Icons.Default.Fullscreen,
                        contentDescription = "Open Fullscreen Lightbox",
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }

        // Live Image / Video Thumbnail Card
        Surface(
            shape = RoundedCornerShape(20.dp),
            color = MaterialTheme.colorScheme.surfaceContainerHigh,
            shadowElevation = 4.dp,
            modifier = Modifier
                .fillMaxWidth()
                .height(300.dp)
                .clickable(onClick = onOpenFullscreen)
        ) {
            Box(contentAlignment = Alignment.Center) {
                SubcomposeAsyncImage(
                    model = fullUrl,
                    contentDescription = file.name,
                    contentScale = ContentScale.Fit,
                    loading = {
                        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(modifier = Modifier.size(36.dp))
                        }
                    },
                    modifier = Modifier.fillMaxSize()
                )

                if (file.isVideo) {
                    Box(
                        modifier = Modifier
                            .size(56.dp)
                            .clip(CircleShape)
                            .background(Color.Black.copy(alpha = 0.6f)),
                        contentAlignment = Alignment.Center
                    ) {
                        Icon(
                            imageVector = Icons.Default.PlayCircle,
                            contentDescription = "Play Video",
                            tint = Color.White,
                            modifier = Modifier.size(36.dp)
                        )
                    }
                }
            }
        }

        // Action Toolbar
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (file.syncStatus == "not-sync") {
                Button(
                    onClick = onMarkSynced,
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
                    modifier = Modifier.weight(1f)
                ) {
                    Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Mark Synced")
                }
            }

            OutlinedButton(
                onClick = onDownload,
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Default.Download, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Download")
            }

            FilledTonalButton(
                onClick = onTrash,
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.filledTonalButtonColors(containerColor = MaterialTheme.colorScheme.errorContainer),
                modifier = Modifier.weight(1f)
            ) {
                Icon(Icons.Default.Delete, contentDescription = null, tint = MaterialTheme.colorScheme.error, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text("Trash", color = MaterialTheme.colorScheme.error)
            }
        }

        // EXIF Technical Details Card
        ElevatedCard(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.elevatedCardColors(containerColor = MaterialTheme.colorScheme.surfaceContainer),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.CameraAlt, contentDescription = null, tint = MaterialTheme.colorScheme.primary)
                    Text("Camera & Technical Specs", style = MaterialTheme.typography.titleSmall, fontWeight = FontWeight.SemiBold)
                }

                val camera = ExifFormatter.formatCamera(exif?.cameraMake, exif?.cameraModel)
                val lens = exif?.lens?.trim()
                val exposure = ExifFormatter.formatExposureTime(exif?.exposureTime)
                val aperture = ExifFormatter.formatAperture(exif?.aperture)
                val focalLength = ExifFormatter.formatFocalLength(exif?.focalLength)
                val iso = ExifFormatter.formatIso(exif?.isoSpeed)
                val resolution = ExifFormatter.formatResolution(
                    exif?.width ?: videoExif?.width,
                    exif?.height ?: videoExif?.height
                )

                if (!camera.isNullOrBlank()) ExifDetailTextRow("Camera", camera)
                if (!lens.isNullOrBlank()) ExifDetailTextRow("Lens", lens)
                if (!exposure.isNullOrBlank()) ExifDetailTextRow("Exposure", exposure)
                if (!aperture.isNullOrBlank()) ExifDetailTextRow("Aperture", aperture)
                if (!focalLength.isNullOrBlank()) ExifDetailTextRow("Focal Length", focalLength)
                if (!iso.isNullOrBlank()) ExifDetailTextRow("ISO", iso)
                if (!resolution.isNullOrBlank()) ExifDetailTextRow("Resolution", resolution)

                // Location info
                val lat = exif?.location?.latitude
                val lng = exif?.location?.longitude
                if (lat != null && lng != null) {
                    Spacer(modifier = Modifier.height(4.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .background(MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.5f))
                            .clickable {
                                val uri = Uri.parse("geo:$lat,$lng?q=$lat,$lng(${Uri.encode(file.name)})")
                                context.startActivity(Intent(Intent.ACTION_VIEW, uri))
                            }
                            .padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Icon(Icons.Default.LocationOn, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(18.dp))
                        Text(
                            text = ExifFormatter.formatCoordinates(lat, lng) ?: "$lat, $lng",
                            style = MaterialTheme.typography.bodySmall,
                            fontWeight = FontWeight.Medium,
                            color = MaterialTheme.colorScheme.onPrimaryContainer
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ExifDetailTextRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(label, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)
    }
}
