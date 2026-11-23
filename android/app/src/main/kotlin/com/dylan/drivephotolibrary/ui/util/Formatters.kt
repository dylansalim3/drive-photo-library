package com.dylan.drivephotolibrary.ui.util

import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import java.util.TimeZone

object Formatters {
    fun formatBytes(bytes: Long): String {
        return formatBytes(bytes.toString())
    }

    fun formatBytes(bytesStr: String?): String {
        val bytes = bytesStr?.toLongOrNull() ?: return ""
        if (bytes < 1024) return "$bytes B"
        val kb = bytes / 1024.0
        if (kb < 1024) return String.format(Locale.US, "%.1f KB", kb)
        val mb = kb / 1024.0
        if (mb < 1024) return String.format(Locale.US, "%.1f MB", mb)
        val gb = mb / 1024.0
        return String.format(Locale.US, "%.1f GB", gb)
    }

    fun formatDate(dateStr: String?): String {
        if (dateStr.isNullOrBlank()) return ""
        return try {
            val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val date = parser.parse(dateStr.take(19)) ?: return dateStr.take(10)
            val formatter = SimpleDateFormat("MMM d, yyyy", Locale.getDefault())
            formatter.format(date)
        } catch (_: Exception) {
            dateStr.take(10)
        }
    }

    fun getDateGroupLabel(dateStr: String?): String {
        if (dateStr.isNullOrBlank()) return "Earlier"
        return try {
            val parser = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss", Locale.US).apply {
                timeZone = TimeZone.getTimeZone("UTC")
            }
            val date = parser.parse(dateStr.take(19)) ?: return dateStr.take(10)

            val now = Calendar.getInstance()
            val target = Calendar.getInstance().apply { time = date }

            val isSameDay = now.get(Calendar.YEAR) == target.get(Calendar.YEAR) &&
                    now.get(Calendar.DAY_OF_YEAR) == target.get(Calendar.DAY_OF_YEAR)
            if (isSameDay) return "Today"

            val yesterday = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, -1) }
            val isYesterday = yesterday.get(Calendar.YEAR) == target.get(Calendar.YEAR) &&
                    yesterday.get(Calendar.DAY_OF_YEAR) == target.get(Calendar.DAY_OF_YEAR)
            if (isYesterday) return "Yesterday"

            val isCurrentYear = now.get(Calendar.YEAR) == target.get(Calendar.YEAR)
            val pattern = if (isCurrentYear) "EEE, MMM d" else "EEE, MMM d, yyyy"
            SimpleDateFormat(pattern, Locale.getDefault()).format(date)
        } catch (_: Exception) {
            dateStr.take(10)
        }
    }
}
