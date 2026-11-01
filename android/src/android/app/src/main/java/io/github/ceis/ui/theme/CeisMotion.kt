package io.github.ceis.ui.theme

/**
 * Every duration and alpha of the agent reply's motion, in one place. The table
 * in design.md (Agent reply, Motion) and this object are changed together.
 */
object CeisMotion {
    /** One sweep of the running shimmer across a tool row title, linear, looping. */
    const val ShimmerMillis = 1300

    /** One turn of the header activity ring, linear, looping. */
    const val SpinnerMillis = 1000

    /** The running-tasks sheet opening or closing, decelerate. */
    const val SheetMillis = 700

    /** Scrim behind the sheet, as an alpha of black. */
    const val ScrimAlpha = 0.38f

    /** The scroll-to-bottom pill fading out. */
    const val PillFadeMillis = 150
}
