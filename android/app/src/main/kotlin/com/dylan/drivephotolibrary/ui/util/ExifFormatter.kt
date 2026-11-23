package com.dylan.drivephotolibrary.ui.util

import java.util.Locale
import kotlin.math.abs
import kotlin.math.roundToInt

object ExifFormatter {
    fun formatExposureTime(seconds: Float?): String? {
        if (seconds == null || seconds <= 0f) return null
        return if (seconds < 1f) {
            val fraction = (1f / seconds).roundToInt()
            "1/${fraction}s"
        } else if (seconds >= 10f) {
            "${seconds.roundToInt()}s"
        } else {
            String.format(Locale.US, "%.1fs", seconds)
        }
    }

    fun formatAperture(aperture: Float?): String? {
        if (aperture == null || aperture <= 0f) return null
        val str = String.format(Locale.US, "%.1f", aperture)
        return "ƒ/${str.removeSuffix(".0")}"
    }

    fun formatFocalLength(focalLength: Float?): String? {
        if (focalLength == null || focalLength <= 0f) return null
        return "${focalLength.roundToInt()} mm"
    }

    fun formatIso(iso: Int?): String? {
        if (iso == null || iso <= 0) return null
        return "ISO $iso"
    }

    fun formatCamera(make: String?, model: String?): String? {
        val cleanMake = make?.trim()
        val cleanModel = model?.trim()
        if (cleanMake.isNullOrBlank() && cleanModel.isNullOrBlank()) return null
        if (cleanMake.isNullOrBlank()) return cleanModel
        if (cleanModel.isNullOrBlank()) return cleanMake

        return if (cleanModel.startsWith(cleanMake, ignoreCase = true)) {
            cleanModel
        } else {
            "$cleanMake $cleanModel"
        }
    }

    fun formatResolution(width: Int?, height: Int?): String? {
        if (width == null || height == null || width <= 0 || height <= 0) return null
        val mp = (width.toLong() * height.toLong()) / 1_000_000.0
        return String.format(Locale.US, "%d × %d (%.1f MP)", width, height, mp)
    }

    fun formatCoordinates(latitude: Double?, longitude: Double?): String? {
        if (latitude == null || longitude == null) return null
        val latDirection = if (latitude >= 0) "N" else "S"
        val lngDirection = if (longitude >= 0) "E" else "W"
        return String.format(
            Locale.US,
            "%.4f° %s, %.4f° %s",
            abs(latitude),
            latDirection,
            abs(longitude),
            lngDirection
        )
    }

    fun formatAltitude(altitude: Double?): String? {
        if (altitude == null) return null
        return "${altitude.roundToInt()} m"
    }

    fun formatDuration(durationMillis: String?): String? {
        val ms = durationMillis?.toLongOrNull() ?: return null
        if (ms <= 0) return null
        val totalSeconds = ms / 1000
        val hours = totalSeconds / 3600
        val minutes = (totalSeconds % 3600) / 60
        val seconds = totalSeconds % 60

        return if (hours > 0) {
            String.format(Locale.US, "%d:%02d:%02d", hours, minutes, seconds)
        } else {
            String.format(Locale.US, "%d:%02d", minutes, seconds)
        }
    }
}
