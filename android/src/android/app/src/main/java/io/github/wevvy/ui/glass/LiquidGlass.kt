package io.github.wevvy.ui.glass

import android.os.Build
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.graphics.Outline
import androidx.compose.ui.graphics.drawscope.DrawScope
import androidx.compose.ui.graphics.drawscope.DrawStyle
import androidx.compose.ui.graphics.drawscope.Fill
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.unit.dp
import dev.chrisbanes.haze.HazeState
import dev.chrisbanes.haze.HazeStyle
import dev.chrisbanes.haze.hazeEffect

/**
 * Liquid Glass, Wevvy's Android implementation of the material specified in
 * design.md at the repository root, section "Liquid Glass material (Wevvy
 * addendum, 2026-10-23)", which itself follows Apple's documentation (the
 * Liquid Glass technology overview, the HIG chapter on Materials, and the
 * SwiftUI guidance for applying Liquid Glass to custom views).
 *
 * What the material is, and how this file approximates each behaviour:
 *
 * - Backdrop blur with a luminosity adjustment: Haze (the same engine the
 *   home shell's tab bar already uses) samples the content behind the
 *   surface and blurs it; the tint is applied at an alpha that lifts the
 *   backdrop toward the surface colour, which is the luminosity adjustment
 *   in this approximation. Haze needs a [HazeState] whose source the host
 *   marks with `Modifier.hazeSource`; without one there is nothing to blur.
 * - Specular edge: a one-pixel rim stroke whose vertical gradient is bright
 *   at the top, softer at the sides and faint at the bottom, plus a soft
 *   white sheen that falls off from the top. The sheen stands in for the
 *   inner refraction falloff at the rim (the lensing approximation).
 * - Variants: [LiquidGlassVariant.Regular] is the default, a faint tint of
 *   the surface colour over the blur. [LiquidGlassVariant.Clear] is more
 *   translucent and is reserved for controls floating over photos or video;
 *   pass [mediaDimming] (design.md: 35 percent) to lay a dark dimming layer
 *   under the tint when the media beneath is bright.
 * - Interactive flex: [LiquidGlassSurface] scales to about 0.98 and lifts
 *   the specular highlight while pressed, returning with a spring. The
 *   plain [liquidGlass] modifier stays static; interactivity belongs to the
 *   surface that owns the press state.
 * - Reduced transparency: Android gives apps no system signal for reduced
 *   transparency, so the fallback triggers are the ones available here: the
 *   platform is below API 31 (no RenderEffect blur), no [HazeState] was
 *   supplied, or the caller passes `forceOpaque`. The fallback is the same
 *   shape and edge treatment over a near-opaque tint, so the layout and the
 *   silhouette survive with the material gone.
 * - Never glass on glass: this is a leaf material. Children of a glass
 *   surface use flat fills and transparency, never [liquidGlass] again.
 *
 * Limits of the approximation, stated plainly: Android has no refraction
 * API, so there is no true lensing (light bending at the rim is faked by
 * the sheen and the rim gradient), no real-time reflection of surrounding
 * content beyond the blurred backdrop, and neighbouring glass elements do
 * not blend or morph into each other. Separation deepening while content
 * scrolls beneath is the host's shadow and this blur strengthening only if
 * the host animates them; the component itself is scroll-agnostic.
 */
enum class LiquidGlassVariant {
    /** Default: backdrop blur, luminosity lift, faint surface tint. */
    Regular,

    /** Higher translucency, for controls over photos or video only. */
    Clear,
}

/** The material's numbers, in one place so hosts do not hard-code them. */
object LiquidGlassDefaults {
    /** Tint alpha over the blur, regular variant. */
    const val RegularTintAlpha = 0.55f

    /** Tint alpha over the blur, clear variant. */
    const val ClearTintAlpha = 0.18f

    /** Tint alpha when the opaque fallback is in use. */
    const val FallbackTintAlpha = 0.94f

    /** Backdrop blur radius, regular variant. */
    val RegularBlurRadius = 26.dp

    /** Backdrop blur radius, clear variant. */
    val ClearBlurRadius = 18.dp

    /** Grain Haze mixes into the blur; keeps large flat areas from banding. */
    const val NoiseFactor = 0.05f

    /** Scale of an interactive surface at full press. */
    const val PressedScale = 0.98f
}

/**
 * Applies the Liquid Glass material to the element this modifier is chained
 * on, clipped to [shape]. [tint] is the surface colour the material tints
 * toward; its alpha comes from the variant (see [LiquidGlassDefaults]).
 * [specularLift] is 0 at rest and rises toward 1 while an interactive host
 * is pressed; static hosts leave it at 0.
 *
 * The chain order matters and mirrors the tab bar's proven pattern: clip
 * first so the blur cannot paint square corners, then the material, then
 * the specular pass over the top.
 */
