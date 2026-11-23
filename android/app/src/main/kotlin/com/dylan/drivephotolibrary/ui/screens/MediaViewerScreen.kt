package com.dylan.drivephotolibrary.ui.screens

import android.app.DownloadManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Environment
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.rememberTransformableState
import androidx.compose.foundation.gestures.transformable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Map
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import coil3.compose.SubcomposeAsyncImage
import com.dylan.drivephotolibrary.data.model.DriveFile
import com.dylan.drivephotolibrary.data.network.NetworkModule
import com.dylan.drivephotolibrary.ui.components.PillSize
import com.dylan.drivephotolibrary.ui.components.UploaderAvatarPill
import com.dylan.drivephotolibrary.ui.util.ExifFormatter
import com.dylan.drivephotolibrary.ui.util.Formatters
import kotlinx.coroutines.launch

@Composable
fun MediaViewerDialog(
    files: List<DriveFile>,
    initialIndex: Int,
    onClose: () -> Unit,
    onMarkSynced: (String) -> Unit
) {
    if (files.isEmpty() || initialIndex !in files.indices) return

    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var showExifSheet by remember { mutableStateOf(false) }
    val pagerState = rememberPagerState(
        initialPage = initialIndex,
        pageCount = { files.size }
    )
    val currentFile = files[pagerState.currentPage]

    Dialog(
        onDismissRequest = onClose,
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false
        )
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black)
        ) {
            // Horizontal Swipeable Pager across all media
            HorizontalPager(
                state = pagerState,
                modifier = Modifier.fillMaxSize()
            ) { page ->
                val file = files[page]
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = Alignment.Center
                ) {
                    if (file.isVideo) {
                        VideoPlayerItem(file = file)
                    } else {
                        PhotoViewerItem(file = file)
                    }
                }
            }

            // Top Bar Overlay
            Surface(
                color = Color(0x99000000),
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.TopCenter)
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .statusBarsPadding()
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    IconButton(onClick = onClose) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = "Close",
                            tint = Color.White
                        )
                    }
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .padding(start = 8.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            Text(
                                text = currentFile.name,
                                color = Color.White,
                                style = MaterialTheme.typography.titleMedium,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f, fill = false)
                            )
                            if (!currentFile.uploadedBy.isNullOrBlank()) {
                                UploaderAvatarPill(
                                    username = currentFile.uploadedBy,
                                    size = PillSize.SMALL,
                                    isGlass = true
                                )
                            }
                        }
                        val meta = listOfNotNull(
                            Formatters.formatBytes(currentFile.size).ifBlank { null },
                            Formatters.formatDate(currentFile.createdTime ?: currentFile.modifiedTime).ifBlank { null }
                        ).joinToString(" · ")
                        if (meta.isNotBlank()) {
                            Text(
                                text = meta,
                                color = Color(0xCCFFFFFF),
                                style = MaterialTheme.typography.bodySmall
                            )
                        }
                    }

                    // EXIF Info button
                    IconButton(onClick = { showExifSheet = true }) {
                        Icon(
                            imageVector = Icons.Default.Info,
                            contentDescription = "EXIF and location info",
                            tint = Color.White
                        )
                    }
                }
            }

            // Floating Bottom Control Bar (Google Drive / Lenso UI style)
            Surface(
                shape = RoundedCornerShape(24.dp),
                color = Color(0xCC1F2937),
                shadowElevation = 8.dp,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .navigationBarsPadding()
                    .padding(bottom = 16.dp)
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // Previous
                    IconButton(
                        onClick = {
                            if (pagerState.currentPage > 0) {
                                scope.launch { pagerState.animateScrollToPage(pagerState.currentPage - 1) }
                            }
                        },
                        enabled = pagerState.currentPage > 0
                    ) {
                        Icon(
                            Icons.Default.ChevronLeft,
                            contentDescription = "Previous",
                            tint = if (pagerState.currentPage > 0) Color.White else Color(0x44FFFFFF)
                        )
                    }

                    // Index counter
                    Text(
                        text = "${pagerState.currentPage + 1} / ${files.size}",
                        color = Color.White,
                        style = MaterialTheme.typography.labelLarge,
                        fontWeight = FontWeight.Medium
                    )

                    // Next
                    IconButton(
                        onClick = {
                            if (pagerState.currentPage < files.size - 1) {
                                scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) }
                            }
                        },
                        enabled = pagerState.currentPage < files.size - 1
                    ) {
                        Icon(
                            Icons.Default.ChevronRight,
                            contentDescription = "Next",
                            tint = if (pagerState.currentPage < files.size - 1) Color.White else Color(0x44FFFFFF)
                        )
                    }

                    // EXIF Action
                    IconButton(onClick = { showExifSheet = true }) {
                        Icon(
                            Icons.Default.Info,
                            contentDescription = "EXIF info & location",
                            tint = Color.White
                        )
                    }

                    // Download Action
                    IconButton(onClick = {
                        downloadMediaFile(context, currentFile)
                    }) {
                        Icon(
                            Icons.Default.Download,
                            contentDescription = "Download to device",
                            tint = Color.White
                        )
                    }

                    // Mark synced button if not synced
                    if (currentFile.syncStatus == "not-sync") {
                        IconButton(onClick = {
                            onMarkSynced(currentFile.id)
                        }) {
                            Icon(
                                Icons.Default.Check,
                                contentDescription = "Mark as synced",
                                tint = Color(0xFF34D399)
                            )
                        }
                    }
                }
            }

            if (showExifSheet) {
                ExifInfoBottomSheet(
                    file = currentFile,
                    onDismiss = { showExifSheet = false }
                )
            }
        }
    }
}

