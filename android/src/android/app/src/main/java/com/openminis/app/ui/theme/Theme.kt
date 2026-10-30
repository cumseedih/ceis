package com.openminis.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight // ceis
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

// Accent: iOS blue, desaturated. [T-android-accent-blue-parity]
//
// Was a teal (#2E8B8B / #4DD9D9) that predated iOS settling on blue. The hue
// now comes from iOS Assets.xcassets/AccentColor.colorset (sRGB components
// r0.212 g0.525 b0.933 -> #3686EE light, r0.329 g0.565 b0.894 -> #5490E4 dark),
// but iOS's saturation (84% / 73%) read as glaring on Android's darker
// surfaces, so SATURATION is dialled back ~30% with hue and lightness kept:
//   light  #3686EE  S84% L57%  ->  #528AD2  S59% L57%
//   dark   #5490E4  S73% L61%  ->  #6A94CE  S51% L61%
//
// Lightness is deliberately NOT raised, which is the other way to "lighten".
// It would have softened dark mode further but pushed light-mode contrast on
// white from 3.62 to 2.62 — below WCAG AA's 4.5 for text. Desaturating keeps
// dark mode at 5.93 (passing) and leaves light mode where it was.
//
// Names keep the `Teal` prefix only to avoid churning 90+ call sites; the
// value is the contract, not the name.
private val TealPrimary = Color(0xFF005ABF)
private val TealOnPrimary = Color(0xFFFFFFFF)
private val TealPrimaryContainer = Color(0xFFE6EEF9)
private val TealOnPrimaryContainer = Color(0xFF00408A)
private val TealSecondary = Color(0xFF4F5B6E)
private val TealOnSecondary = Color(0xFFFFFFFF)
private val TealSecondaryContainer = Color(0xFFDCE6F5)
private val TealOnSecondaryContainer = Color(0xFF101C2E)
private val TealTertiary = Color(0xFF0064D4) // ceis: design tokens (link blue)
private val TealOnTertiary = Color(0xFFFFFFFF)
private val TealTertiaryContainer = Color(0xFFE6EEF9) // ceis: design tokens
private val TealOnTertiaryContainer = Color(0xFF00408A) // ceis: design tokens
private val TealBackground = Color(0xFFFCFCFC) // ceis: design tokens (page)
private val TealOnBackground = Color(0xFF111112) // ceis: design tokens (text)
private val TealSurface = Color(0xFFFFFFFF) // ceis: design tokens
private val TealOnSurface = Color(0xFF111112) // ceis: design tokens (text)
private val TealSurfaceVariant = Color(0xFFFFFFFF) // ceis: design tokens (cards stay white)
private val TealOnSurfaceVariant = Color(0xFF3C3C43)
private val TealOutline = Color(0xFFE5E7EB) // ceis: design tokens (border)

private val TealDarkPrimary = Color(0xFF0064D4)
private val TealDarkOnPrimary = Color(0xFF00224D)
private val TealDarkPrimaryContainer = Color(0xFF0F2542)
private val TealDarkOnPrimaryContainer = Color(0xFFE6EEF9)
private val TealDarkSecondary = Color(0xFFB8C6DA)
private val TealDarkOnSecondary = Color(0xFF22304A)
private val TealDarkSecondaryContainer = Color(0xFF334159)
private val TealDarkOnSecondaryContainer = Color(0xFFDCE6F5)
private val TealDarkBackground = Color(0xFF000000)
private val TealDarkOnBackground = Color(0xFFE6EEF9)
private val TealDarkSurface = Color(0xFF000000)
private val TealDarkOnSurface = Color(0xFFE6EEF9)
private val TealDarkSurfaceVariant = Color(0xFF3C3C43)
private val TealDarkOnSurfaceVariant = Color(0xFFC7C7CC)
private val TealDarkOutline = Color(0xFF8E8E93)

