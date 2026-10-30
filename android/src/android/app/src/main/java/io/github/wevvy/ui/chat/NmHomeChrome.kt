package io.github.wevvy.ui.chat

import android.content.SharedPreferences
import android.text.format.DateFormat
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.State
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.Density
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.openminis.app.R
import com.openminis.app.ui.settings.KEY_NM_HEADER_MODEL
import com.openminis.app.ui.settings.KEY_NM_SHOW_STEPS
import com.openminis.app.ui.settings.getAppearancePrefs
import com.openminis.app.ui.theme.ChatColors
import com.openminis.app.ui.settings.headerModelEnabled
import com.openminis.app.ui.settings.showStepsEnabled
import io.github.wevvy.ui.home.MuseTones
import io.github.wevvy.ui.theme.WevvyChat
import java.util.Calendar
import java.util.Date

/**
 * Passed to `ChatScreen` when it is hosted inside the home shell (`io.github.wevvy.ui.home`).
 * It swaps the back arrow for Muse's hamburger, the kebab for a round button, and — for the
 * main chat — grows the header into Muse's big-face layout; side chats get their title instead.
 * It also switches the conversation to Muse's dress: grey bubbles for the agent, the one-row
 * composer pill, no per-message name.
 */
data class NmHomeChrome(
    val isMainChat: Boolean,
    val onOpenDrawer: () -> Unit,
)

/**
 * Whether the header shows the model rows under the name (Settings → Appearance). Observed, so
 * flipping the switch and coming back to the home applies without a relaunch.
 */
@Composable
fun rememberHeaderModelShown(): State<Boolean> {
    val context = LocalContext.current
    val state = remember { mutableStateOf(headerModelEnabled(context)) }
    DisposableEffect(Unit) {
        val prefs = getAppearancePrefs(context)
        val listener = SharedPreferences.OnSharedPreferenceChangeListener { p, key ->
            if (key == KEY_NM_HEADER_MODEL) state.value = p.getBoolean(KEY_NM_HEADER_MODEL, false)
        }
        prefs.registerOnSharedPreferenceChangeListener(listener)
        onDispose { prefs.unregisterOnSharedPreferenceChangeListener(listener) }
    }
    return state
}

/**
 * Whether the chat shows the agent's steps — tool pills, reasoning, the bar over the composer
 * (Settings → Appearance → Conversation; on by default, a stored false wins). Observed like the switch above.
 */
@Composable
fun rememberShowSteps(): State<Boolean> {
    val context = LocalContext.current
    val state = remember { mutableStateOf(showStepsEnabled(context)) }
    DisposableEffect(Unit) {
        val prefs = getAppearancePrefs(context)
        val listener = SharedPreferences.OnSharedPreferenceChangeListener { p, key ->
            if (key == KEY_NM_SHOW_STEPS) state.value = p.getBoolean(KEY_NM_SHOW_STEPS, true)
        }
        prefs.registerOnSharedPreferenceChangeListener(listener)
        onDispose { prefs.unregisterOnSharedPreferenceChangeListener(listener) }
    }
    return state
}

/**
 * The received bubble around one assistant text block, in the iMessage
 * template's language (design.md, Chat): left aligned, light grey, at most
 * about 70 percent of the row, with the small tail on the last block of a
 * message. Headings, lists, code blocks, and tables render inside this
 * single bubble; only standalone `wevvy-*` protocol fences carry their own
 * card frame and are left bare.
 */
@Composable
fun NmAssistantBubble(
    enabled: Boolean,
    rawText: String,
    showTail: Boolean = false,
    content: @Composable () -> Unit,
) {
    val bare = !enabled || isBareBlock(rawText)
    if (bare) {
        content()
        return
    }
    // wevvy: 2dp top + 2dp bottom in the iMessage dress, so message rows
    // sit exactly 4dp apart (template transcript gap); the list itself
    BoxWithConstraints(modifier = Modifier.fillMaxWidth().padding(vertical = 2.dp), contentAlignment = Alignment.TopStart) {
        Box(
            modifier = Modifier
                // The template's cap: about 70 percent of the row, and
                // never wider than 600dp on a wide screen.
                .widthIn(max = minOf(maxWidth * WevvyChat.maxBubbleFraction, 600.dp))
                // The tail extends below the body (template: 6pt drop), so
                // the drop padding sits inside the shape: the background is
                // drawn WITH the bubble shape (a plain background followed
                // by clip draws an unclipped square — the flat-rectangle bug).
                .background(
                    if (MuseTones.isDark) WevvyChat.receivedFillDark else WevvyChat.receivedFill,
                    nmBubbleShape(sent = false, tail = showTail),
                )
                .padding(bottom = if (showTail) WevvyChat.tailDrop else 0.dp)
                .padding(horizontal = 12.dp, vertical = 9.dp),
        ) {
            content()
        }
    }
}

