package com.dylan.drivephotolibrary.data.backup

import android.content.ContentResolver
import android.net.Uri
import java.security.MessageDigest

object HashUtils {
    /**
     * Computes the MD5 hex digest of a content Uri by streaming bytes in 8KB chunks.
     * Returns null if the Uri cannot be opened or an IO error occurs.
     */
    fun calculateMd5(contentResolver: ContentResolver, uri: Uri): String? {
        return try {
            val digest = MessageDigest.getInstance("MD5")
            contentResolver.openInputStream(uri)?.use { stream ->
                val buffer = ByteArray(8192)
                var bytesRead: Int
                while (stream.read(buffer).also { bytesRead = it } != -1) {
                    digest.update(buffer, 0, bytesRead)
                }
            } ?: return null
            digest.digest().joinToString("") { "%02x".format(it) }
        } catch (e: Exception) {
            null
        }
    }
}
