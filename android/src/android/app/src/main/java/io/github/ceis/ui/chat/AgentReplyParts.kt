package io.github.ceis.ui.chat

import android.provider.Settings
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicText
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.ContentCopy
import androidx.compose.material.icons.filled.KeyboardArrowDown
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.openminis.app.R
import com.openminis.app.service.SessionActivityTracker
import com.openminis.app.ui.chat.AssistantBlock
import com.openminis.app.ui.chat.extractPartialJsonString
import com.openminis.app.ui.theme.ChatColors
import io.github.ceis.ui.theme.CeisMotion
import io.github.ceis.ui.theme.CeisReplyPalette

/** The pieces of the agent's turn that are not text (design.md, Agent reply). */

@Composable
internal fun ceisReplyPalette(): CeisReplyPalette = CeisReplyPalette.of(ChatColors.isDark)

/** False when the system animation scale is zero ("remove animations"). Read once per composition. */
@Composable
internal fun rememberAnimationsEnabled(): Boolean {
    val context = LocalContext.current
    return remember {
        Settings.Global.getFloat(context.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) > 0f
    }
}

/**
 * A ToolRow title. While [running] a lighter band sweeps across the text, one
 * brush animated in the text style, nothing per character. Still when the
 * system animation scale is zero.
 */
@Composable
internal fun ToolRowTitle(text: String, running: Boolean, modifier: Modifier = Modifier) {
    val palette = ceisReplyPalette()
    val animationsOn = rememberAnimationsEnabled()
    val animate = running && animationsOn
    var widthPx by remember { mutableIntStateOf(0) }
    val base = TextStyle(fontSize = 13.sp, fontWeight = FontWeight.Normal)
    val style = if (animate && widthPx > 0) {
        val transition = rememberInfiniteTransition(label = "toolRowShimmer")
        val progress by transition.animateFloat(
            initialValue = 0f,
            targetValue = 1f,
            animationSpec = infiniteRepeatable(tween(CeisMotion.ShimmerMillis, easing = LinearEasing)),
            label = "toolRowShimmerProgress",
        )
        val band = widthPx * 0.6f
        val x = -band + progress * (widthPx + band)
        base.copy(
            brush = Brush.horizontalGradient(
                colors = listOf(palette.toolText, palette.toolTextPeak, palette.toolText),
                startX = x,
                endX = x + band,
            ),
        )
    } else {
        base.copy(color = palette.toolText)
    }
    BasicText(
        text = text,
        style = style,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
        modifier = modifier.onSizeChanged { widthPx = it.width },
    )
}

/** "+12 -3" after a file edit. The sign is always printed, so colour is never the only cue. */
@Composable
internal fun DiffBadge(stat: DiffStat, modifier: Modifier = Modifier) {
    val palette = ceisReplyPalette()
    Row(modifier = modifier, verticalAlignment = Alignment.CenterVertically) {
        BasicText(
            text = "+${stat.added}",
            style = TextStyle(color = palette.diffAdd, fontSize = 12.sp, fontFamily = FontFamily.Monospace),
        )
        Spacer(Modifier.width(4.dp))
        BasicText(
            text = "-${stat.removed}",
            style = TextStyle(color = palette.diffRemove, fontSize = 12.sp, fontFamily = FontFamily.Monospace),
        )
    }
}

/** Lines written and replaced by a finished `file_edit` call; null for any other tool. */
internal fun fileEditDiffStat(block: AssistantBlock): DiffStat? {
    if (block.toolName != "file_edit") return null
    val args = runCatching { org.json.JSONObject(block.toolArgs) }.getOrNull()
    val oldText = args?.optString("old_string", "").orEmpty()
        .ifEmpty { extractPartialJsonString("old_string", block.toolArgs).orEmpty() }
    val newText = args?.optString("new_string", "").orEmpty()
        .ifEmpty { extractPartialJsonString("new_string", block.toolArgs).orEmpty() }
    return DiffStat.of(oldText, newText)
}

/** Copy and read aloud, under a reply that has stopped streaming. */
@Composable
internal fun ReplyActions(
    onCopy: () -> Unit,
    onReadAloud: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val palette = ceisReplyPalette()
    // The 44dp targets carry 13dp of air around an 18dp icon; pull the row
    // left so the first icon lines up with the reply text.
    Row(modifier = modifier.offset(x = (-13).dp).padding(top = 4.dp)) {
        ReplyActionButton(Icons.Default.ContentCopy, stringResource(R.string.nm_reply_copy), palette.toolText, onCopy)
        ReplyActionButton(Icons.AutoMirrored.Filled.VolumeUp, stringResource(R.string.nm_reply_read_aloud), palette.toolText, onReadAloud)
    }
}

@Composable
private fun ReplyActionButton(icon: ImageVector, description: String, tint: Color, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .size(44.dp)
            .clip(CircleShape)
            .clickable(onClickLabel = description, role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(icon, contentDescription = description, tint = tint, modifier = Modifier.size(18.dp))
    }
}

/** The scroll-to-bottom pill. [visible] comes from [ScrollPillPolicy]; it fades in and out. */
@Composable
internal fun ScrollPill(visible: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    val palette = ceisReplyPalette()
    AnimatedVisibility(
        visible = visible,
        modifier = modifier,
        enter = fadeIn(tween(CeisMotion.PillFadeMillis)),
        exit = fadeOut(tween(CeisMotion.PillFadeMillis)),
    ) {
        Surface(
            onClick = onClick,
            shape = CircleShape,
            color = palette.pillFill,
            shadowElevation = 4.dp,
            border = BorderStroke(0.5.dp, palette.outline.copy(alpha = 0.4f)),
            modifier = Modifier.size(40.dp),
        ) {
            Box(contentAlignment = Alignment.Center) {
                Icon(
                    Icons.Default.KeyboardArrowDown,
                    contentDescription = stringResource(R.string.nm_scroll_to_bottom),
                    tint = palette.toolTextPeak,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
    }
}

/**
 * A small ring beside the header's trailing button while any agent run is
 * active (the foreground service's own signal). Draws nothing when idle, and
 * holds still when the system animation scale is zero.
 */
@Composable
fun HeaderActivityRing(modifier: Modifier = Modifier) {
    val active by SessionActivityTracker.activeSessions.collectAsState()
    if (active.isEmpty()) return
    val palette = ceisReplyPalette()
    val animate = rememberAnimationsEnabled()
    val angle = if (animate) {
        val transition = rememberInfiniteTransition(label = "headerRing")
        val turn by transition.animateFloat(
            initialValue = 0f,
            targetValue = 360f,
            animationSpec = infiniteRepeatable(tween(CeisMotion.SpinnerMillis, easing = LinearEasing)),
            label = "headerRingAngle",
        )
        turn
    } else {
        0f
    }
    val description = stringResource(R.string.nm_header_working)
    Canvas(
        modifier = modifier
            .padding(end = 8.dp)
            .size(20.dp)
            .rotate(angle)
            .semantics { contentDescription = description },
    ) {
        val stroke = 2.dp.toPx()
        drawArc(
            color = palette.outline,
            startAngle = 0f,
            sweepAngle = 270f,
            useCenter = false,
            topLeft = Offset(stroke / 2f, stroke / 2f),
            size = Size(size.width - stroke, size.height - stroke),
            style = Stroke(width = stroke, cap = StrokeCap.Round),
        )
    }
}
