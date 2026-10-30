package io.github.wevvy.guard

import android.content.Context
import android.content.SharedPreferences

/**
 * wevvy: App lock — the phone's own screen lock (biometric, PIN, pattern or password) as
 * the gate over the whole app. The confirmation itself is [DeviceCredential], the same
 * system prompt the highest-tier approval confirmations already use; this object only
 * tracks whether the feature is on and when the app last left the foreground.
 *
 * Nothing is stored that could unlock the app by itself: the phone's lock remains the
 * authority. If the phone has no secure lock, the feature cannot arm and the settings
 * page says so instead of pretending to lock.
 */
object AppLock {

    private const val PREFS = "wevvy.guard.appLock"
    private const val KEY_ENABLED = "enabled"
    private const val KEY_BACKGROUNDED_AT = "backgroundedAt"

    /** Warm resumes after this long in the background ask for the lock again. */
    const val RELOCK_GRACE_MS = 60_000L

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    /** The raw toggle. The gate uses [armed], which also requires a lock to confirm with. */
    fun enabled(context: Context): Boolean = prefs(context).getBoolean(KEY_ENABLED, false)

    fun setEnabled(context: Context, on: Boolean) {
        prefs(context).edit().putBoolean(KEY_ENABLED, on).apply()
    }

    /** True when the feature is on AND the phone actually has a lock to confirm with. */
    fun armed(context: Context): Boolean = enabled(context) && DeviceCredential.available(context)

    /** Whether the lock overlay must cover the app on a cold start. */
    fun lockOnStart(context: Context): Boolean = armed(context)

    /** Whether a warm resume must relock: backgrounded longer than the grace period. */
    fun relockOnResume(context: Context): Boolean {
        if (!armed(context)) return false
        val at = prefs(context).getLong(KEY_BACKGROUNDED_AT, 0L)
        return at > 0L && System.currentTimeMillis() - at > RELOCK_GRACE_MS
    }

    /** The activity is leaving the foreground; the timestamp drives the grace period. */
    fun noteBackgrounded(context: Context) {
        prefs(context).edit().putLong(KEY_BACKGROUNDED_AT, System.currentTimeMillis()).apply()
    }

    /** The app is in front and unlocked again; restart the grace window. */
    fun markUnlocked(context: Context) {
        prefs(context).edit().putLong(KEY_BACKGROUNDED_AT, System.currentTimeMillis()).apply()
    }
}
