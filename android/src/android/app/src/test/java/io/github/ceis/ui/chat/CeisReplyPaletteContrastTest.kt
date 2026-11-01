package io.github.ceis.ui.chat

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import io.github.ceis.ui.theme.CeisReplyPalette
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.pow

/**
 * Locks the WCAG AA ratios of the agent-reply palette in code, the same pairs
 * as replica/design/tokens.json and tokens.dark.json: 4.5 for text, 3 for
 * icons and borders.
 */
class CeisReplyPaletteContrastTest {
    private fun channel(v: Int): Double {
        val c = v / 255.0
        return if (c <= 0.04045) c / 12.92 else ((c + 0.055) / 1.055).pow(2.4)
    }

    private fun luminance(color: Color): Double {
        val argb = color.toArgb()
        val r = (argb shr 16) and 0xFF
        val g = (argb shr 8) and 0xFF
        val b = argb and 0xFF
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
    }

    private fun ratio(fg: Color, bg: Color): Double {
        val a = luminance(fg)
        val b = luminance(bg)
        return (maxOf(a, b) + 0.05) / (minOf(a, b) + 0.05)
    }

    private fun atLeast(min: Double, fg: Color, bg: Color, label: String) {
        val r = ratio(fg, bg)
        assertTrue("$label is %.2f, needs $min".format(r), r >= min)
    }

    private fun check(p: CeisReplyPalette, page: Color, name: String) {
        atLeast(4.5, p.toolText, page, "$name toolText on page")
        atLeast(4.5, p.toolTextPeak, page, "$name toolTextPeak on page")
        atLeast(3.0, p.outline, page, "$name outline on page")
        atLeast(4.5, p.diffAdd, page, "$name diffAdd on page")
        atLeast(4.5, p.diffRemove, page, "$name diffRemove on page")
        atLeast(4.5, p.link, page, "$name link on page")
        atLeast(4.5, p.toolText, p.rowFill, "$name toolText on rowFill")
        atLeast(4.5, p.toolTextPeak, p.rowFill, "$name toolTextPeak on rowFill")
        atLeast(4.5, p.link, p.rowFill, "$name link on rowFill")
        atLeast(4.5, p.diffAdd, p.rowFill, "$name diffAdd on rowFill")
        atLeast(4.5, p.diffRemove, p.rowFill, "$name diffRemove on rowFill")
        atLeast(3.0, p.toolTextPeak, p.pillFill, "$name pill arrow on pill")
    }

    @Test
    fun lightPaletteMeetsAA() = check(CeisReplyPalette.Default, Color.White, "light")

    @Test
    fun darkPaletteMeetsAA() = check(CeisReplyPalette.Dark, Color.Black, "dark")
}
