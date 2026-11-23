package com.dylan.drivephotolibrary.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlin.math.abs

enum class PillSize(
    val avatarSize: Dp,
    val avatarFontSize: TextUnit,
    val textFontSize: TextUnit,
    val horizontalPadding: Dp,
    val verticalPadding: Dp
) {
    XSMALL(avatarSize = 14.dp, avatarFontSize = 8.sp, textFontSize = 10.sp, horizontalPadding = 5.dp, verticalPadding = 2.dp),
    SMALL(avatarSize = 18.dp, avatarFontSize = 10.sp, textFontSize = 11.sp, horizontalPadding = 7.dp, verticalPadding = 3.dp),
    MEDIUM(avatarSize = 22.dp, avatarFontSize = 12.sp, textFontSize = 12.sp, horizontalPadding = 9.dp, verticalPadding = 4.dp)
}

private data class AvatarPalette(
    val bg: Color,
    val text: Color,
    val border: Color
)

private val AVATAR_PALETTES = listOf(
    AvatarPalette(Color(0x4010B981), Color(0xFF6EE7B7), Color(0x6634D399)), // Emerald
    AvatarPalette(Color(0x400EA5E9), Color(0xFF7DD3FC), Color(0x6638BDF8)), // Sky
    AvatarPalette(Color(0x408B5CF6), Color(0xFFC4B5FD), Color(0x66A78BFA)), // Violet
    AvatarPalette(Color(0x40F59E0B), Color(0xFFFDE68A), Color(0x66FBBF24)), // Amber
    AvatarPalette(Color(0x40F43F5E), Color(0xFFFECDD3), Color(0x66FB7185)), // Rose
    AvatarPalette(Color(0x4014B8A6), Color(0xFF99F6E4), Color(0x662DD4BF)), // Teal
    AvatarPalette(Color(0x406366F1), Color(0xFFC7D2FE), Color(0x66818CF8)), // Indigo
    AvatarPalette(Color(0x40D946EF), Color(0xFFF5D0FE), Color(0x66E879F9))  // Fuchsia
)

@Composable
fun UploaderAvatarPill(
    username: String?,
    modifier: Modifier = Modifier,
    size: PillSize = PillSize.SMALL,
    showLabel: Boolean = true,
    isGlass: Boolean = true
) {
    if (username.isNullOrBlank()) return

    val cleanName = username.trim()
    val palette = remember(cleanName) {
        val hash = abs(cleanName.lowercase().hashCode())
        AVATAR_PALETTES[hash % AVATAR_PALETTES.size]
    }
    val initial = remember(cleanName) {
        cleanName.first().uppercase()
    }

    Surface(
        modifier = modifier,
        shape = RoundedCornerShape(16.dp),
        color = if (isGlass) Color(0x99000000) else Color(0x22FFFFFF),
        border = androidx.compose.foundation.BorderStroke(
            0.5.dp,
            if (isGlass) Color(0x44FFFFFF) else Color(0x33FFFFFF)
        )
    ) {
        Row(
            modifier = Modifier.padding(horizontal = size.horizontalPadding, vertical = size.verticalPadding),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Circle avatar with user initial
            Box(
                modifier = Modifier
                    .size(size.avatarSize)
                    .clip(CircleShape)
                    .background(palette.bg)
                    .border(0.5.dp, palette.border, CircleShape),
                contentAlignment = Alignment.Center
            ) {
                Text(
                    text = initial,
                    color = palette.text,
                    fontSize = size.avatarFontSize,
                    fontWeight = FontWeight.Bold
                )
            }

            if (showLabel) {
                Text(
                    text = "@$cleanName",
                    color = Color.White,
                    fontSize = size.textFontSize,
                    fontWeight = FontWeight.Medium,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(start = 5.dp)
                )
            }
        }
    }
}
