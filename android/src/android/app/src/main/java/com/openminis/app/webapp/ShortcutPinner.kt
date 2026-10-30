package com.openminis.app.webapp

import android.content.Context
import android.content.Intent
import android.graphics.Bitmap
import android.os.Build
import android.widget.Toast
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import com.openminis.app.MainActivity
import com.openminis.app.R
import com.openminis.app.data.db.WebAppShortcutEntity

/**
 * T-pwa-1 (renamed Pwa → WebApp): pin a WebApp shortcut to the user's
 * launcher. Wraps [ShortcutManagerCompat.requestPinShortcut] with the
 * fallbacks needed for pre-Oreo devices and unsupported launchers.
 */
object ShortcutPinner {

    fun pin(
        context: Context,
        shortcut: WebAppShortcutEntity,
        iconBitmap: Bitmap?,
    ): Boolean {
        if (!ShortcutManagerCompat.isRequestPinShortcutSupported(context)) {
            Toast.makeText(context, R.string.webapp_pin_unsupported, Toast.LENGTH_LONG).show()
            return false
        }

        val icon: IconCompat = when {
            iconBitmap == null -> IconCompat.createWithResource(
                context, R.mipmap.ic_launcher,
            )
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ->
                IconCompat.createWithAdaptiveBitmap(iconBitmap)
            else -> IconCompat.createWithBitmap(iconBitmap)
        }

        val launchIntent = Intent(context, WebAppActivity::class.java).apply {
            action = WebAppActivity.ACTION_OPEN_WEBAPP
            putExtra(WebAppActivity.EXTRA_SHORTCUT_ID, shortcut.id)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        }

        val info = ShortcutInfoCompat.Builder(context, "webapp_${shortcut.id}")
            .setShortLabel(shortcut.title)
            .setLongLabel(shortcut.title)
            .setIcon(icon)
            .setIntent(launchIntent)
            .build()

        return runCatching {
            ShortcutManagerCompat.requestPinShortcut(context, info, null)
        }.getOrElse {
            Toast.makeText(context, R.string.webapp_pin_failed, Toast.LENGTH_LONG).show()
            false
        }
    }

    /**
     * wevvy: pin a shortcut that opens the app itself (Settings > Add to home screen),
     * through the same ShortcutManagerCompat path as the web-app pin flow. Returns
     * whether the request was handed to the launcher; the caller reports the outcome
     * in its own copy.
     */
    fun pinApp(context: Context): Boolean {
        if (!ShortcutManagerCompat.isRequestPinShortcutSupported(context)) return false
        val launchIntent = Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_MAIN
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
        }
        val label = context.getString(R.string.app_name)
        val info = ShortcutInfoCompat.Builder(context, "wevvy_app_home")
            .setShortLabel(label)
            .setLongLabel(label)
            .setIcon(IconCompat.createWithResource(context, R.mipmap.ic_launcher))
            .setIntent(launchIntent)
            .build()
        return runCatching {
            ShortcutManagerCompat.requestPinShortcut(context, info, null)
        }.getOrDefault(false)
    }
}
