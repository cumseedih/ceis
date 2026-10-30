package io.github.ceis.ui.muse

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBarColors
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.material3.TopAppBarScrollBehavior
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.painter.Painter
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.PlatformTextStyle
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.material3.LocalContentColor
import androidx.compose.material3.LocalTextStyle
import io.github.ceis.ui.home.MuseTones

/**
 * Muse's page bar: the back glyph on a white disc at the start, the title centred, actions at
 * the end, no elevation or tint. A drop-in for Material's `TopAppBar` — same parameter names,
 * so an upstream screen switches bars by changing one call — which is why `colors`,
 * `scrollBehavior`, `windowInsets` and `expandedHeight` are accepted and not all used.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Suppress("UNUSED_PARAMETER")
@Composable
fun MuseTopAppBar(
    title: @Composable () -> Unit,
    modifier: Modifier = Modifier,
    navigationIcon: (@Composable () -> Unit)? = null,
    actions: @Composable RowScope.() -> Unit = {},
    /** Put the navigation glyph on Muse's white disc; off for a text action such as "Cancel". */
    disc: Boolean = true,
    // ceis: the title size, calibrated against the reference on a real phone
    // (17sp rendered too small next to the reference's 19px cap height). Screens
    // outside the Settings tree keep the 17sp default.
    titleSize: TextUnit = 17.sp,
    expandedHeight: Dp = 56.dp,
    windowInsets: WindowInsets = TopAppBarDefaults.windowInsets,
    colors: TopAppBarColors? = null,
    scrollBehavior: TopAppBarScrollBehavior? = null,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .windowInsetsPadding(windowInsets)
            .height(expandedHeight),
    ) {
        // The title first and centred on the whole bar, as Muse centres it on the screen, not
        // between the buttons.
        Box(
            modifier = Modifier
                .align(Alignment.Center)
                .padding(horizontal = 64.dp),
        ) {
            CompositionLocalProvider(
                LocalTextStyle provides TextStyle(
                    fontSize = titleSize,
                    lineHeight = (titleSize.value * 22f / 17f).sp,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface,
                    platformStyle = PlatformTextStyle(includeFontPadding = false),
                ),
                LocalContentColor provides MaterialTheme.colorScheme.onSurface,
            ) {
                Box(contentAlignment = Alignment.Center) { title() }
            }
        }
        if (navigationIcon != null) {
            Box(
                modifier = Modifier
                    .align(Alignment.CenterStart)
                    .padding(start = if (disc) 12.dp else 0.dp),
            ) {
                if (disc) MuseDisc { navigationIcon() } else navigationIcon()
            }
        }
        Row(
            modifier = Modifier
                .align(Alignment.CenterEnd)
                .padding(end = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            content = actions,
        )
    }
}

/**
 * The white disc Muse puts under a bar glyph. The slot is a Material `IconButton` on upstream
 * screens (48dp touch target); the disc clips its ripple to 40dp and stays tappable.
 */
@Composable
fun MuseDisc(modifier: Modifier = Modifier, content: @Composable () -> Unit) {
    Box(
        modifier = modifier
            .size(40.dp)
            .shadow(2.dp, CircleShape, clip = false, ambientColor = Color.Black.copy(alpha = 0.16f), spotColor = Color.Black.copy(alpha = 0.16f))
            .clip(CircleShape)
            .background(MuseTones.surface),
        contentAlignment = Alignment.Center,
    ) {
        CompositionLocalProvider(LocalContentColor provides MaterialTheme.colorScheme.onSurface) {
            content()
        }
    }
}

/** A white card of rows on Muse's grey canvas. */
@Composable
fun MuseCard(
    modifier: Modifier = Modifier,
    inset: Dp = 16.dp,
    radius: Dp = 16.dp,
    content: @Composable ColumnScope.() -> Unit,
) {
    Surface(
        color = MuseTones.surface,
        shape = RoundedCornerShape(radius),
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = inset),
    ) {
        Column(content = content)
    }
}

/**
 * Geometry of Muse's thin settings chevron. The defaults reproduce the original
 * 5x8dp tick; [SettingsChevronSpec] is the phone-calibrated geometry for the
 * Settings tree (the reference's 10x16px tick at the calibrated density).
 */
data class MuseChevronSpec(
    val tickWidth: Dp = 5.dp,
    val tickHeight: Dp = 8.dp,
    val boxWidth: Dp = 20.dp,
    val boxHeight: Dp = 20.dp,
    /** distance from the tick's right edge to the box's right edge */
    val tickEnd: Dp = 1.8.dp,
)

// ceis: calibrated on the user's phone (1.5 px/dp at the 720px screenshot
// scale): the reference's 10x16px tick is 7x11dp, its right edge 28dp inside
// the card edge (16dp row end padding + 12dp inside this box).
val SettingsChevronSpec = MuseChevronSpec(
    tickWidth = 7.dp,
    tickHeight = 11.dp,
    boxWidth = 28.dp,
    boxHeight = 20.dp,
    tickEnd = 12.dp,
)

/**
 * Muse's settings chevron: a thin outline tick in the reference grey, not the filled
 * Material arrow, whose weight does not match the reference's settings rows.
 */
