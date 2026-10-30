package io.github.ceis.ui.settings

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Code
import androidx.compose.material.icons.outlined.Computer
import androidx.compose.material.icons.outlined.Description
import androidx.compose.material.icons.outlined.Face
import androidx.compose.material.icons.outlined.Folder
import androidx.compose.material.icons.outlined.FolderShared
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.Inventory2
import androidx.compose.material.icons.outlined.Key
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.PrivacyTip
import androidx.compose.material.icons.outlined.Psychology
import androidx.compose.material.icons.outlined.TouchApp
import androidx.compose.material.icons.outlined.Tune
import androidx.compose.material.icons.outlined.Terminal
import androidx.compose.material.icons.outlined.Language
import androidx.compose.material.icons.outlined.Extension
import androidx.compose.material.icons.outlined.Article
import androidx.compose.material.icons.outlined.Backup
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.core.content.pm.ShortcutManagerCompat
import com.openminis.app.webapp.ShortcutPinner
import io.github.ceis.guard.AppLock
import io.github.ceis.guard.DeviceCredential
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.openminis.app.R
import com.openminis.app.ui.components.openExternalUrl
import com.openminis.app.ui.settings.SettingsScaffold
import io.github.ceis.cloud.CeisCloud
import io.github.ceis.community.UpdateCheck
import io.github.ceis.ui.home.MuseTones
import kotlinx.coroutines.launch

// ceis: the 17-entry settings structure's sub-hubs and status pages live here, next to
// SettingsScreen, so the navigation graph can reach every mapped capability without
// duplicating routes. Everything below reuses the same measured row geometry as the main
// screen (48dp rows, 15dp glyphs, 46dp inset #E5E5E5 dividers, thin chevrons).

const val ROUTE_SETTINGS_HUB_DEVICES = "ceis/settings/devices"
const val ROUTE_SETTINGS_HUB_ASSISTANT = "ceis/settings/assistant"
const val ROUTE_SETTINGS_HUB_DATA = "ceis/settings/data"
const val ROUTE_SETTINGS_HUB_LEGAL = "ceis/settings/legal"
const val ROUTE_SETTINGS_APP_UPDATES = "ceis/settings/updates"
const val ROUTE_SETTINGS_STATUS_MESSAGING = "ceis/settings/status/messaging"
const val ROUTE_SETTINGS_STATUS_APPLOCK = "ceis/settings/status/applock"
const val ROUTE_SETTINGS_STATUS_HOMESCREEN = "ceis/settings/status/homescreen"
const val ROUTE_SETTINGS_STATUS_REDEEM = "ceis/settings/status/redeem"

// ceis: the design border token, kept in sync with SettingsScreen's divider.
private val HubDivider = io.github.ceis.ui.theme.CeisColors.border

data class SettingsHubRow(
    val icon: ImageVector,
    val title: String,
    val value: String? = null,
    val onClick: () -> Unit,
)

