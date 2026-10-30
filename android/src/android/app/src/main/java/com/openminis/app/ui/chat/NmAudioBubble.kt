package com.openminis.app.ui.chat

import android.media.MediaPlayer
import android.net.Uri
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.ceis.ui.chat.nmBubbleShape
import io.github.ceis.ui.home.MuseTones
import io.github.ceis.ui.theme.CeisChat
import kotlin.random.Random
import kotlinx.coroutines.delay

/**
 * A Messages audio bubble, per the template (_Message - Audio): 280 wide,
 * 76 high (82 with the group tail), radius 20, play glyph 28, a 183x34
 * waveform of 2px bars on a 2px pitch with heights 4-34, and a 13px
 * duration label. Sent bubbles carry the blue gradient with white ink;
 * received bubbles carry the #787880 at 0.16 fill with the blue play
 * glyph and the #3c3c43 at 0.60 duration.
 *
 * The waveform bars are deterministic per file (seeded by file name):
 * the app has no decoded amplitude stream for attachments, so the bars
 * render a stable pattern and the played portion lights up as playback
 * advances. Tapping play streams the file with MediaPlayer; if the file
 * cannot be prepared, the tap falls back to the file preview.
 */
@Composable
internal fun NmAudioBubble(
    uri: Uri,
    fileName: String,
    sent: Boolean,
    showTail: Boolean,
    onPreviewFile: (Uri, String) -> Unit,
) {
    val context = LocalContext.current
    var prepared by remember(uri) { mutableStateOf(false) }
    var durationMs by remember(uri) { mutableStateOf(0) }
    var positionMs by remember(uri) { mutableStateOf(0) }
    var playing by remember(uri) { mutableStateOf(false) }
    var failed by remember(uri) { mutableStateOf(false) }

    val player = remember(uri) { MediaPlayer() }
    DisposableEffect(uri) {
        try {
            player.reset()
            player.setDataSource(context, uri)
            player.setOnPreparedListener {
                durationMs = player.duration
                prepared = true
            }
            player.setOnCompletionListener {
                playing = false
                positionMs = 0
            }
            player.setOnErrorListener { _, _, _ ->
                failed = true
                true
            }
            player.prepareAsync()
        } catch (_: Exception) {
            failed = true
        }
        onDispose {
            try {
                player.release()
            } catch (_: Exception) {
            }
        }
    }
    LaunchedEffect(playing) {
        while (playing) {
            positionMs = try {
                player.currentPosition
            } catch (_: Exception) {
                0
            }
            delay(250)
        }
    }

    // Template waveform: 183 wide, bars 2px on a 4px pitch (45 bars).
    val barCount = 183 / 4
    val barHeights = remember(fileName) {
        val rnd = Random(fileName.hashCode())
        List(barCount) { rnd.nextInt(4, 35) }
    }
    val playedFraction = if (durationMs > 0) {
        (positionMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f)
    } else {
        0f
    }
    val playedBars = (playedFraction * barCount).toInt()

    val shape = nmBubbleShape(sent = sent, tail = showTail)
    val bgModifier = if (sent) {
        Modifier.background(
            brush = Brush.verticalGradient(
                listOf(CeisChat.sentGradientTop, CeisChat.sentGradientBottom),
            ),
            shape = shape,
        )
    } else {
        Modifier.background(
            if (MuseTones.isDark) CeisChat.receivedFillDark else CeisChat.receivedFill,
        )
    }
    val glyphColor = if (sent) Color.White else Color(0xFF0088FF)
    val durationColor = if (sent) {
        Color.White
    } else {
        Color(0xFF3C3C43).copy(alpha = 0.60f)
    }
    val durationText = if (playing && durationMs > 0) {
        formatAudioMs(positionMs)
    } else if (durationMs > 0) {
        formatAudioMs(durationMs)
    } else {
        "--:--"
    }

    Box(
        modifier = Modifier
            .then(bgModifier)
            .clip(shape)
            .padding(bottom = if (showTail) CeisChat.tailDrop else 0.dp),
    ) {
        Row(
            modifier = Modifier
                .size(280.dp, 76.dp)
                .padding(horizontal = 12.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                imageVector = if (playing) Icons.Default.Pause else Icons.Default.PlayArrow,
                contentDescription = if (playing) "Pause" else "Play",
                tint = glyphColor,
                modifier = Modifier
                    .size(28.dp)
                    .clickable {
                        if (failed) {
                            onPreviewFile(uri, fileName)
                        } else if (!prepared) {
                            // Still preparing: ignore the tap.
                        } else if (playing) {
                            try {
                                player.pause()
                            } catch (_: Exception) {
                            }
                            playing = false
                        } else {
                            try {
                                player.start()
                                playing = true
                            } catch (_: Exception) {
                                failed = true
                            }
                        }
                    },
            )
            Spacer(modifier = Modifier.width(8.dp))
            Canvas(modifier = Modifier.size(183.dp, 34.dp)) {
                val barW = 2.dp.toPx()
                val pitch = 4.dp.toPx()
                val boxH = 34.dp.toPx()
                for (i in 0 until barCount) {
                    val h = barHeights[i].dp.toPx()
                    val color = if (i < playedBars) {
                        glyphColor
                    } else {
                        glyphColor.copy(alpha = 0.45f)
                    }
                    drawRect(
                        color = color,
                        topLeft = Offset(i * pitch, (boxH - h) / 2f),
                        size = Size(barW, h),
                    )
                }
            }
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = durationText,
                fontSize = 13.sp,
                color = durationColor,
                maxLines = 1,
            )
        }
    }
}

private fun formatAudioMs(ms: Int): String {
    val totalSeconds = ms / 1000
    return "%d:%02d".format(totalSeconds / 60, totalSeconds % 60)
}
