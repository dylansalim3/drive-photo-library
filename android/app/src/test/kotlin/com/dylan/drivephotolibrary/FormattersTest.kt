package com.dylan.drivephotolibrary

import com.dylan.drivephotolibrary.ui.util.Formatters
import org.junit.Assert.assertEquals
import org.junit.Test

class FormattersTest {

    @Test
    fun testFormatBytes() {
        assertEquals("500 B", Formatters.formatBytes("500"))
        assertEquals("1.5 KB", Formatters.formatBytes("1536"))
        assertEquals("2.0 MB", Formatters.formatBytes("2097152"))
        assertEquals("1.0 GB", Formatters.formatBytes("1073741824"))
        assertEquals("", Formatters.formatBytes(null))
        assertEquals("", Formatters.formatBytes("invalid"))
    }
}