// Neutral grouped-card surfaces.
// Override Material3's tonal `surfaceContainer*` so cards don't pick up the
// primary tint.
// Light: page = #FCFCFC, card = white
// Dark:  page = #000, card = #1C1C1E
private val NeutralGroupedBg = Color(0xFFFCFCFC) // ceis: design tokens
private val NeutralGroupedCard = Color(0xFFFFFFFF)
private val NeutralGroupedCardElevated = Color(0xFFF7F7FA)
private val NeutralOutline = Color(0xFFE5E7EB) // ceis: design tokens

private val NeutralDarkGroupedBg = Color(0xFF000000)
private val NeutralDarkGroupedCard = Color(0xFF1C1C1E)
private val NeutralDarkGroupedCardElevated = Color(0xFF2C2C2E)
private val NeutralDarkOutline = Color(0xFF38383A)

private val LightColorScheme = lightColorScheme(
    primary = TealPrimary,
    onPrimary = TealOnPrimary,
    primaryContainer = TealPrimaryContainer,
    onPrimaryContainer = TealOnPrimaryContainer,
    secondary = TealSecondary,
    onSecondary = TealOnSecondary,
    secondaryContainer = TealSecondaryContainer,
    onSecondaryContainer = TealOnSecondaryContainer,
    tertiary = TealTertiary,
    onTertiary = TealOnTertiary,
    tertiaryContainer = TealTertiaryContainer,
    onTertiaryContainer = TealOnTertiaryContainer,
    background = NeutralGroupedBg,
    onBackground = TealOnBackground,
    surface = NeutralGroupedBg,
    onSurface = TealOnSurface,
    surfaceVariant = NeutralGroupedCard,
    onSurfaceVariant = TealOnSurfaceVariant,
    surfaceContainerLowest = NeutralGroupedBg,
    surfaceContainerLow = NeutralGroupedCard,
    surfaceContainer = NeutralGroupedCard,
    surfaceContainerHigh = NeutralGroupedCardElevated,
    surfaceContainerHighest = NeutralGroupedCardElevated,
    outline = NeutralOutline,
    outlineVariant = NeutralOutline,
    error = Color(0xFFD92D20), // ceis: design tokens
    onError = Color(0xFFFFFFFF),
)

private val DarkColorScheme = darkColorScheme(
    primary = TealDarkPrimary,
    onPrimary = TealDarkOnPrimary,
    primaryContainer = TealDarkPrimaryContainer,
    onPrimaryContainer = TealDarkOnPrimaryContainer,
    secondary = TealDarkSecondary,
    onSecondary = TealDarkOnSecondary,
    secondaryContainer = TealDarkSecondaryContainer,
    onSecondaryContainer = TealDarkOnSecondaryContainer,
    background = NeutralDarkGroupedBg,
    onBackground = TealDarkOnBackground,
    surface = NeutralDarkGroupedBg,
    onSurface = TealDarkOnSurface,
    surfaceVariant = NeutralDarkGroupedCard,
    onSurfaceVariant = TealDarkOnSurfaceVariant,
    surfaceContainerLowest = NeutralDarkGroupedBg,
    surfaceContainerLow = NeutralDarkGroupedCard,
    surfaceContainer = NeutralDarkGroupedCard,
    surfaceContainerHigh = NeutralDarkGroupedCardElevated,
    surfaceContainerHighest = NeutralDarkGroupedCardElevated,
    outline = NeutralDarkOutline,
    outlineVariant = NeutralDarkOutline,
)

// App-wide FAB accent color (warm beige, matching iOS New Chat button).
// Reads from ChatPalette so it follows the in-app theme override (theme_mode pref),
// not android.isSystemInDarkTheme(), which only tracks the system setting.
@Composable
fun minisFabColor(): Color = LocalChatPalette.current.fabAccent

