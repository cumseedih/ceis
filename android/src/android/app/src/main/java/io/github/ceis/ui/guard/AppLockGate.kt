package io.github.ceis.ui.guard

import android.app.Activity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import io.github.ceis.guard.DeviceCredential
import io.github.ceis.ui.home.MuseTones
import com.openminis.app.R

/**
 * ceis: the App lock overlay. It covers every screen while the gate is armed, and the
 * only way through is the phone's own screen lock via [DeviceCredential]. A failed or
 * cancelled attempt keeps the overlay up with a retry; system back stays a way out, the
 * app simply stays locked. It never fires for anything else: the approval-card prompts
 * live underneath an unlocked session and confirm one explicit choice at a time.
 */
@Composable
fun AppLockGate(onUnlocked: () -> Unit) {
    val context = LocalContext.current
    val activity = context as? Activity
    var busy by remember { mutableStateOf(false) }
    var failed by remember { mutableStateOf(false) }

    val keyguardLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.StartActivityForResult(),
    ) { result ->
        busy = false
        if (result.resultCode == Activity.RESULT_OK) onUnlocked() else failed = true
    }

    fun unlock() {
        val act = activity ?: return
        if (busy) return
        failed = false
        busy = true
        val title = act.getString(R.string.nm_applock_unlock_title)
        val subtitle = act.getString(R.string.nm_applock_unlock_subtitle)
        if (DeviceCredential.promptsItself()) {
            DeviceCredential.confirm(act, title, subtitle) { ok ->
                busy = false
                if (ok) onUnlocked() else failed = true
            }
        } else {
            val intent = DeviceCredential.keyguardIntent(act, title, subtitle)
            if (intent != null) {
                keyguardLauncher.launch(intent)
            } else {
                busy = false
                failed = true
            }
        }
    }

    // ceis: back leaves the app; the next launch locks again. Never a dead end.
    BackHandler { activity?.finish() }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(MaterialTheme.colorScheme.surface),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            modifier = Modifier.fillMaxWidth().padding(32.dp),
        ) {
            Icon(
                imageVector = Icons.Outlined.Lock,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(44.dp),
            )
            Spacer(Modifier.height(16.dp))
            Text(
                text = stringResource(R.string.nm_applock_locked),
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onSurface,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = stringResource(R.string.nm_applock_unlock_subtitle),
                fontSize = 17.sp,
                lineHeight = 22.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
            Spacer(Modifier.height(24.dp))
            Button(
                onClick = ::unlock,
                enabled = !busy,
                shape = RoundedCornerShape(50),
                colors = ButtonDefaults.buttonColors(
                    containerColor = MuseTones.action,
                    contentColor = Color.White,
                ),
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) {
                Text(stringResource(R.string.nm_applock_unlock))
            }
            if (failed) {
                Spacer(Modifier.height(12.dp))
                Text(
                    text = stringResource(R.string.nm_applock_failed),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}
