package io.github.wevvy.ui.chat

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.Menu
import androidx.compose.material.icons.filled.Videocam
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.openminis.app.ui.theme.ChatColors
import dev.chrisbanes.haze.HazeState
import io.github.wevvy.ui.avatar.AgentAvatar
import io.github.wevvy.ui.avatar.AgentMood

// wevvy: template chat header, Figma Top Toolbar - Chat, same to same:
// back pill (chevron + "2" badge: you + the agent) left, video pill right,
// centered 60dp face with the name pill hanging off its chin. No model
// rows, no status line, no "..." menu — model switching is the name pill
// tap, which opens the existing model picker sheet.
@Composable
fun NmTemplateChatHeader(
    title: String,
    mood: AgentMood,
    showBack: Boolean,
    onBackClick: () -> Unit,
    onToggleSidebar: (() -> Unit)?,
    onNameClick: () -> Unit,
    onAvatarClick: () -> Unit,
    onVideoClick: () -> Unit,
    hazeState: HazeState?,
) {
    val noFontPad = TextStyle(platformStyle = PlatformTextStyle(includeFontPadding = false))
    val dark = ChatColors.isDark
    val pillTint = if (dark) Color(0xFF2C2C2E) else Color.White
    val pillInk = if (dark) Color.White else Color(0xFF404040)
    val nameChevron = if (dark) ChatColors.secondaryText else Color(0xFF3C3C43).copy(alpha = 0.60f)
    val pillShape = RoundedCornerShape(22.dp)
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(96.dp)
            .background(ChatColors.background),
    ) {
        // wevvy: pill row at the top: back left, video right.
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(44.dp)
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (showBack) {
                // wevvy: back pill 67x44: chevron + "2" participant badge.
                Row(
                    modifier = Modifier
                        .height(44.dp)
                        .shadow(
                            elevation = 4.dp,
                            shape = pillShape,
                            clip = false,
                            ambientColor = Color.Black.copy(alpha = 0.06f),
                            spotColor = Color.Black.copy(alpha = 0.12f),
                        )
                        .clip(pillShape)
                        .background(pillTint, pillShape)
                        .clickable(onClick = onBackClick)
                        .padding(horizontal = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Icon(
                        Icons.AutoMirrored.Filled.KeyboardArrowLeft,
                        contentDescription = null,
                        tint = pillInk,
                        modifier = Modifier.size(20.dp),
                    )
                    Spacer(Modifier.width(4.dp))
                    Box(
                        modifier = Modifier
                            .size(22.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF1C1C1E)),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            "2",
                            color = Color.White,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            style = noFontPad,
                        )
                    }
                }
            } else if (onToggleSidebar != null) {
                // wevvy: two-pane only — the sidebar toggle keeps the slot
                // the back pill vacates (tablet split; phones always show back).
                Box(
                    modifier = Modifier
                        .size(44.dp)
                        .shadow(
                            elevation = 4.dp,
                            shape = CircleShape,
                            clip = false,
                            ambientColor = Color.Black.copy(alpha = 0.06f),
                            spotColor = Color.Black.copy(alpha = 0.12f),
                        )
                        .clip(CircleShape)
                        .background(pillTint, CircleShape)
                        .clickable(onClick = onToggleSidebar),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(
                        Icons.Filled.Menu,
                        contentDescription = null,
                        tint = pillInk,
                        modifier = Modifier.size(24.dp),
                    )
                }
            }
            Spacer(Modifier.weight(1f))
            // wevvy: video pill 44x44. Visual-only: the app has no video calling.
            Box(
                modifier = Modifier
                    .size(44.dp)
                    .shadow(
                        elevation = 4.dp,
                        shape = CircleShape,
                        clip = false,
                        ambientColor = Color.Black.copy(alpha = 0.06f),
                        spotColor = Color.Black.copy(alpha = 0.12f),
                    )
                    .clip(CircleShape)
                    .background(pillTint, CircleShape)
                    .clickable(onClick = onVideoClick),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Filled.Videocam,
                    contentDescription = null,
                    tint = pillInk,
                    modifier = Modifier.size(24.dp),
                )
            }
        }
        // wevvy: face 60 centered, top-aligned with the pill row.
        AgentAvatar(
            mood = mood,
            size = 60.dp,
            modifier = Modifier.align(Alignment.TopCenter),
            onClick = onAvatarClick,
        )
        // wevvy: name pill hanging off the chin: top 52 (face 0..60, overlap 8).
        Row(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(start = 16.dp, end = 16.dp, top = 52.dp)
                .clip(RoundedCornerShape(16.dp))
                .background(Color(0xFF787880).copy(alpha = 0.16f))
                .clickable(onClick = onNameClick)
                .padding(horizontal = 14.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                title,
                fontSize = 17.sp,
                lineHeight = 20.sp,
                fontWeight = FontWeight.Bold,
                color = ChatColors.primaryText,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                style = noFontPad,
            )
            Spacer(Modifier.width(4.dp))
            Icon(
                Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = nameChevron,
                modifier = Modifier.size(14.dp),
            )
        }
    }
}
