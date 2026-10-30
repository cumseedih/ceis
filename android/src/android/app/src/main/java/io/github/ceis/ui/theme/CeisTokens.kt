package io.github.ceis.ui.theme

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

/**
 * ceis's design tokens: the single source of truth for colour, radii, spacing
 * and the primary button across Android, taken from design.md at the repository
 * root (the Apple Minimal system, 2026-10-23). Screens should reach for these
 * (or the Material theme, which carries the same colours) instead of hard-coded
 * hexes. design.md names SF Pro for type; the font is not licensed for the app,
 * so type stays on the platform system sans and only sizes, weights and line
 * heights are tokenized.
 *
 * Token names are stable across the 2026-10-23 system change: existing names
 * keep their meaning and carry the new values, new names are added where the
 * new system adds concepts. The old-to-new mapping is recorded in the Liquid
 * Glass build report (ceis-parity workspace, BUILD_REPORT_1.md).
 */
object CeisColors {
    /** Interface primary: buttons, links of first rank, the one tinted element. */
    val primary = Color(0xFF0071E3)

    /**
     * The action blue on dark backgrounds. The predecessor system used its
     * tertiary blue as the brighter action colour in the dark theme; the new
     * system keeps that rule with its secondary blue.
     */
    val primaryDark = Color(0xFF0066CC)

    /** Secondary blue: links and text buttons. */
    val link = Color(0xFF0066CC)

    /** Ink: headings, body text, the on-surface colour. */
    val text = Color(0xFF1D1D1F)

    /** Neutral: the dominant page background. */
    val page = Color(0xFFFFFFFF)

    /** Surface tone: section backgrounds and subtle separation. */
    val surface = Color(0xFFF5F5F7)

    val border = Color(0xFFE5E7EB)

    /** Pale fill behind text fields and icon tiles (the surface tone). */
    val inputFill = Color(0xFFF5F5F7)

    /** Muted text: secondary copy, captions, placeholders of second rank. */
    val muted = Color(0xFF6E6E73)

    /** Utility only: a finished step, a saved item. Never an accent. */
    val success = Color(0xFF1F9D55)

    val error = Color(0xFFD92D20)

    /** Pale tint of the primary (derived: primary at 10 percent over white). */
    val primaryContainer = Color(0xFFE6F1FC)

    /** Deep shade of the primary for text on [primaryContainer] (derived). */
    val onPrimaryContainer = Color(0xFF00468D)
}

/** Corner radii from design.md: 0 / 4 / 8 / 12 / 24 / full. r16 is a legacy
 * step the new scale drops; it stays so existing call sites keep compiling,
 * and new work should not reach for it. */
object CeisRadii {
    val r0: Shape = RoundedCornerShape(0.dp)
    val r4: Shape = RoundedCornerShape(4.dp)
    val r8: Shape = RoundedCornerShape(8.dp)
    val r12: Shape = RoundedCornerShape(12.dp)
    val r16: Shape = RoundedCornerShape(16.dp)
    val r24: Shape = RoundedCornerShape(24.dp)
    val full: Shape = CircleShape
}

/** Spacing rhythm from design.md: 8 / 16 / 24 / 60 / 70. */
object CeisSpacing {
    val xs: Dp = 8.dp
    val sm: Dp = 16.dp
    val md: Dp = 24.dp
    val lg: Dp = 60.dp
    val xl: Dp = 70.dp
}

/** Type ramp from design.md (system sans; SF Pro is named there but not
 * supplied or licensed, so only sizes, weights and line heights are carried). */