@Composable
private fun PhotoViewerItem(file: DriveFile) {
    val fullUrl = "${NetworkModule.BASE_URL}media/file?id=${file.id}"
    var scale by remember { mutableFloatStateOf(1f) }
    val transformState = rememberTransformableState { zoomChange, _, _ ->
        scale = (scale * zoomChange).coerceIn(1f, 5f)
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .transformable(state = transformState),
        contentAlignment = Alignment.Center
    ) {
        SubcomposeAsyncImage(
            model = fullUrl,
            contentDescription = file.name,
            contentScale = ContentScale.Fit,
            loading = {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator(color = Color.White)
                }
            },
            modifier = Modifier
                .fillMaxSize()
                .graphicsLayer(
                    scaleX = scale,
                    scaleY = scale
                )
        )
    }
}

@Composable
private fun VideoPlayerItem(file: DriveFile) {
    val context = LocalContext.current
    val videoUrl = "${NetworkModule.BASE_URL}media/file?id=${file.id}"

    val exoPlayer = remember(file.id) {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(videoUrl))
            prepare()
            playWhenReady = false
        }
    }

    DisposableEffect(file.id) {
        onDispose {
            exoPlayer.release()
        }
    }

    AndroidView(
        factory = { ctx ->
            PlayerView(ctx).apply {
                player = exoPlayer
                useController = true
                layoutParams = FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
            }
        },
        modifier = Modifier.fillMaxSize()
    )
}

private fun downloadMediaFile(context: Context, file: DriveFile) {
    try {
        val downloadUrl = "${NetworkModule.BASE_URL}media/file?id=${Uri.encode(file.id)}&download=1"
        val request = DownloadManager.Request(Uri.parse(downloadUrl)).apply {
            setTitle(file.name)
            setDescription("Downloading from Drive Photo Library")
            setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
            setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, file.name)
        }
        val manager = context.getSystemService(Context.DOWNLOAD_SERVICE) as DownloadManager
        manager.enqueue(request)
        Toast.makeText(context, "Download started for ${file.name}", Toast.LENGTH_SHORT).show()
    } catch (e: Exception) {
        Toast.makeText(context, "Download failed: ${e.message}", Toast.LENGTH_SHORT).show()
    }
}

