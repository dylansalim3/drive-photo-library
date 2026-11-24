package com.dylan.drivephotolibrary.ui.screens

import android.app.Activity
import android.app.DownloadManager
import android.content.Context
import android.content.ContextWrapper
import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.media.AudioManager
import android.net.Uri
import android.os.Environment
import android.provider.Settings
import android.view.GestureDetector
import android.view.MotionEvent
import android.view.ViewGroup
import android.view.Window
import android.widget.FrameLayout
import android.widget.Toast
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.scaleIn
import androidx.compose.animation.scaleOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.BrightnessMedium
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.FastForward
import androidx.compose.material.icons.filled.FastRewind
import androidx.compose.material.icons.filled.Fullscreen
import androidx.compose.material.icons.filled.FullscreenExit
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.LocationOn
import androidx.compose.material.icons.filled.Map
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.VolumeMute
import androidx.compose.material.icons.filled.VolumeUp
import androidx.compose.material3.BottomSheetDefaults
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.DialogWindowProvider
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import coil3.compose.SubcomposeAsyncImage
import com.dylan.drivephotolibrary.data.model.DriveFile
import com.dylan.drivephotolibrary.data.network.NetworkModule
import com.dylan.drivephotolibrary.ui.components.PillSize
import com.dylan.drivephotolibrary.ui.components.UploaderAvatarPill
import com.dylan.drivephotolibrary.ui.util.DevicePosture
import com.dylan.drivephotolibrary.ui.util.ExifFormatter
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.roundToInt
import com.dylan.drivephotolibrary.ui.util.Formatters
import com.dylan.drivephotolibrary.ui.util.rememberDevicePosture
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

fun Context.findActivity(): Activity? {
    var ctx = this
    while (ctx is ContextWrapper) {
        if (ctx is Activity) return ctx
        ctx = ctx.baseContext
    }
    return null
}

