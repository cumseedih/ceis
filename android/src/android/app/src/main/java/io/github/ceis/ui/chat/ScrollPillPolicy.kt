package io.github.ceis.ui.chat

/**
 * When the scroll-to-bottom pill is shown. Pure, so the rule is unit-tested.
 *
 * The inputs are the chat screen's own scroll state, which this does not
 * replace: `userScrolledAway` flips on a real drag away from the end and clears
 * at the end or on a tap, `contentOverflows` is false for a short chat.
 */
internal object ScrollPillPolicy {
    fun visible(userScrolledAway: Boolean, contentOverflows: Boolean, hasMessages: Boolean): Boolean =
        userScrolledAway && contentOverflows && hasMessages
}