/**
 * A Messages bubble silhouette. Without a tail it is the plain large
 * radius; with one, the body sits [WevvyChat.tailDrop] above the node's
 * bottom edge and a small hook dips down at the outer corner (right for
 * sent, left for received). The radius family and the tail curve follow
 * the template _Bubble Mask box (17.0 wide, 17.9 tall, tip 7pt in
 * from the outer edge). The export carries no vector path data, so
 * the hook is a cubic curve at those proportions.
 */
internal fun nmBubbleShape(sent: Boolean, tail: Boolean): Shape =
    if (tail) NmBubbleShape(sent) else RoundedCornerShape(WevvyChat.bubbleRadius)

private class NmBubbleShape(private val sent: Boolean) : Shape {
    override fun createOutline(size: Size, layoutDirection: LayoutDirection, density: Density): Outline {
        val w = size.width
        val h = size.height
        val r = with(density) { WevvyChat.bubbleRadius.toPx() }
            .coerceAtMost(minOf(w, h) / 2f)
        val drop = with(density) { WevvyChat.tailDrop.toPx() }
        val body = h - drop
        // Drawn in the sent orientation (tail at the right), mirrored for
        // received by mapping each x through the width.
        fun x(v: Float): Float = if (sent) v else w - v
        val path = Path().apply {
            moveTo(x(r), 0f)
            lineTo(x(w - r), 0f)
            quadraticBezierTo(x(w), 0f, x(w), r)
            lineTo(x(w), body - 11.9f)
            // The tail: the outer edge bows out and down to the tip, then
            // the inner edge curves back up to the body's bottom edge.
            quadraticBezierTo(x(w), body + drop * 0.5f, x(w - 7f), h)
            quadraticBezierTo(x(w - 13f), body + drop * 0.2f, x(w - 17f), body)
            lineTo(x(r), body)
            quadraticBezierTo(x(0f), body, x(0f), body - r)
            lineTo(x(0f), r)
            quadraticBezierTo(x(0f), 0f, x(r), 0f)
            close()
        }
        return Outline.Generic(path)
    }
}

/**
 * The transcript's centred time divider, in the template's grey caption
 * style ("Today 9:41 AM", "Yesterday 8:22 AM", or a short date with the
 * time). Date and time formats come from the platform's locale formats;
 * the words for today and yesterday are string resources.
 */
@Composable
fun NmTimestampDivider(millis: Long) {
    val context = LocalContext.current
    val label = remember(millis) {
        val date = Date(millis)
        // wevvy: template time is fixed "9:41 AM" style (uppercase AM/PM),
        // not the device locale's format.
        val time = java.text.SimpleDateFormat("h:mm a", java.util.Locale.US).format(date)
        val cal = Calendar.getInstance().apply { timeInMillis = millis }
        val now = Calendar.getInstance()
        fun sameDay(a: Calendar, b: Calendar): Boolean =
            a.get(Calendar.YEAR) == b.get(Calendar.YEAR) &&
                a.get(Calendar.DAY_OF_YEAR) == b.get(Calendar.DAY_OF_YEAR)
        val yesterday = Calendar.getInstance().apply { add(Calendar.DAY_OF_YEAR, -1) }
        when {
            sameDay(cal, now) -> context.getString(R.string.nm_chat_timestamp_today, time)
            sameDay(cal, yesterday) -> context.getString(R.string.nm_chat_timestamp_yesterday, time)
            // wevvy: template never shows a full date — older days get
            // their weekday name ("Monday 9:41 AM").
            else -> "${DateFormat.format("EEEE", date)} $time"
        }
    }
    // wevvy: template timestamp is two runs — the day word Medium, the time
    // Regular — both 11sp #3c3c43 at 0.60. The label always ends with the
    // time, so split there; the text itself is unchanged. If the split
    // fails, the whole label stays Medium (the previous look).
    val nmTimestampTime = java.text.SimpleDateFormat("h:mm a", java.util.Locale.US).format(Date(millis))
    val nmTimestampHasSuffix = label.endsWith(nmTimestampTime)
    val nmTimestampHead = if (nmTimestampHasSuffix) label.removeSuffix(nmTimestampTime).trimEnd() else label
    val nmTimestampLabel = if (nmTimestampHasSuffix) {
        androidx.compose.ui.text.buildAnnotatedString {
            withStyle(androidx.compose.ui.text.SpanStyle(fontWeight = FontWeight.Medium)) { append(nmTimestampHead) }
            append(" ")
            withStyle(androidx.compose.ui.text.SpanStyle(fontWeight = FontWeight.Normal)) { append(nmTimestampTime) }
        }
    } else {
        androidx.compose.ui.text.AnnotatedString(label)
    }
    Text(
        text = nmTimestampLabel,
        color = if (MuseTones.isDark) ChatColors.secondaryText else Color(0xFF3C3C43).copy(alpha = 0.60f),
        fontSize = 11.sp,
        lineHeight = 22.sp,
        fontWeight = FontWeight.Medium,
        textAlign = TextAlign.Center,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 2.dp),
    )
}

internal fun isBareBlock(raw: String): Boolean {
    val t = raw.trim()
    if (!t.startsWith("```wevvy-")) return false
    val closeIdx = t.indexOf("\n```")
    return closeIdx < 0 || closeIdx + 4 == t.length
}
