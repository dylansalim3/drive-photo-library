package com.dylan.drivephotolibrary.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dylan.drivephotolibrary.ui.viewmodel.MediaDateGroup
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.roundToInt

@Composable
fun AppleDateScrubber(
    groups: List<MediaDateGroup>,
    activeGroupIndex: Int,
    onScrubToGroup: (groupIndex: Int) -> Unit,
    modifier: Modifier = Modifier
) {
    if (groups.size <= 1) return

    val haptic = LocalHapticFeedback.current
    val coroutineScope = rememberCoroutineScope()
    val density = LocalDensity.current

    var isDragging by remember { mutableStateOf(false) }
    var isVisible by remember { mutableStateOf(false) }
    var lastHapticIndex by remember { mutableIntStateOf(activeGroupIndex) }
    var trackHeightPx by remember { mutableFloatStateOf(0f) }

    fun triggerAutoFade() {
        coroutineScope.launch {
            delay(1600)
            if (!isDragging) {
                isVisible = false
            }
        }
    }

    LaunchedEffect(activeGroupIndex) {
        if (!isDragging) {
            isVisible = true
            triggerAutoFade()
        }
    }

    val displayIndex = if (isDragging) lastHapticIndex else activeGroupIndex
    val clampedDisplayIndex = displayIndex.coerceIn(0, groups.size - 1)
    val currentGroup = groups[clampedDisplayIndex]

    val fraction = if (groups.size > 1) {
        clampedDisplayIndex.toFloat() / (groups.size - 1).toFloat()
    } else 0f

    Box(
        modifier = modifier
            .padding(end = 4.dp)
            .width(48.dp)
            .height(280.dp),
        contentAlignment = Alignment.CenterEnd
    ) {
        // Track Box (interactive drag area)
        Box(
            modifier = Modifier
                .width(28.dp)
                .fillMaxHeight()
                .onGloballyPositioned { coordinates ->
                    trackHeightPx = coordinates.size.height.toFloat()
                }
                .pointerInput(groups) {
                    detectTapGestures { offset ->
                        if (trackHeightPx > 0 && groups.isNotEmpty()) {
                            val f = (offset.y / trackHeightPx).coerceIn(0f, 1f)
                            val targetIndex = (f * groups.size).toInt().coerceIn(0, groups.size - 1)
                            haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                            lastHapticIndex = targetIndex
                            onScrubToGroup(targetIndex)
                            isVisible = true
                            triggerAutoFade()
                        }
                    }
                }
                .pointerInput(groups) {
                    detectVerticalDragGestures(
                        onDragStart = { offset ->
                            isDragging = true
                            isVisible = true
                            if (trackHeightPx > 0 && groups.isNotEmpty()) {
                                val f = (offset.y / trackHeightPx).coerceIn(0f, 1f)
                                val targetIndex = (f * groups.size).toInt().coerceIn(0, groups.size - 1)
                                if (targetIndex != lastHapticIndex) {
                                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    lastHapticIndex = targetIndex
                                }
                                onScrubToGroup(targetIndex)
                            }
                        },
                        onDragEnd = {
                            isDragging = false
                            triggerAutoFade()
                        },
                        onDragCancel = {
                            isDragging = false
                            triggerAutoFade()
                        },
                        onVerticalDrag = { change, _ ->
                            change.consume()
                            if (trackHeightPx > 0 && groups.isNotEmpty()) {
                                val f = (change.position.y / trackHeightPx).coerceIn(0f, 1f)
                                val targetIndex = (f * groups.size).toInt().coerceIn(0, groups.size - 1)
                                if (targetIndex != lastHapticIndex) {
                                    haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                    lastHapticIndex = targetIndex
                                }
                                onScrubToGroup(targetIndex)
                            }
                        }
                    )
                },
            contentAlignment = Alignment.Center
        ) {
            // Subtle vertical hairline pill track
            Box(
                modifier = Modifier
                    .width(3.dp)
                    .fillMaxHeight()
                    .clip(RoundedCornerShape(1.5.dp))
                    .background(MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            )

            // Scrubber thumb pill
            val thumbYOffsetPx = (trackHeightPx * fraction).roundToInt()
            Box(
                modifier = Modifier
                    .offset { IntOffset(0, thumbYOffsetPx - (with(density) { 12.dp.roundToPx() })) }
                    .width(8.dp)
                    .height(24.dp)
                    .shadow(4.dp, RoundedCornerShape(4.dp))
                    .clip(RoundedCornerShape(4.dp))
                    .background(MaterialTheme.colorScheme.primary)
            )
        }

        // Floating Apple Date Bubble (pops out to the left of the thumb)
        AnimatedVisibility(
            visible = isVisible || isDragging,
            enter = fadeIn(tween(150)),
            exit = fadeOut(tween(250)),
            modifier = Modifier.align(Alignment.CenterStart)
        ) {
            val thumbYOffsetPx = (trackHeightPx * fraction).roundToInt()
            Surface(
                shape = CircleShape,
                color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.95f),
                shadowElevation = 8.dp,
                modifier = Modifier
                    .offset { IntOffset(-12, thumbYOffsetPx - (with(density) { 140.dp.roundToPx() })) }
            ) {
                Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = currentGroup.dateLabel,
                        style = MaterialTheme.typography.labelMedium.copy(fontSize = 11.sp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                    Text(
                        text = " (${currentGroup.files.size})",
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                        color = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                        modifier = Modifier.padding(start = 2.dp)
                    )
                }
            }
        }
    }
}