object CeisType {
    data class Step(val size: Int, val weight: FontWeight, val line: Int)
    val headlineDisplay = Step(56, FontWeight.Bold, 67)
    val headlineLarge = Step(47, FontWeight.SemiBold, 60)
    val headlineMedium = Step(40, FontWeight.SemiBold, 44)
    val headlineSmall = Step(33, FontWeight.SemiBold, 40)
    val bodyLarge = Step(28, FontWeight.Normal, 42)
    val bodyMedium = Step(17, FontWeight.Normal, 22)
    val bodySmall = Step(15, FontWeight.Normal, 22)
    val labelLarge = Step(17, FontWeight.Normal, 24)
    val labelMedium = Step(14, FontWeight.Normal, 20)
    val labelSmall = Step(12, FontWeight.Normal, 16)
    val caption = Step(12, FontWeight.Normal, 16)
    val nav = Step(12, FontWeight.Normal, 16)
    val button = Step(17, FontWeight.Normal, 24)
}

/**
 * The primary button: 44dp tall, full pill, primary fill with white text;
 * pale primary while it cannot be tapped. Padding follows design.md
 * (11 by 21); the fixed height centres the label, so only the horizontal
 * padding is applied here.
 */
@Composable
fun CeisButton(
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    busy: Boolean = false,
) {
    Button(
        onClick = onClick,
        enabled = enabled && !busy,
        shape = CeisRadii.full,
        colors = ButtonDefaults.buttonColors(
            containerColor = CeisColors.primary,
            disabledContainerColor = CeisColors.primary.copy(alpha = 0.35f),
            contentColor = Color.White,
            disabledContentColor = Color.White.copy(alpha = 0.8f),
        ),
        contentPadding = PaddingValues(horizontal = 21.dp, vertical = 0.dp),
        modifier = modifier.height(44.dp),
    ) {
        if (busy) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp),
                strokeWidth = 2.dp,
                color = Color.White,
            )
        } else {
            Text(
                text = label,
                fontSize = CeisType.button.size.sp,
                fontWeight = CeisType.button.weight,
            )
        }
    }
}

/**
 * Chat tokens from design.md's Chat section (the iMessage template). Values
 * marked template were read from Apple's iMessage Apps and Stickers file;
 * values marked visual match the template's visible standard treatment and
 * are swapped for file values when access allows.
 */
object CeisChat {
    /** Transcript side inset (template: rows at x16 in a 402pt frame). */
    val transcriptInset: Dp = 16.dp

    /** Bubble surface to bubble surface gap inside one group (template). */
    val groupGap: Dp = 4.dp

    /** How far the group-final tail extends below the bubble body (template). */
    val tailDrop: Dp = 6.dp

    /** Audio bubble height family (template: 76pt, 82 with the tail). */
    val audioBubbleHeight: Dp = 76.dp

    /** Bubble corner radius (template: 20.0; Figma corner smoothing 0.6
     * has no Compose equivalent, so the radius is matched and the tail
     * curve is drawn with quadratic beziers). */
    val bubbleRadius: Dp = 20.dp

    /** Widest a bubble may grow, as a fraction of the transcript row. */
    val maxBubbleFraction: Float = 0.7f

    /** Sent gradient, top (template: #4ebaff). */
    val sentGradientTop: Color = Color(0xFF4EBAFF)

    /** Sent gradient, bottom (template: #0088ff). */
    val sentGradientBottom: Color = Color(0xFF0088FF)

    /** Received bubble fill on light backgrounds (template: SOLID #787880
     * at 0.16 opacity). */
    val receivedFill: Color = Color(0xFF787880).copy(alpha = 0.16f)

    /** Received bubble fill on dark backgrounds (the same family, dark). */
    val receivedFillDark: Color = Color(0xFF26262A)
}

/** A circular outline icon button, as on the sign-in screen's top row: 44dp,
 * neutral white fill, one-pixel border (design.md's circular button). */
@Composable
fun CeisCircleIconButton(
    image: ImageVector,
    contentDescription: String?,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Surface(
        onClick = onClick,
        shape = CeisRadii.full,
        color = CeisColors.page,
        border = BorderStroke(1.dp, CeisColors.border),
        modifier = modifier.size(44.dp),
    ) {
        Box(contentAlignment = Alignment.Center) {
            Icon(image, contentDescription = contentDescription, tint = CeisColors.text)
        }
    }
}