@Composable
private fun ExifDetailRow(label: String, value: String) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            color = Color(0x99FFFFFF)
        )
        Text(
            text = value,
            style = MaterialTheme.typography.bodyMedium,
            fontWeight = FontWeight.Medium,
            color = Color.White
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ExifInfoBottomSheet(
    file: DriveFile,
    onDismiss: () -> Unit
) {
    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF1E293B),
        contentColor = Color.White,
        dragHandle = { BottomSheetDefaults.DragHandle(color = Color(0x66FFFFFF)) }
    ) {
        val exif = file.imageMediaMetadata
        val videoExif = file.videoMediaMetadata
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
        val duration = ExifFormatter.formatDuration(videoExif?.durationMillis)
        val coords = ExifFormatter.formatCoordinates(exif?.location?.latitude, exif?.location?.longitude)
        val altitude = ExifFormatter.formatAltitude(exif?.location?.altitude)
        val context = LocalContext.current

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 24.dp)
                .padding(bottom = 36.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Default.CameraAlt,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary,
                    modifier = Modifier.size(24.dp)
                )
                Text(
                    text = "Camera & EXIF Specs",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color.White
                )
            }

            if (!camera.isNullOrBlank()) {
                Column {
                    Text(
                        text = "CAMERA",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color(0x99FFFFFF)
                    )
                    Text(
                        text = camera,
                        style = MaterialTheme.typography.bodyLarge,
                        fontWeight = FontWeight.SemiBold,
                        color = Color.White
                    )
                    if (!lens.isNullOrBlank()) {
                        Text(
                            text = lens,
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0xCCFFFFFF)
                        )
                    }
                }
            }

            // Exposure Row (Shutter, Aperture, Focal, ISO)
            if (exposure != null || aperture != null || focalLength != null || iso != null) {
                Column {
                    Text(
                        text = "EXPOSURE",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color(0x99FFFFFF),
                        modifier = Modifier.padding(bottom = 6.dp)
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        listOfNotNull(
                            exposure?.let { "Shutter" to it },
                            aperture?.let { "Aperture" to it },
                            focalLength?.let { "Focal" to it },
                            iso?.let { "ISO" to it }
                        ).forEach { (label, value) ->
                            Surface(
                                shape = RoundedCornerShape(12.dp),
                                color = Color(0x22FFFFFF),
                                modifier = Modifier.weight(1f)
                            ) {
                                Column(
                                    modifier = Modifier.padding(vertical = 8.dp, horizontal = 4.dp),
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text(
                                        text = label,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Color(0x88FFFFFF)
                                    )
                                    Text(
                                        text = value,
                                        style = MaterialTheme.typography.bodyMedium,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                }
                            }
                        }
                    }
                }
            }

            // Image Details
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(Color(0x15FFFFFF), RoundedCornerShape(12.dp))
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                if (resolution != null) {
                    ExifDetailRow(label = "Resolution", value = resolution)
                }
                if (duration != null) {
                    ExifDetailRow(label = "Duration", value = duration)
                }
                ExifDetailRow(label = "File Size", value = Formatters.formatBytes(file.size))
                val date = exif?.time ?: file.createdTime ?: file.modifiedTime
                if (!date.isNullOrBlank()) {
                    ExifDetailRow(label = "Date Taken", value = Formatters.formatDate(date))
                }
            }

            // Location
            if (coords != null && exif?.location?.latitude != null && exif.location.longitude != null) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(Color(0x15FFFFFF), RoundedCornerShape(12.dp))
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.LocationOn,
                            contentDescription = null,
                            tint = MaterialTheme.colorScheme.primary,
                            modifier = Modifier.size(18.dp)
                        )
                        Text(
                            text = coords,
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.SemiBold,
                            color = Color.White
                        )
                    }
                    if (altitude != null) {
                        Text(
                            text = "Altitude: $altitude",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color(0x99FFFFFF),
                            modifier = Modifier.padding(start = 24.dp)
                        )
                    }
                    Button(
                        onClick = {
                            val uri = Uri.parse("geo:${exif.location.latitude},${exif.location.longitude}?q=${exif.location.latitude},${exif.location.longitude}(${Uri.encode(file.name)})")
                            val intent = Intent(Intent.ACTION_VIEW, uri)
                            context.startActivity(intent)
                        },
                        modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(
                            imageVector = Icons.Default.Map,
                            contentDescription = null,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("Open in Maps")
                    }
                }
            }

            if (camera.isNullOrBlank() && exposure == null && aperture == null && coords == null) {
                Text(
                    text = "No camera EXIF metadata recorded for this file.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color(0x99FFFFFF),
                    modifier = Modifier.padding(vertical = 12.dp)
                )
            }
        }
    }
}