@Composable
fun MuseChevron(spec: MuseChevronSpec = MuseChevronSpec()) {
    Canvas(Modifier.width(spec.boxWidth).height(spec.boxHeight)) {
        val right = size.width - spec.tickEnd.toPx()
        val left = right - spec.tickWidth.toPx()
        val top = (size.height - spec.tickHeight.toPx()) / 2f
        val bottom = top + spec.tickHeight.toPx()
        val midY = (top + bottom) / 2f
        val path = Path().apply {
            moveTo(left, top)
            lineTo(right, midY)
            lineTo(left, bottom)
        }
        drawPath(
            path,
            color = Color(0xFFC1C1C1),
            style = Stroke(width = 1.5.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round),
        )
    }
}

/** Muse's settings row: an outlined glyph, the label, a chevron. */
@Composable
fun MuseRow(
    title: String,
    onClick: () -> Unit,
    icon: ImageVector? = null,
    // ceis: raster icon path for the Settings screen's supplied icon set. When set, the
    // artwork draws untinted only where the old tint behaviour is not needed; the caller
    // passes the tint it wants. Defaults to null, so every other caller is unchanged.
    iconPainter: Painter? = null,
    iconPainterTint: Color? = null,
    value: String? = null,
    titleColor: Color = MaterialTheme.colorScheme.onSurface,
    chevron: Boolean = true,
    trailing: (@Composable () -> Unit)? = null,
    // ceis: pixel-fit parameters for the Settings screen's reference match. Defaults keep
    // every other caller exactly as it was: the old row is min-54dp with 8dp vertical
    // padding, 16dp horizontal, a 22dp glyph and a 14dp gutter, and the filled chevron.
    rowHeight: Dp? = null,
    horizontalPadding: Dp = 16.dp,
    verticalPadding: Dp = 8.dp,
    // ceis: asymmetric row padding for the phone-calibrated Settings geometry
    // (the reference's icon sits 22dp inside the card edge, the chevron side
    // keeps 16dp). Null falls back to horizontalPadding, so other callers are
    // unchanged.
    startPadding: Dp? = null,
    endPadding: Dp? = null,
    iconSize: Dp = 22.dp,
    // ceis: for raster icons whose artwork carries transparent padding, the visible
    // glyph can draw at a different size than the slot the label column aligns to.
    // When set, the slot keeps iconSize and the image draws centered at this size;
    // nothing clips, so the image may overflow the slot symmetrically. Null keeps
    // every other caller exactly as it was.
    iconGlyphSize: Dp? = null,
    gutter: Dp = 14.dp,
    thinChevron: Boolean = false,
    chevronSpec: MuseChevronSpec = MuseChevronSpec(),
    // ceis: label/value sizes, calibrated against the reference on a real
    // phone (16/14sp rendered too small next to it). Line heights keep the
    // original 21/16 and 18/14 ratios.
    labelSize: TextUnit = 16.sp,
    valueSize: TextUnit = 14.sp,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .then(if (rowHeight != null) Modifier.height(rowHeight) else Modifier.heightIn(min = 54.dp))
            .padding(
                start = startPadding ?: horizontalPadding,
                end = endPadding ?: horizontalPadding,
                top = verticalPadding,
                bottom = verticalPadding,
            ),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (iconPainter != null) {
            // ceis: supplied Settings artwork. The iconTint keeps the single-colour glyphs
            // visible in both themes, exactly like the ImageVector path below. The glyph
            // draws centered in the iconSize slot at iconGlyphSize, so padding-heavy
            // artwork still reads at the intended visible size.
            androidx.compose.foundation.layout.Box(
                modifier = Modifier.size(iconSize),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    painter = iconPainter,
                    contentDescription = null,
                    tint = iconPainterTint ?: MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.size(iconGlyphSize ?: iconSize),
                )
            }
            Spacer(Modifier.width(gutter))
        } else if (icon != null) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.size(iconSize),
            )
            Spacer(Modifier.width(gutter))
        }
        Text(
            text = title,
            fontSize = labelSize,
            lineHeight = (labelSize.value * 21f / 16f).sp,
            color = titleColor,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        if (value != null) {
            Text(
                text = value,
                fontSize = valueSize,
                lineHeight = (valueSize.value * 18f / 14f).sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(start = 12.dp, end = 4.dp),
            )
        }
        if (trailing != null) trailing()
        if (chevron) {
            if (thinChevron) MuseChevron(chevronSpec)
            else Icon(
                imageVector = Icons.AutoMirrored.Filled.KeyboardArrowRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.55f),
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

/** The hairline between two [MuseRow]s, inset past the glyph. */
@Composable
fun MuseRowDivider(inset: Dp = 52.dp, color: Color = MuseTones.hairline) {
    HorizontalDivider(
        modifier = Modifier.padding(start = inset),
        thickness = 0.6.dp,
        color = color,
    )
}

/** The small grey caption Muse sets under a card ("永久删除你的 Muse 数据…"). */
@Composable
fun MuseCaption(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text,
        fontSize = 13.sp,
        lineHeight = 18.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = modifier.padding(horizontal = 32.dp, vertical = 8.dp),
    )
}

/** The small grey label Muse sets above a card ("聊天主题", "模式"). */
@Composable
fun MuseSectionLabel(text: String, modifier: Modifier = Modifier) {
    Text(
        text = text,
        fontSize = 13.sp,
        lineHeight = 18.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        modifier = modifier.padding(start = 32.dp, end = 32.dp, top = 18.dp, bottom = 8.dp),
    )
}

/** Vertical rhythm between cards on a Muse page. */
@Composable
fun MuseGap(height: Dp = 12.dp) = Spacer(Modifier.height(height))