fun Modifier.liquidGlass(
    hazeState: HazeState?,
    shape: Shape,
    tint: Color,
    variant: LiquidGlassVariant = LiquidGlassVariant.Regular,
    specularLift: Float = 0f,
    forceOpaque: Boolean = false,
    mediaDimming: Float = 0f,
): Modifier {
    val blurCapable = hazeState != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
    val useBlur = blurCapable && !forceOpaque
    val tintAlpha = when {
        !useBlur -> LiquidGlassDefaults.FallbackTintAlpha
        variant == LiquidGlassVariant.Clear -> LiquidGlassDefaults.ClearTintAlpha
        else -> LiquidGlassDefaults.RegularTintAlpha
    }
    val blurRadius = if (variant == LiquidGlassVariant.Clear) {
        LiquidGlassDefaults.ClearBlurRadius
    } else {
        LiquidGlassDefaults.RegularBlurRadius
    }
    val material = if (useBlur) {
        Modifier.hazeEffect(state = hazeState!!) {
            style = HazeStyle(
                backgroundColor = tint.copy(alpha = tintAlpha),
                blurRadius = blurRadius,
                noiseFactor = LiquidGlassDefaults.NoiseFactor,
                tints = emptyList(),
            )
        }
    } else {
        Modifier.background(tint.copy(alpha = tintAlpha), shape)
    }
    val dim = if (mediaDimming > 0f) {
        Modifier.background(Color.Black.copy(alpha = mediaDimming.coerceIn(0f, 1f)), shape)
    } else {
        Modifier
    }
    return this
        .clip(shape)
        .then(dim)
        .then(material)
        .specularEdge(shape, specularLift)
}

/**
 * The specular pass: a rim stroke and a top sheen drawn over the material
 * (and over any content the host draws inside the same element, at alphas
 * low enough to read as surface light rather than a wash).
 */
private fun Modifier.specularEdge(shape: Shape, lift: Float): Modifier =
    this.drawWithContent {
        drawContent()
        val outline = shape.createOutline(size, layoutDirection, this)
        // Sheen: soft light entering from the top, gone by mid-height. This
        // is the inner refraction falloff approximation.
        drawGlassOutline(
            outline = outline,
            brush = Brush.verticalGradient(
                colors = listOf(
                    Color.White.copy(alpha = 0.08f + 0.14f * lift),
                    Color.White.copy(alpha = 0f),
                ),
                startY = 0f,
                endY = size.height * 0.55f,
            ),
        )
        // Rim: bright at the top where the light lands, softer down the
        // sides, faint at the bottom.
        drawGlassOutline(
            outline = outline,
            brush = Brush.verticalGradient(
                colors = listOf(
                    Color.White.copy(alpha = 0.65f + 0.25f * lift),
                    Color.White.copy(alpha = 0.20f + 0.10f * lift),
                    Color.White.copy(alpha = 0.05f),
                ),
                startY = 0f,
                endY = size.height,
            ),
            style = Stroke(width = 1.dp.toPx()),
        )
    }

/**
 * Draws an [Outline] with the basic DrawScope primitives, by shape kind.
 * The Compose version on this project's classpath has no drawOutline, so
 * the specular pass goes through here. Rounded outlines in this app use
 * one uniform corner radius, so the top-left radius stands in for all
 * four corners.
 */
private fun DrawScope.drawGlassOutline(outline: Outline, brush: Brush, style: DrawStyle = Fill) {
    when (outline) {
        is Outline.Rectangle -> drawRect(brush = brush, style = style)
        is Outline.Rounded -> drawRoundRect(
            brush = brush,
            cornerRadius = outline.roundRect.topLeftCornerRadius,
            style = style,
        )
        is Outline.Generic -> drawPath(path = outline.path, brush = brush, style = style)
    }
}

/**
 * A leaf surface carrying the Liquid Glass material, with [content] laid
 * out inside it. Children must use flat fills: never nest a second glass
 * surface inside this one.
 *
 * When [onClick] is set (or [interactive] is true), a press flexes the
 * surface: a small scale down and a lift of the specular highlight, both
 * returning on a spring, the gel motion design.md asks for.
 */
@Composable
fun LiquidGlassSurface(
    hazeState: HazeState?,
    modifier: Modifier = Modifier,
    shape: Shape,
    tint: Color,
    variant: LiquidGlassVariant = LiquidGlassVariant.Regular,
    forceOpaque: Boolean = false,
    mediaDimming: Float = 0f,
    interactive: Boolean = false,
    onClick: (() -> Unit)? = null,
    content: @Composable BoxScope.() -> Unit,
) {
    val isInteractive = interactive || onClick != null
    val interactionSource = remember { MutableInteractionSource() }
    val pressed by interactionSource.collectIsPressedAsState()
    val flexSpec = spring<Float>(
        dampingRatio = Spring.DampingRatioMediumBouncy,
        stiffness = Spring.StiffnessMediumLow,
    )
    val scale by animateFloatAsState(
        targetValue = if (isInteractive && pressed) LiquidGlassDefaults.PressedScale else 1f,
        animationSpec = flexSpec,
        label = "liquidGlassScale",
    )
    val lift by animateFloatAsState(
        targetValue = if (isInteractive && pressed) 1f else 0f,
        animationSpec = flexSpec,
        label = "liquidGlassLift",
    )
    Box(
        modifier = modifier
            .then(
                if (isInteractive) {
                    // The press state has to come from somewhere: with no
                    // onClick of its own, an interactive surface still takes
                    // the press (and consumes it) purely to drive the flex.
                    Modifier.clickable(
                        interactionSource = interactionSource,
                        indication = null,
                        onClick = onClick ?: {},
                    )
                } else {
                    Modifier
                },
            )
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .liquidGlass(
                hazeState = hazeState,
                shape = shape,
                tint = tint,
                variant = variant,
                specularLift = lift,
                forceOpaque = forceOpaque,
                mediaDimming = mediaDimming,
            ),
        content = content,
    )
}