fun setSystemBarsVisible(show: Boolean, activity: Activity?, dialogWindow: Window?) {
    val windows = listOfNotNull(dialogWindow, activity?.window).distinct()
    for (win in windows) {
        val controller = WindowCompat.getInsetsController(win, win.decorView)
        if (show) {
            controller.show(WindowInsetsCompat.Type.systemBars())
        } else {
            controller.systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            controller.hide(WindowInsetsCompat.Type.systemBars())
        }
    }
}

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
    val isCurrentVideo = currentFile.isVideo
    val devicePosture by rememberDevicePosture()

    val activity = remember(context) { context.findActivity() }
    val dialogWindow = (LocalView.current.parent as? DialogWindowProvider)?.window
    val configuration = LocalConfiguration.current
    val isLandscape = configuration.orientation == Configuration.ORIENTATION_LANDSCAPE

    var areControlsVisible by remember { mutableStateOf(true) }
    var isVideoPlaying by remember { mutableStateOf(false) }
    var userInteractionTrigger by remember { mutableLongStateOf(0L) }
    var playbackSpeed by remember { mutableFloatStateOf(1.0f) }
    var showSpeedMenu by remember { mutableStateOf(false) }

    fun toggleOrientation() {
        val act = activity ?: return
        if (isLandscape) {
            act.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        } else {
            act.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        }
    }

    // Auto-hide controls and system bars after 3 seconds of video playback
    LaunchedEffect(isVideoPlaying, areControlsVisible, userInteractionTrigger, isCurrentVideo) {
        if (isCurrentVideo && isVideoPlaying && areControlsVisible) {
            delay(3000)
            areControlsVisible = false
        }
    }

    // Sync system bars with current media type and control visibility
    LaunchedEffect(areControlsVisible, isCurrentVideo) {
        if (isCurrentVideo) {
            setSystemBarsVisible(areControlsVisible, activity, dialogWindow)
        } else {
            // Photos: always keep native status & navigation bars visible
            setSystemBarsVisible(true, activity, dialogWindow)
        }
    }

    // When swiping to a photo, immediately restore system bars and controls
    LaunchedEffect(pagerState.currentPage) {
        playbackSpeed = 1.0f
        showSpeedMenu = false
        val file = files.getOrNull(pagerState.currentPage)
        if (file?.isVideo != true) {
            areControlsVisible = true
            setSystemBarsVisible(true, activity, dialogWindow)
        } else {
            areControlsVisible = true
        }
    }

    // Restore orientation and system bars when leaving media viewer
    DisposableEffect(Unit) {
        onDispose {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            setSystemBarsVisible(true, activity, dialogWindow)
        }
    }

    Dialog(
        onDismissRequest = {
            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            setSystemBarsVisible(true, activity, dialogWindow)
            onClose()
        },
        properties = DialogProperties(
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false
        )
    ) {
        if (devicePosture is DevicePosture.Tabletop) {
            // Foldable Tabletop Mode: Upper Screen Cinema + Lower Screen Console
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black)
            ) {
                // Upper Screen: Hands-Free Media Viewport
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                ) {
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
                                VideoPlayerItem(
                                    file = file,
                                    areControlsVisible = true,
                                    playbackSpeed = playbackSpeed,
                                    onToggleControls = {},
                                    onIsPlayingChanged = {}
                                )
                            } else {
                                PhotoViewerItem(
                                    file = file,
                                    onToggleControls = {}
                                )
                            }
                        }
                    }

                    // Back button on upper screen
                    IconButton(
                        onClick = {
                            activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
                            setSystemBarsVisible(true, activity, dialogWindow)
                            onClose()
                        },
                        modifier = Modifier
                            .statusBarsPadding()
                            .padding(8.dp)
                            .align(Alignment.TopStart)
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = Color.Black.copy(alpha = 0.5f),
                            modifier = Modifier.size(36.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Icon(
                                    imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                                    contentDescription = "Close",
                                    tint = Color.White,
                                    modifier = Modifier.size(20.dp)
                                )
                            }
                        }
                    }
                }

                // Lower Screen: Interactive Tabletop Control Console
                Surface(
                    shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp),
                    color = MaterialTheme.colorScheme.surfaceContainerHigh,
                    modifier = Modifier
                        .fillMaxWidth()
                        .weight(1f)
                        .navigationBarsPadding()
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 16.dp, vertical = 12.dp),
                        verticalArrangement = Arrangement.SpaceBetween
                    ) {
                        // Title and Uploader
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = currentFile.name,
                                    style = MaterialTheme.typography.titleMedium,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = listOfNotNull(
                                        Formatters.formatBytes(currentFile.size).ifBlank { null },
                                        Formatters.formatDate(currentFile.createdTime ?: currentFile.modifiedTime).ifBlank { null }
                                    ).joinToString(" · "),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                            if (!currentFile.uploadedBy.isNullOrBlank()) {
                                UploaderAvatarPill(username = currentFile.uploadedBy, size = PillSize.SMALL)
                            }
                        }

                        // Interactive Horizontal Thumbnail Strip
                        Column {
                            Text(
                                text = "Album (${pagerState.currentPage + 1}/${files.size})",
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.SemiBold,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                                modifier = Modifier.padding(bottom = 6.dp)
                            )
                            LazyRow(
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                items(files.size) { idx ->
                                    val f = files[idx]
                                    val isSelected = idx == pagerState.currentPage
                                    Box(
                                        modifier = Modifier
                                            .size(56.dp)
                                            .clip(RoundedCornerShape(10.dp))
                                            .border(
                                                width = if (isSelected) 2.5.dp else 0.dp,
                                                color = if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent,
                                                shape = RoundedCornerShape(10.dp)
                                            )
                                            .clickable {
                                                scope.launch { pagerState.animateScrollToPage(idx) }
                                            }
                                    ) {
                                        SubcomposeAsyncImage(
                                            model = "${NetworkModule.BASE_URL}media/thumbnail?id=${f.id}",
                                            contentDescription = f.name,
                                            contentScale = ContentScale.Crop,
                                            modifier = Modifier.fillMaxSize()
                                        )
                                    }
                                }
                            }
                        }

                        // Compact EXIF Specs Row
                        val exif = currentFile.imageMediaMetadata
                        val cam = ExifFormatter.formatCamera(exif?.cameraMake, exif?.cameraModel)
                        val exp = ExifFormatter.formatExposureTime(exif?.exposureTime)
                        val apt = ExifFormatter.formatAperture(exif?.aperture)
                        val iso = ExifFormatter.formatIso(exif?.isoSpeed)
                        val specsSummary = listOfNotNull(cam?.ifBlank { null }, exp?.ifBlank { null }, apt?.ifBlank { null }, iso?.ifBlank { null }).joinToString(" · ")

                        if (specsSummary.isNotBlank()) {
                            Surface(
                                shape = RoundedCornerShape(10.dp),
                                color = MaterialTheme.colorScheme.surfaceContainerHighest,
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Row(
                                    modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(6.dp)
                                ) {
                                    Icon(Icons.Default.CameraAlt, contentDescription = null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(16.dp))
                                    Text(specsSummary, style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                }
                            }
                        }

                        // Playback & Action buttons
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                                IconButton(
                                    onClick = {
                                        if (pagerState.currentPage > 0) {
                                            scope.launch { pagerState.animateScrollToPage(pagerState.currentPage - 1) }
                                        }
                                    },
                                    enabled = pagerState.currentPage > 0
                                ) {
                                    Icon(Icons.Default.ChevronLeft, contentDescription = "Previous")
                                }
                                IconButton(
                                    onClick = {
                                        if (pagerState.currentPage < files.size - 1) {
                                            scope.launch { pagerState.animateScrollToPage(pagerState.currentPage + 1) }
                                        }
                                    },
                                    enabled = pagerState.currentPage < files.size - 1
                                ) {
                                    Icon(Icons.Default.ChevronRight, contentDescription = "Next")
                                }
                            }

                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                IconButton(onClick = { showExifSheet = true }) {
                                    Icon(Icons.Default.Info, contentDescription = "EXIF Details")
                                }
                                IconButton(onClick = { downloadMediaFile(context, currentFile) }) {
                                    Icon(Icons.Default.Download, contentDescription = "Download")
                                }
                                if (currentFile.syncStatus == "not-sync") {
                                    FilledTonalButton(
                                        onClick = { onMarkSynced(currentFile.id) },
                                        shape = RoundedCornerShape(10.dp)
                                    ) {
                                        Icon(Icons.Default.Check, contentDescription = null, modifier = Modifier.size(16.dp))
                                        Spacer(modifier = Modifier.width(4.dp))
                                        Text("Sync")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else {
            // Standard Single-Screen Lightbox View
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
                            VideoPlayerItem(
                                file = file,
                                areControlsVisible = areControlsVisible,
                                playbackSpeed = playbackSpeed,
                                onToggleControls = {
                                    areControlsVisible = !areControlsVisible
                                    userInteractionTrigger = System.currentTimeMillis()
                                },
                                onIsPlayingChanged = { isPlaying ->
                                    isVideoPlaying = isPlaying
                                    if (isPlaying) {
                                        userInteractionTrigger = System.currentTimeMillis()
                                    }
                                }
                            )
                        } else {
                            PhotoViewerItem(
                                file = file,
                                onToggleControls = {
                                    areControlsVisible = !areControlsVisible
                                }
                            )
                        }
                    }
                }

                // Top Bar Overlay
                AnimatedVisibility(
                    visible = areControlsVisible,
                    enter = fadeIn(tween(200)) + slideInVertically(initialOffsetY = { -it }),
                    exit = fadeOut(tween(200)) + slideOutVertically(targetOffsetY = { -it }),
                    modifier = Modifier.align(Alignment.TopCenter)
                ) {
                    Surface(
                        color = Color(0x99000000),
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .statusBarsPadding()
                                .padding(horizontal = 12.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            IconButton(onClick = {
                                activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
                                setSystemBarsVisible(true, activity, dialogWindow)
                                onClose()
                            }) {
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

                            // Playback speed selector for video
                            if (isCurrentVideo) {
                                Box {
                                    Surface(
                                        shape = RoundedCornerShape(12.dp),
                                        color = Color(0x33FFFFFF),
                                        modifier = Modifier
                                            .clickable { showSpeedMenu = true }
                                            .padding(horizontal = 4.dp)
                                    ) {
                                        Row(
                                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 6.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                                        ) {
                                            Icon(
                                                imageVector = Icons.Default.Speed,
                                                contentDescription = "Playback Speed",
                                                tint = Color.White,
                                                modifier = Modifier.size(16.dp)
                                            )
                                            Text(
                                                text = if (playbackSpeed == 1.0f) "1x" else "${playbackSpeed}x",
                                                color = Color.White,
                                                style = MaterialTheme.typography.labelMedium,
                                                fontWeight = FontWeight.Bold
                                            )
                                        }
                                    }

                                    DropdownMenu(
                                        expanded = showSpeedMenu,
                                        onDismissRequest = { showSpeedMenu = false }
                                    ) {
                                        val speeds = listOf(0.5f, 0.75f, 1.0f, 1.25f, 1.5f, 2.0f)
                                        speeds.forEach { spd ->
                                            DropdownMenuItem(
                                                text = {
                                                    Text(
                                                        text = if (spd == 1.0f) "1.0x (Normal)" else "${spd}x",
                                                        fontWeight = if (playbackSpeed == spd) FontWeight.Bold else FontWeight.Normal
                                                    )
                                                },
                                                onClick = {
                                                    playbackSpeed = spd
                                                    showSpeedMenu = false
                                                },
                                                leadingIcon = if (playbackSpeed == spd) {
                                                    { Icon(Icons.Default.Check, contentDescription = null) }
                                                } else null
                                            )
                                        }
                                    }
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
                }

                // Dedicated Orientation / Fullscreen Toggle button for video
                if (isCurrentVideo) {
                    AnimatedVisibility(
                        visible = areControlsVisible,
                        enter = fadeIn(tween(200)),
                        exit = fadeOut(tween(200)),
                        modifier = Modifier
                            .align(Alignment.BottomEnd)
                            .navigationBarsPadding()
                            .padding(end = 16.dp, bottom = 84.dp)
                    ) {
                        Surface(
                            shape = CircleShape,
                            color = Color(0xCC1F2937),
                            shadowElevation = 8.dp
                        ) {
                            IconButton(
                                onClick = { toggleOrientation() },
                                modifier = Modifier.size(44.dp)
                            ) {
                                Icon(
                                    imageVector = if (isLandscape) Icons.Default.FullscreenExit else Icons.Default.Fullscreen,
                                    contentDescription = if (isLandscape) "Exit Fullscreen" else "Fullscreen / Landscape",
                                    tint = Color.White
                                )
                            }
                        }
                    }
                }

                // Floating Bottom Control Bar (Google Drive / Lenso UI style)
                AnimatedVisibility(
                    visible = areControlsVisible,
                    enter = fadeIn(tween(200)) + slideInVertically(initialOffsetY = { it }),
                    exit = fadeOut(tween(200)) + slideOutVertically(targetOffsetY = { it }),
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .navigationBarsPadding()
                        .padding(bottom = 16.dp)
                ) {
                    Surface(
                        shape = RoundedCornerShape(24.dp),
                        color = Color(0xCC1F2937),
                        shadowElevation = 8.dp
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

@Composable
private fun PhotoViewerItem(
    file: DriveFile,
    onToggleControls: () -> Unit
) {
    val fullUrl = "${NetworkModule.BASE_URL}media/file?id=${file.id}"
    var scale by remember { mutableFloatStateOf(1f) }
    var offset by remember { mutableStateOf(Offset.Zero) }

    val transformState = rememberTransformableState { zoomChange, offsetChange, _ ->
        scale = (scale * zoomChange).coerceIn(1f, 5f)
        if (scale > 1f) {
            offset += offsetChange
        } else {
            offset = Offset.Zero
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                detectTapGestures(
                    onTap = {
                        onToggleControls()
                    },
                    onDoubleTap = {
                        if (scale > 1f) {
                            scale = 1f
                            offset = Offset.Zero
                        } else {
                            scale = 2.5f
                        }
                    }
                )
            }
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
                    scaleY = scale,
                    translationX = offset.x,
                    translationY = offset.y
                )
        )
    }
}

private enum class GestureFeedbackType {
    BRIGHTNESS,
    VOLUME
}

@Composable
private fun VideoPlayerItem(
    file: DriveFile,
    areControlsVisible: Boolean,
    playbackSpeed: Float,
    onToggleControls: () -> Unit,
    onIsPlayingChanged: (Boolean) -> Unit
) {
    val context = LocalContext.current
    val haptic = LocalHapticFeedback.current
    val activity = remember(context) { context.findActivity() }
    val audioManager = remember(context) {
        context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    }

    val videoUrl = "${NetworkModule.BASE_URL}media/file?id=${file.id}"

    val exoPlayer = remember(file.id) {
        ExoPlayer.Builder(context).build().apply {
            setMediaItem(MediaItem.fromUri(videoUrl))
            prepare()
            playWhenReady = false
        }
    }

    LaunchedEffect(playbackSpeed) {
        exoPlayer.setPlaybackSpeed(playbackSpeed)
    }

    DisposableEffect(file.id) {
        val listener = object : Player.Listener {
            override fun onIsPlayingChanged(isPlaying: Boolean) {
                onIsPlayingChanged(isPlaying)
            }
        }
        exoPlayer.addListener(listener)
        onDispose {
            exoPlayer.removeListener(listener)
            exoPlayer.release()
        }
    }

    var playerViewRef by remember { mutableStateOf<PlayerView?>(null) }

    LaunchedEffect(areControlsVisible, playerViewRef) {
        val pv = playerViewRef ?: return@LaunchedEffect
        if (areControlsVisible) {
            pv.showController()
        } else {
            pv.hideController()
        }
    }

    // Double-tap seek visual states
    var showRewindBadge by remember { mutableStateOf(false) }
    var showForwardBadge by remember { mutableStateOf(false) }

    LaunchedEffect(showRewindBadge) {
        if (showRewindBadge) {
            delay(650)
            showRewindBadge = false
        }
    }

    LaunchedEffect(showForwardBadge) {
        if (showForwardBadge) {
            delay(650)
            showForwardBadge = false
        }
    }

    // Gesture feedback states (brightness / volume)
    var gestureFeedbackType by remember { mutableStateOf<GestureFeedbackType?>(null) }
    var feedbackPercent by remember { mutableFloatStateOf(0.5f) }
    var hideFeedbackTrigger by remember { mutableLongStateOf(0L) }

    LaunchedEffect(hideFeedbackTrigger) {
        if (hideFeedbackTrigger > 0L) {
            delay(1200)
            gestureFeedbackType = null
        }
    }

    fun adjustBrightness(delta: Float) {
        val act = activity ?: return
        val lp = act.window.attributes
        val current = if (lp.screenBrightness in 0.0f..1.0f) {
            lp.screenBrightness
        } else {
            try {
                Settings.System.getInt(context.contentResolver, Settings.System.SCREEN_BRIGHTNESS) / 255.0f
            } catch (_: Exception) {
                0.5f
            }
        }
        val target = (current + delta).coerceIn(0.01f, 1.0f)
        lp.screenBrightness = target
        act.window.attributes = lp
        feedbackPercent = target
        gestureFeedbackType = GestureFeedbackType.BRIGHTNESS
    }

    fun adjustVolume(delta: Float) {
        val am = audioManager ?: return
        val maxVolume = am.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
        val currentVolume = am.getStreamVolume(AudioManager.STREAM_MUSIC)
        val currentFraction = currentVolume.toFloat() / maxVolume.coerceAtLeast(1)
        val targetFraction = (currentFraction + delta).coerceIn(0.0f, 1.0f)
        val targetVolume = (targetFraction * maxVolume).roundToInt().coerceIn(0, maxVolume)
        am.setStreamVolume(AudioManager.STREAM_MUSIC, targetVolume, 0)
        feedbackPercent = targetFraction
        gestureFeedbackType = GestureFeedbackType.VOLUME
    }

    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    player = exoPlayer
                    useController = true
                    layoutParams = FrameLayout.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT
                    )
                    setControllerVisibilityListener(PlayerView.ControllerVisibilityListener { visibility ->
                        val isVisible = visibility == android.view.View.VISIBLE
                        if (isVisible != areControlsVisible) {
                            onToggleControls()
                        }
                    })

                    val detector = GestureDetector(ctx, object : GestureDetector.SimpleOnGestureListener() {
                        override fun onDoubleTap(e: MotionEvent): Boolean {
                            val w = width.coerceAtLeast(1)
                            if (e.x < w / 2) {
                                // Double tap left: Rewind 10s
                                val pos = exoPlayer.currentPosition
                                exoPlayer.seekTo(maxOf(0L, pos - 10_000L))
                                showRewindBadge = true
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            } else {
                                // Double tap right: Forward 10s
                                val pos = exoPlayer.currentPosition
                                val dur = exoPlayer.duration
                                exoPlayer.seekTo(minOf(dur, pos + 10_000L))
                                showForwardBadge = true
                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            }
                            return true
                        }

                        override fun onSingleTapConfirmed(e: MotionEvent): Boolean {
                            onToggleControls()
                            return true
                        }

                        override fun onScroll(
                            e1: MotionEvent?,
                            e2: MotionEvent,
                            distanceX: Float,
                            distanceY: Float
                        ): Boolean {
                            if (e1 == null) return false
                            val h = height.coerceAtLeast(1)
                            val w = width.coerceAtLeast(1)
                            // Avoid capturing touches near the bottom seekbar (bottom 70dp)
                            val density = ctx.resources.displayMetrics.density
                            if (e1.y > h - (70 * density)) return false

                            val isLeft = e1.x < w / 2
                            val delta = distanceY / (h * 0.75f)

                            if (isLeft) {
                                adjustBrightness(delta)
                            } else {
                                adjustVolume(delta)
                            }
                            return true
                        }
                    })

                    setOnTouchListener { _, event ->
                        val handled = detector.onTouchEvent(event)
                        if (event.action == MotionEvent.ACTION_UP || event.action == MotionEvent.ACTION_CANCEL) {
                            hideFeedbackTrigger = System.currentTimeMillis()
                        }
                        handled
                    }

                    playerViewRef = this
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        // Rewind Badge (Left Half)
        AnimatedVisibility(
            visible = showRewindBadge,
            enter = fadeIn(tween(150)) + scaleIn(tween(150), initialScale = 0.8f),
            exit = fadeOut(tween(200)),
            modifier = Modifier
                .align(Alignment.CenterStart)
                .padding(start = 48.dp)
        ) {
            Surface(
                shape = CircleShape,
                color = Color(0x99000000),
                modifier = Modifier.size(80.dp)
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.FastRewind,
                        contentDescription = "Rewind 10 seconds",
                        tint = Color.White,
                        modifier = Modifier.size(32.dp)
                    )
                    Text(
                        text = "10s",
                        color = Color.White,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // Fast Forward Badge (Right Half)
        AnimatedVisibility(
            visible = showForwardBadge,
            enter = fadeIn(tween(150)) + scaleIn(tween(150), initialScale = 0.8f),
            exit = fadeOut(tween(200)),
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .padding(end = 48.dp)
        ) {
            Surface(
                shape = CircleShape,
                color = Color(0x99000000),
                modifier = Modifier.size(80.dp)
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center
                ) {
                    Icon(
                        imageVector = Icons.Default.FastForward,
                        contentDescription = "Forward 10 seconds",
                        tint = Color.White,
                        modifier = Modifier.size(32.dp)
                    )
                    Text(
                        text = "10s",
                        color = Color.White,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold
                    )
                }
            }
        }

        // Floating Volume / Brightness Level Pill (Center)
        AnimatedVisibility(
            visible = gestureFeedbackType != null,
            enter = fadeIn(tween(150)) + scaleIn(tween(150), initialScale = 0.9f),
            exit = fadeOut(tween(250)),
            modifier = Modifier.align(Alignment.Center)
        ) {
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = Color(0xCC1F2937),
                shadowElevation = 8.dp
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    val icon = when (gestureFeedbackType) {
                        GestureFeedbackType.BRIGHTNESS -> Icons.Default.BrightnessMedium
                        GestureFeedbackType.VOLUME -> if (feedbackPercent == 0f) Icons.Default.VolumeMute else Icons.Default.VolumeUp
                        null -> Icons.Default.BrightnessMedium
                    }
                    val label = when (gestureFeedbackType) {
                        GestureFeedbackType.BRIGHTNESS -> "Brightness"
                        GestureFeedbackType.VOLUME -> "Volume"
                        null -> ""
                    }
                    Icon(
                        imageVector = icon,
                        contentDescription = label,
                        tint = Color.White,
                        modifier = Modifier.size(24.dp)
                    )
                    Column(
                        modifier = Modifier.width(120.dp),
                        verticalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(
                                text = label,
                                color = Color.White,
                                style = MaterialTheme.typography.labelSmall
                            )
                            Text(
                                text = "${(feedbackPercent * 100).toInt()}%",
                                color = Color.White,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Bold
                            )
                        }
                        LinearProgressIndicator(
                            progress = { feedbackPercent },
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(4.dp)
                                .clip(RoundedCornerShape(2.dp)),
                            color = MaterialTheme.colorScheme.primary,
                            trackColor = Color(0x44FFFFFF)
                        )
                    }
                }
            }
        }
    }
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

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = Color(0xFF1E293B),
        contentColor = Color.White,
        dragHandle = { BottomSheetDefaults.DragHandle(color = Color(0x66FFFFFF)) }
    ) {
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
