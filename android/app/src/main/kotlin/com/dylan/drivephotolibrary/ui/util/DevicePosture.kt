package com.dylan.drivephotolibrary.ui.util

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.graphics.Rect
import androidx.compose.runtime.Composable
import androidx.compose.runtime.State
import androidx.compose.runtime.produceState
import androidx.compose.ui.platform.LocalConfiguration
import androidx.compose.ui.platform.LocalContext
import androidx.window.layout.FoldingFeature
import androidx.window.layout.WindowInfoTracker
import androidx.window.layout.WindowLayoutInfo

/**
 * Represents the physical fold and window posture of the device.
 */
sealed interface DevicePosture {
    /** Standard single-screen phone or cover screen */
    object Normal : DevicePosture

    /** Half-folded with a horizontal hinge (sitting like a laptop on a table) */
    data class Tabletop(val hingeBounds: Rect) : DevicePosture

    /** Half-folded with a vertical hinge (held open like a book) */
    data class Book(val hingeBounds: Rect) : DevicePosture

    /** Flat unfolded large inner display (screenWidthDp >= 600dp or flat folding feature) */
    data class DualPaneExpanded(
        val isSeparating: Boolean,
        val hingeBounds: Rect? = null
    ) : DevicePosture
}

private fun Context.findActivity(): Activity? {
    var current = this
    while (current is ContextWrapper) {
        if (current is Activity) return current
        current = current.baseContext
    }
    return null
}

/**
 * Observes device fold features and window metrics to produce the active [DevicePosture].
 */
@Composable
fun rememberDevicePosture(): State<DevicePosture> {
    val context = LocalContext.current
    val configuration = LocalConfiguration.current
    val screenWidthDp = configuration.screenWidthDp

    return produceState<DevicePosture>(
        initialValue = if (screenWidthDp >= 600) DevicePosture.DualPaneExpanded(isSeparating = false) else DevicePosture.Normal,
        key1 = screenWidthDp,
        key2 = context
    ) {
        val activity = context.findActivity()
        if (activity == null) {
            value = if (screenWidthDp >= 600) DevicePosture.DualPaneExpanded(isSeparating = false) else DevicePosture.Normal
            return@produceState
        }

        try {
            WindowInfoTracker.getOrCreate(activity)
                .windowLayoutInfo(activity)
                .collect { layoutInfo: WindowLayoutInfo ->
                    val foldingFeature = layoutInfo.displayFeatures
                        .filterIsInstance<FoldingFeature>()
                        .firstOrNull()

                    value = when {
                        foldingFeature != null && foldingFeature.state == FoldingFeature.State.HALF_OPENED -> {
                            if (foldingFeature.orientation == FoldingFeature.Orientation.HORIZONTAL) {
                                DevicePosture.Tabletop(foldingFeature.bounds)
                            } else {
                                DevicePosture.Book(foldingFeature.bounds)
                            }
                        }
                        foldingFeature != null && (foldingFeature.state == FoldingFeature.State.FLAT || foldingFeature.isSeparating) -> {
                            DevicePosture.DualPaneExpanded(
                                isSeparating = foldingFeature.isSeparating,
                                hingeBounds = foldingFeature.bounds
                            )
                        }
                        screenWidthDp >= 600 -> {
                            DevicePosture.DualPaneExpanded(isSeparating = false)
                        }
                        else -> {
                            DevicePosture.Normal
                        }
                    }
                }
        } catch (_: Exception) {
            value = if (screenWidthDp >= 600) DevicePosture.DualPaneExpanded(isSeparating = false) else DevicePosture.Normal
        }
    }
}
