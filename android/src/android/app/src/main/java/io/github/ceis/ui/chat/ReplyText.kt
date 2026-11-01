package io.github.ceis.ui.chat

/** Small pure text helpers for the agent reply. Unit-tested. */
internal object ReplyText {
    /**
     * A reply's markdown as plain words for the read-aloud voice: code fences
     * and their contents dropped, emphasis marks, heading marks, list bullets
     * and link targets removed.
     */
    fun forSpeech(markdown: String): String {
        var text = markdown.replace(Regex("(?s)```.*?```"), " ")
        text = text.replace(Regex("`([^`]*)`"), "$1")
        text = text.replace(Regex("!?\\[([^\\]]*)]\\([^)]*\\)"), "$1")
        text = text.replace(Regex("(?m)^\\s{0,3}#{1,6}\\s+"), "")
        text = text.replace(Regex("(?m)^\\s*[-*+]\\s+"), "")
        text = text.replace(Regex("(?m)^\\s*\\d+[.)]\\s+"), "")
        text = text.replace(Regex("\\*\\*|__|\\*|~~"), "")
        return text.lines().map { it.trim() }.filter { it.isNotEmpty() }.joinToString(" ")
    }

    /** "45s", "2m 10s", "1h 5m": how long a run has been going. */
    fun elapsed(millis: Long): String {
        val total = (millis.coerceAtLeast(0L)) / 1000L
        val hours = total / 3600L
        val minutes = (total % 3600L) / 60L
        val seconds = total % 60L
        return when {
            hours > 0L -> "${hours}h ${minutes}m"
            minutes > 0L -> "${minutes}m ${seconds}s"
            else -> "${seconds}s"
        }
    }
}