// App-wide shape system — the ceis radius scale 0/4/8/16/24/full
// (ceis: was 12/12/20/24/28; full pill shapes are set per component)
private val MinisShapes = Shapes(
    extraSmall = RoundedCornerShape(4.dp),    // DropdownMenu, Tooltip
    small = RoundedCornerShape(8.dp),         // Chip, TextField
    medium = RoundedCornerShape(16.dp),       // Card, Snackbar
    large = RoundedCornerShape(24.dp),        // NavigationDrawer
    extraLarge = RoundedCornerShape(24.dp),   // Dialog, BottomSheet
)

@Composable
fun MinisTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    fontScale: Float = 1f,
    content: @Composable () -> Unit,
) {
    val colorScheme = if (darkTheme) DarkColorScheme else LightColorScheme
    val typography = scaledTypography(fontScale)
    val chatPalette = if (darkTheme) DarkChatPalette else LightChatPalette

    MaterialTheme(
        colorScheme = colorScheme,
        shapes = MinisShapes,
        typography = typography,
    ) {
        CompositionLocalProvider(LocalChatPalette provides chatPalette, content = content)
    }
}

private fun TextStyle.scale(factor: Float): TextStyle =
    if (factor == 1f) this else copy(fontSize = fontSize * factor)

// ceis: ceis's type ramp, on the system face (the brand font file was not
// supplied, so the platform sans stays). Zero tracking throughout; the steps the
// design file names map onto Material's slots, the rest keep Muse's scale.
private fun museTypography(): Typography {
    val base = Typography()
    fun TextStyle.muse(size: Int, line: Int, weight: FontWeight = FontWeight.Normal) =
        copy(fontSize = size.sp, lineHeight = line.sp, letterSpacing = 0.sp, fontWeight = weight)
    return Typography(
        displayLarge = base.displayLarge.muse(56, 64, FontWeight.SemiBold),
        displayMedium = base.displayMedium.muse(44, 52, FontWeight.SemiBold),
        displaySmall = base.displaySmall.muse(36, 44, FontWeight.SemiBold),
        headlineLarge = base.headlineLarge.muse(32, 40, FontWeight.SemiBold),
        headlineMedium = base.headlineMedium.muse(28, 36, FontWeight.SemiBold),
        headlineSmall = base.headlineSmall.muse(25, 30, FontWeight.Medium), // ceis: design tokens
        titleLarge = base.titleLarge.muse(22, 28, FontWeight.SemiBold),
        titleMedium = base.titleMedium.muse(17, 22, FontWeight.SemiBold),
        titleSmall = base.titleSmall.muse(15, 20, FontWeight.Medium),
        bodyLarge = base.bodyLarge.muse(18, 26), // ceis: design tokens
        bodyMedium = base.bodyMedium.muse(16, 24), // ceis: design tokens
        bodySmall = base.bodySmall.muse(14, 20), // ceis: design tokens
        labelLarge = base.labelLarge.muse(14, 20, FontWeight.Medium), // ceis: design tokens
        labelMedium = base.labelMedium.muse(12, 16, FontWeight.Medium), // ceis: design tokens
        labelSmall = base.labelSmall.muse(12, 18), // ceis: caption from the design tokens
    )
}

private fun scaledTypography(factor: Float): Typography {
    val base = museTypography() // ceis: was Material's default scale
    return Typography(
        displayLarge = base.displayLarge.scale(factor),
        displayMedium = base.displayMedium.scale(factor),
        displaySmall = base.displaySmall.scale(factor),
        headlineLarge = base.headlineLarge.scale(factor),
        headlineMedium = base.headlineMedium.scale(factor),
        headlineSmall = base.headlineSmall.scale(factor),
        titleLarge = base.titleLarge.scale(factor),
        titleMedium = base.titleMedium.scale(factor),
        titleSmall = base.titleSmall.scale(factor),
        bodyLarge = base.bodyLarge.scale(factor),
        bodyMedium = base.bodyMedium.scale(factor),
        bodySmall = base.bodySmall.scale(factor),
        labelLarge = base.labelLarge.scale(factor),
        labelMedium = base.labelMedium.scale(factor),
        labelSmall = base.labelSmall.scale(factor),
    )
}