/** A plain list of [SettingsHubRow]s in one card, in the main screen's visual language. */
@Composable
fun SettingsHubScreen(
    title: String,
    rows: List<SettingsHubRow>,
    onBack: () -> Unit,
) {
    SettingsScaffold(title = title, titleSize = 24.sp, onBack = onBack) {
        io.github.ceis.ui.muse.MuseCard(inset = 16.dp, radius = 20.dp) {
            rows.forEachIndexed { index, row ->
                if (index > 0) io.github.ceis.ui.muse.MuseRowDivider(inset = 61.dp, color = HubDivider)
                io.github.ceis.ui.muse.MuseRow(
                    // ceis: same phone-calibrated geometry as the main Settings screen.
                    rowHeight = 64.dp, horizontalPadding = 16.dp, verticalPadding = 0.dp,
                    startPadding = 22.dp, endPadding = 16.dp,
                    iconSize = 20.dp, gutter = 19.dp, thinChevron = true,
                    chevronSpec = io.github.ceis.ui.muse.SettingsChevronSpec,
                    labelSize = 20.sp, valueSize = 17.sp,
                    title = row.title, icon = row.icon, value = row.value, onClick = row.onClick,
                )
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

/**
 * ceis: Devices is a hub, not a single screen: the phone's computers, the coding agents on
 * them, and the phone's hands. Computer-related settings live here and only here; there is no
 * separate top-level Computers entry.
 */
@Composable
fun DevicesHubScreen(
    onBack: () -> Unit,
    onComputersClick: () -> Unit,
    onCodingClick: () -> Unit,
    onHandsClick: () -> Unit,
) {
    val context = LocalContext.current
    val hubDevices by io.github.ceis.hub.Hub.devices.collectAsState()
    val me = remember { io.github.ceis.hub.Hub.deviceId(context) }
    val computers = hubDevices.count { it.id != me && it.isComputer }
    val withCoding = hubDevices.count { it.id != me && it.online && it.actions.contains("coding.sessions") }
    SettingsHubScreen(
        title = stringResource(R.string.nm_settings_devices),
        onBack = onBack,
        rows = listOf(
            SettingsHubRow(
                icon = Icons.Outlined.Computer,
                title = stringResource(R.string.nm_pc_title),
                value = if (computers == 0) stringResource(R.string.nm_pc_none_short) else computers.toString(),
                onClick = onComputersClick,
            ),
            SettingsHubRow(
                icon = Icons.Outlined.Code,
                title = stringResource(R.string.nm_coding_title),
                value = if (withCoding == 0) stringResource(R.string.nm_pc_none_short) else withCoding.toString(),
                onClick = onCodingClick,
            ),
            SettingsHubRow(
                icon = Icons.Outlined.TouchApp,
                title = stringResource(R.string.nm_hands_title),
                value = stringResource(if (io.github.ceis.hands.Hands.enabled(context)) R.string.nm_hands_on else R.string.nm_hands_off),
                onClick = onHandsClick,
            ),
        ),
    )
}

/** ceis: choosing the default assistant: the models page, personalization, providers, environment variables, usage. */
@Composable
fun AssistantHubScreen(
    onBack: () -> Unit,
    onModelsClick: () -> Unit,
    onSoulClick: () -> Unit,
    onAvatarClick: () -> Unit,
    onProvidersClick: () -> Unit,
    onEnvVarsClick: () -> Unit,
    onNetworkClick: () -> Unit,
    onSkillsClick: () -> Unit,
    onUsageClick: () -> Unit,
) {
    SettingsHubScreen(
        title = stringResource(R.string.nm_settings_default_assistant),
        onBack = onBack,
        rows = listOf(
            SettingsHubRow(icon = Icons.Outlined.Tune, title = stringResource(R.string.nm_models_title), onClick = onModelsClick),
            SettingsHubRow(icon = Icons.Outlined.AutoAwesome, title = stringResource(R.string.settings_soul), onClick = onSoulClick),
            SettingsHubRow(icon = Icons.Outlined.Face, title = stringResource(R.string.nm_avatar_title), onClick = onAvatarClick),
            SettingsHubRow(icon = Icons.Outlined.Key, title = stringResource(R.string.settings_manage_providers), onClick = onProvidersClick),
            SettingsHubRow(icon = Icons.Outlined.Terminal, title = stringResource(R.string.settings_env_vars), onClick = onEnvVarsClick),
            SettingsHubRow(icon = Icons.Outlined.Language, title = stringResource(R.string.nm_network_title), onClick = onNetworkClick),
            SettingsHubRow(icon = Icons.Outlined.Extension, title = stringResource(R.string.settings_skills), onClick = onSkillsClick),
            SettingsHubRow(icon = Icons.Outlined.BarChart, title = stringResource(R.string.settings_token_usage), onClick = onUsageClick),
        ),
    )
}

/** ceis: the data controls hub: what is kept, where it lives, and how it is backed up. */
@Composable
fun DataHubScreen(
    onBack: () -> Unit,
    onDataControlsClick: () -> Unit,
    onMemoryClick: () -> Unit,
    onSystemFilesClick: () -> Unit,
    onStorageClick: () -> Unit,
    onSharedFoldersClick: () -> Unit,
    onMountedFoldersClick: () -> Unit,
    onBackupClick: () -> Unit,
    onLogsClick: () -> Unit,
) {
    SettingsHubScreen(
        title = stringResource(R.string.nm_settings_data_hub),
        onBack = onBack,
        rows = listOf(
            SettingsHubRow(icon = Icons.Outlined.Lock, title = stringResource(R.string.nm_data_title), onClick = onDataControlsClick),
            SettingsHubRow(icon = Icons.Outlined.Psychology, title = stringResource(R.string.settings_memory), onClick = onMemoryClick),
            SettingsHubRow(icon = Icons.Outlined.Description, title = stringResource(R.string.nm_sysfiles_title), onClick = onSystemFilesClick),
            SettingsHubRow(icon = Icons.Outlined.Inventory2, title = stringResource(R.string.settings_section_storage), onClick = onStorageClick),
            SettingsHubRow(icon = Icons.Outlined.Folder, title = stringResource(R.string.settings_shared_folders), onClick = onSharedFoldersClick),
            SettingsHubRow(icon = Icons.Outlined.FolderShared, title = stringResource(R.string.settings_mount_external_folders), onClick = onMountedFoldersClick),
            SettingsHubRow(icon = Icons.Outlined.Backup, title = stringResource(R.string.settings_backup_restore), onClick = onBackupClick),
            SettingsHubRow(icon = Icons.Outlined.Article, title = stringResource(R.string.settings_section_logs), onClick = onLogsClick),
        ),
    )
}

/** ceis: the legal hub: the policy on the site and the about screen's licences. */
@Composable
fun LegalHubScreen(
    onBack: () -> Unit,
    onPrivacyClick: () -> Unit,
    onAboutClick: () -> Unit,
) {
    SettingsHubScreen(
        title = stringResource(R.string.nm_settings_legal),
        onBack = onBack,
        rows = listOf(
            SettingsHubRow(icon = Icons.Outlined.PrivacyTip, title = stringResource(R.string.settings_privacy_policy), onClick = onPrivacyClick),
            SettingsHubRow(icon = Icons.Outlined.Info, title = stringResource(R.string.nm_settings_about_ceis), onClick = onAboutClick),
        ),
    )
}

/**
 * ceis: which entries are ordered in the main menu but have no working capability in the
 * app. The row still opens a page, but the page says plainly that the capability is not
 * available yet: no fake controls, no dead buttons.
 */
enum class StatusKind(val titleRes: Int, val bodyRes: Int) {
    // ceis: Messaging channels is the only settings entry left with no capability in
    // the app; App lock and Add to home screen became real pages below.
    MESSAGING(R.string.nm_settings_messaging, R.string.nm_status_messaging_body),
}

@Composable
fun FeatureStatusScreen(kind: StatusKind, onBack: () -> Unit) {
    SettingsScaffold(title = stringResource(kind.titleRes), titleSize = 24.sp, onBack = onBack) {
        io.github.ceis.ui.muse.MuseCard(inset = 16.dp, radius = 20.dp) {
            Column(Modifier.padding(16.dp)) {
                Text(
                    text = stringResource(R.string.nm_status_missing),
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    text = stringResource(kind.bodyRes),
                    fontSize = 17.sp,
                    lineHeight = 22.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

/**
 * ceis: the App lock page. The toggle persists in the guard prefs and only arms when
 * the phone itself has a secure lock; without one the page says so and the toggle stays
 * off. When armed, the gate covers the whole app on cold start and on warm resumes
 * after [AppLock.RELOCK_GRACE_MS].
 */
@Composable
fun AppLockScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    var enabled by remember { mutableStateOf(AppLock.enabled(context)) }
    val hasLock = remember { DeviceCredential.available(context) }
    SettingsScaffold(title = stringResource(R.string.nm_applock_title), titleSize = 24.sp, onBack = onBack) {
        io.github.ceis.ui.muse.MuseCard(inset = 16.dp, radius = 20.dp) {
            Column(Modifier.padding(16.dp)) {
                Text(
                    text = stringResource(R.string.nm_applock_intro),
                    fontSize = 17.sp,
                    lineHeight = 22.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                Spacer(Modifier.height(12.dp))
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(
                        text = stringResource(R.string.nm_applock_toggle),
                        fontSize = 17.sp,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.weight(1f),
                    )
                    Switch(
                        checked = enabled && hasLock,
                        enabled = hasLock,
                        onCheckedChange = { on ->
                            AppLock.setEnabled(context, on)
                            enabled = on
                        },
                        colors = SwitchDefaults.colors(
                            checkedTrackColor = MuseTones.action,
                            checkedThumbColor = Color.White,
                        ),
                    )
                }
                Spacer(Modifier.height(8.dp))
                Text(
                    text = stringResource(if (hasLock) R.string.nm_applock_detail else R.string.nm_applock_no_lock),
                    style = MaterialTheme.typography.bodySmall,
                    color = if (hasLock) MaterialTheme.colorScheme.onSurfaceVariant else MaterialTheme.colorScheme.error,
                )
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

/**
 * ceis: the Add to home screen page. The button pins a shortcut that opens the app
 * itself through the same ShortcutManagerCompat path the web-app pin flow uses
 * ([ShortcutPinner.pinApp]). When the launcher does not support pinning, the page says
 * so instead of failing silently.
 */
@Composable
fun HomeScreenPinScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    var outcome by remember { mutableStateOf<Int?>(null) }
    SettingsScaffold(title = stringResource(R.string.nm_homescreen_title), titleSize = 24.sp, onBack = onBack) {
        io.github.ceis.ui.muse.MuseCard(inset = 16.dp, radius = 20.dp) {
            Column(Modifier.padding(16.dp)) {
                Text(
                    text = stringResource(R.string.nm_homescreen_intro),
                    fontSize = 17.sp,
                    lineHeight = 22.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Spacer(Modifier.height(16.dp))
        Button(
            onClick = {
                outcome = when {
                    !ShortcutManagerCompat.isRequestPinShortcutSupported(context) ->
                        R.string.nm_homescreen_unsupported
                    ShortcutPinner.pinApp(context) -> R.string.nm_homescreen_requested
                    else -> R.string.nm_homescreen_failed
                }
            },
            shape = RoundedCornerShape(50),
            colors = ButtonDefaults.buttonColors(
                containerColor = MuseTones.action,
                contentColor = Color.White,
            ),
            modifier = Modifier.fillMaxWidth().height(48.dp),
        ) {
            Text(stringResource(R.string.nm_homescreen_button))
        }
        outcome?.let {
            Spacer(Modifier.height(12.dp))
            Text(
                text = stringResource(it),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        Spacer(Modifier.height(24.dp))
    }
}

/**
 * ceis: the referral redemption page. A pill field takes the friend's code, the brand-primary
 * Redeem button posts it to POST /v1/referral/redeem, and the success card shows the linked
 * state with the refreshed balance. The intro and success copy read the relay's own bonus
 * figure, so when the bonus is off the page says so instead of promising money. The account
 * refresh inside redeemCode updates the same prefs the Wallet rows read, so figures elsewhere
 * update too.
 */
@Composable
fun RedeemScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var code by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var result by remember { mutableStateOf<CeisCloud.RedeemResult?>(null) }
    val account = CeisCloud.account(context)

    fun redeem() {
        if (busy) return
        val trimmed = code.trim()
        if (trimmed.isEmpty()) {
            error = context.getString(R.string.nm_redeem_err_missing)
            return
        }
        error = null
        busy = true
        scope.launch {
            try {
                result = CeisCloud.redeemCode(context, trimmed)
            } catch (e: Exception) {
                error = CeisCloud.describe(context, e)
            }
            busy = false
        }
    }

    SettingsScaffold(title = stringResource(R.string.nm_settings_redeem), titleSize = 24.sp, onBack = onBack) {
        val done = result
        if (done != null) {
            io.github.ceis.ui.muse.MuseCard(inset = 16.dp, radius = 20.dp) {
                Column(Modifier.padding(16.dp)) {
                    Text(
                        text = stringResource(R.string.nm_redeem_success_title),
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        text = if (done.bonusCny > 0) {
                            context.getString(R.string.nm_redeem_success_bonus, io.github.ceis.ui.cloud.money(done.account.toUsd(done.bonusCny)))
                        } else {
                            stringResource(R.string.nm_redeem_success_nobonus)
                        },
                        fontSize = 17.sp,
                        lineHeight = 22.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(10.dp))
                    Text(
                        text = context.getString(R.string.nm_redeem_new_balance, io.github.ceis.ui.cloud.money(done.account.toUsd(done.account.leftCny))),
                        style = MaterialTheme.typography.titleMedium,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                }
            }
        } else {
            io.github.ceis.ui.muse.MuseCard(inset = 16.dp, radius = 20.dp) {
                Column(Modifier.padding(16.dp)) {
                    Text(
                        text = stringResource(R.string.nm_redeem_intro),
                        fontSize = 17.sp,
                        lineHeight = 22.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                    Spacer(Modifier.height(10.dp))
                    val bonusCny = account?.inviteeBonusCny ?: 0.0
                    val bonusLine = if (bonusCny > 0 && account != null) {
                        context.getString(R.string.nm_redeem_bonus_on, io.github.ceis.ui.cloud.money(account.toUsd(bonusCny)))
                    } else {
                        context.getString(R.string.nm_redeem_bonus_off)
                    }
                    Text(
                        text = bonusLine,
                        fontSize = 17.sp,
                        lineHeight = 22.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }
            Spacer(Modifier.height(16.dp))
            val fieldColors = androidx.compose.material3.TextFieldDefaults.colors(
                focusedContainerColor = MuseTones.fill,
                unfocusedContainerColor = MuseTones.fill,
                disabledContainerColor = MuseTones.fill,
                focusedIndicatorColor = Color.Transparent,
                unfocusedIndicatorColor = Color.Transparent,
                disabledIndicatorColor = Color.Transparent,
            )
            androidx.compose.material3.TextField(
                value = code,
                onValueChange = { code = it },
                placeholder = { Text(stringResource(R.string.nm_redeem_code_hint)) },
                singleLine = true,
                enabled = !busy,
                shape = androidx.compose.foundation.shape.RoundedCornerShape(50),
                colors = fieldColors,
                keyboardOptions = androidx.compose.foundation.text.KeyboardOptions(
                    keyboardType = androidx.compose.ui.text.input.KeyboardType.Text,
                    capitalization = androidx.compose.ui.text.input.KeyboardCapitalization.Characters,
                    imeAction = androidx.compose.ui.text.input.ImeAction.Done,
                ),
                keyboardActions = androidx.compose.foundation.text.KeyboardActions(onDone = { redeem() }),
                modifier = Modifier.fillMaxWidth(),
            )
            if (error != null) {
                Spacer(Modifier.height(8.dp))
                Text(
                    text = error.orEmpty(),
                    style = MaterialTheme.typography.bodySmall,
                    color = MuseTones.error,
                )
            }
            Spacer(Modifier.height(12.dp))
            Button(
                onClick = { redeem() },
                enabled = !busy,
                shape = androidx.compose.foundation.shape.RoundedCornerShape(50),
                colors = ButtonDefaults.buttonColors(containerColor = MuseTones.action, contentColor = Color.White),
                modifier = Modifier.fillMaxWidth().height(48.dp),
            ) {
                if (busy) {
                    androidx.compose.material3.CircularProgressIndicator(
                        color = Color.White,
                        strokeWidth = 2.dp,
                        modifier = Modifier.size(20.dp),
                    )
                } else {
                    Text(stringResource(R.string.nm_redeem_button))
                }
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}

/**
 * ceis: the App updates page: the installed build, the latest known release, and a manual
 * check. Reuses the existing [UpdateCheck] state machine; nothing new is downloaded here
 * beyond what the existing update flow already does.
 */
@Composable
fun AppUpdatesScreen(onBack: () -> Unit) {
    val context = LocalContext.current
    val state by UpdateCheck.state.collectAsState()
    LaunchedEffect(Unit) {
        UpdateCheck.load(context)
        UpdateCheck.refreshIfStale(context)
    }
    SettingsScaffold(title = stringResource(R.string.nm_settings_updates), titleSize = 24.sp, onBack = onBack) {
        io.github.ceis.ui.muse.MuseCard(inset = 16.dp, radius = 20.dp) {
            Row(
                modifier = Modifier.fillMaxWidth().height(64.dp).padding(start = 22.dp, end = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(R.string.nm_updates_installed),
                    fontSize = 20.sp,
                    lineHeight = 26.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = UpdateCheck.installed(),
                    fontSize = 17.sp,
                    lineHeight = 22.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            io.github.ceis.ui.muse.MuseRowDivider(inset = 61.dp, color = HubDivider)
            Row(
                modifier = Modifier.fillMaxWidth().height(64.dp).padding(start = 22.dp, end = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(R.string.nm_settings_updates),
                    fontSize = 20.sp,
                    lineHeight = 26.sp,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = when {
                        state?.checking == true -> stringResource(R.string.nm_updates_checking)
                        state?.newer == true -> stringResource(R.string.nm_version_out_update, state?.latest.orEmpty())
                        state?.failed == true -> stringResource(R.string.nm_updates_check_failed)
                        else -> stringResource(R.string.nm_updates_up_to_date)
                    },
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (state?.newer == true) MuseTones.action else MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Spacer(Modifier.height(16.dp))
        Button(
            onClick = { UpdateCheck.checkNow(context) },
            colors = ButtonDefaults.buttonColors(containerColor = MuseTones.action),
            modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        ) {
            Text(text = stringResource(R.string.nm_updates_check))
        }
        if (state?.newer == true) {
            Spacer(Modifier.height(8.dp))
            Button(
                onClick = { openExternalUrl(context, "https://github.com/nano-muse/nanoMuse/releases/latest") },
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.surfaceVariant,
                    contentColor = MaterialTheme.colorScheme.onSurface,
                ),
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
            ) {
                Text(text = stringResource(R.string.nm_updates_download))
            }
        }
        Spacer(Modifier.height(24.dp))
    }
}
