package com.openminis.app.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.annotation.DrawableRes
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.openminis.app.R
import io.github.ceis.cloud.CeisCloud

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SettingsScreen(
    onBack: () -> Unit,
    onConnectorsClick: () -> Unit,
    onWalletClick: () -> Unit,
    onCredentialsClick: () -> Unit,
    onPermissionsClick: () -> Unit,
    onMessagingClick: () -> Unit,
    onDevicesClick: () -> Unit,
    onNotificationsClick: () -> Unit,
    onAppearanceClick: () -> Unit,
    onAppLockClick: () -> Unit,
    onDefaultAssistantClick: () -> Unit,
    onHomeScreenClick: () -> Unit,
    onRedeemClick: () -> Unit,
    onDataControlsClick: () -> Unit,
    onReportIssueClick: () -> Unit,
    onHelpClick: () -> Unit,
    onAppUpdatesClick: () -> Unit,
    onLegalInfoClick: () -> Unit,
    onUpgradeClick: () -> Unit = {}, // ceis: the usage card's Upgrade; the account page shows the real ways to get more allowance
) {
    val context = LocalContext.current
    // ceis: the 17-entry main settings menu. Every entry opens a real page, a hub of the
    // mapped existing screens, or an honest not-available page, never a placeholder.
    // Cards: [1-6], [7-11], [12] alone, [13-17]. Dividers sit only between rows inside a
    // card, never above the first or below the last row. The measured row geometry
    // (64dp rows, 26dp visible glyphs, 61dp inset dividers, thin 7x11dp chevrons) is untouched.
    Scaffold(
        containerColor = io.github.ceis.ui.home.MuseTones.fill,
        topBar = {
            io.github.ceis.ui.muse.MuseTopAppBar(
                // ceis: 26sp, bumped after the user's on-device review said the
                // calibrated 24sp still read small (the reference's title cap is 19px).
                titleSize = 26.sp,
                title = { Text(stringResource(R.string.settings_title)) },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(R.string.settings_back),
                        )
                    }
                },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState()),
        ) {
            Spacer(Modifier.height(8.dp))

            // ceis: the allowance card, above the Connectors card like the reference's
            // plan card. Built only from real account fields; absent when signed out,
            // following the account footer's precedent.
            val usageAccount = CeisCloud.account(context)
            if (usageAccount != null && CeisCloud.isSignedIn(context)) {
                SettingsUsageCard(account = usageAccount, onUpgradeClick = onUpgradeClick)
                io.github.ceis.ui.muse.MuseGap(16.dp)
            }

            // ceis: card 1: entries 1-6.
            io.github.ceis.ui.muse.MuseCard(inset = 16.dp, radius = 20.dp) {
                SettingsEntry(
                    title = stringResource(R.string.nm_connectors_title),
                    iconRes = R.drawable.nm_settings_connectors, // ceis: connected nodes for the connectors
                    onClick = onConnectorsClick,
                )
                io.github.ceis.ui.muse.MuseRowDivider(inset = 61.dp, color = SettingsDivider)
                // ceis: Wallet is the real cloud account balance, never a hardcoded figure.
                val cloudAccount = CeisCloud.account(context)
                SettingsEntry(
                    title = stringResource(R.string.nm_settings_wallet),
                    iconRes = R.drawable.nm_settings_wallet,
                    value = when {
                        cloudAccount == null || !CeisCloud.isSignedIn(context) -> null
                        cloudAccount.pricesInMoney && cloudAccount.limited -> "$" + io.github.ceis.ui.cloud.money(cloudAccount.toUsd(cloudAccount.leftCny))
                        else -> null
                    },
                    onClick = onWalletClick,
                )
                io.github.ceis.ui.muse.MuseRowDivider(inset = 61.dp, color = SettingsDivider)
                // ceis: the secure store is the app's own-key credential workflows (the provider add/view/edit/delete screens where the keys are kept)
                SettingsEntry(
                    title = stringResource(R.string.nm_settings_credentials),
                    iconRes = R.drawable.nm_settings_secure_credentials_store, // ceis: a key for the credentials store
                    onClick = onCredentialsClick,
                )
                io.github.ceis.ui.muse.MuseRowDivider(inset = 61.dp, color = SettingsDivider)
                SettingsEntry(
                    title = stringResource(R.string.settings_section_permissions),
                    iconRes = R.drawable.nm_settings_permissions, // ceis: shield-with-check for permissions
                    onClick = onPermissionsClick,
                )
                io.github.ceis.ui.muse.MuseRowDivider(inset = 61.dp, color = SettingsDivider)
                SettingsEntry(
                    title = stringResource(R.string.nm_settings_messaging),
                    iconRes = R.drawable.nm_settings_messaging_channels,
                    onClick = onMessagingClick,
                )
                io.github.ceis.ui.muse.MuseRowDivider(inset = 61.dp, color = SettingsDivider)
                SettingsEntry(
                    title = stringResource(R.string.nm_settings_devices),
                    iconRes = R.drawable.nm_settings_devices,
                    onClick = onDevicesClick,
                )
            }
            io.github.ceis.ui.muse.MuseGap(16.dp)

            // ceis: card 2: entries 7-11.
            io.github.ceis.ui.muse.MuseCard(inset = 16.dp, radius = 20.dp) {
                SettingsEntry(
                    title = stringResource(R.string.nm_settings_notifications),
                    iconRes = R.drawable.nm_settings_notifications,
                    onClick = onNotificationsClick,
                )
                io.github.ceis.ui.muse.MuseRowDivider(inset = 61.dp, color = SettingsDivider)
                SettingsEntry(
                    title = stringResource(R.string.settings_section_appearance),
                    iconRes = R.drawable.nm_settings_appearance,
                    onClick = onAppearanceClick,
                )
                io.github.ceis.ui.muse.MuseRowDivider(inset = 61.dp, color = SettingsDivider)
                SettingsEntry(
                    title = stringResource(R.string.nm_settings_applock),
                    iconRes = R.drawable.nm_settings_app_lock, // ceis: house silhouette closest to the reference's app-lock glyph
                    value = stringResource(if (io.github.ceis.guard.AppLock.enabled(context)) R.string.nm_applock_on else R.string.nm_applock_off),
                    onClick = onAppLockClick,
                )
                io.github.ceis.ui.muse.MuseRowDivider(inset = 61.dp, color = SettingsDivider)
                SettingsEntry(
                    title = stringResource(R.string.nm_settings_default_assistant),
                    iconRes = R.drawable.nm_settings_default_assistant,
                    onClick = onDefaultAssistantClick,
                )
                io.github.ceis.ui.muse.MuseRowDivider(inset = 61.dp, color = SettingsDivider)
                SettingsEntry(
                    title = stringResource(R.string.nm_settings_home_screen),
                    iconRes = R.drawable.nm_settings_add_to_home_screen,
                    onClick = onHomeScreenClick,
                )
            }
            io.github.ceis.ui.muse.MuseGap(16.dp)

            // ceis: card 3: entry 12 alone.
            io.github.ceis.ui.muse.MuseCard(inset = 16.dp, radius = 20.dp) {
                SettingsEntry(
                    title = stringResource(R.string.nm_settings_redeem),
                    iconRes = R.drawable.nm_settings_redeem_referral_code,
                    onClick = onRedeemClick,
                )
            }
            io.github.ceis.ui.muse.MuseGap(16.dp)

            // ceis: card 4: entries 13-17 in one card of five.
            io.github.ceis.ui.muse.MuseCard(inset = 16.dp, radius = 20.dp) {
                SettingsEntry(
                    title = stringResource(R.string.nm_data_title),
                    iconRes = R.drawable.nm_settings_data_controls,
                    onClick = onDataControlsClick,
                )
                io.github.ceis.ui.muse.MuseRowDivider(inset = 61.dp, color = SettingsDivider)
                SettingsEntry(
                    title = stringResource(R.string.nm_settings_report),
                    iconRes = R.drawable.nm_settings_report_an_issue,
                    onClick = onReportIssueClick,
                )
                io.github.ceis.ui.muse.MuseRowDivider(inset = 61.dp, color = SettingsDivider)
                SettingsEntry(
                    title = stringResource(R.string.nm_settings_help),
                    iconRes = R.drawable.nm_settings_help_and_support,
                    onClick = onHelpClick,
                )
                io.github.ceis.ui.muse.MuseRowDivider(inset = 61.dp, color = SettingsDivider)
                SettingsEntry(
                    title = stringResource(R.string.nm_settings_updates),
                    iconRes = R.drawable.nm_settings_app_updates,
                    onClick = onAppUpdatesClick,
                )
                io.github.ceis.ui.muse.MuseRowDivider(inset = 61.dp, color = SettingsDivider)
                SettingsEntry(
                    title = stringResource(R.string.nm_settings_legal),
                    iconRes = R.drawable.nm_settings_legal_info, // ceis: shield-with-checkmark for legal info
                    onClick = onLegalInfoClick,
                )
            }

            // ceis: the account footer, in the reference's separation: the real signed-in
            // account's tag as presentation only. Nothing is invented; when signed out the
            // footer is simply absent.
            val accountTag = CeisCloud.account(context)?.takeIf { CeisCloud.isSignedIn(context) }?.tag
            if (accountTag != null) {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = stringResource(R.string.nm_settings_your_account),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        text = accountTag,
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
            }

            Spacer(Modifier.height(24.dp))
        }
    }
}

/** One of the 17 main entries: the measured row geometry, thin chevron, no subtitle. */
@Composable
private fun SettingsEntry(
    title: String,
    @DrawableRes iconRes: Int,
    value: String? = null,
    onClick: () -> Unit,
) {
    // ceis: the supplied Settings icon set, drawn as-is. onSurface tint keeps the
    // single-colour glyphs legible in both themes, exactly like the previous vectors.
    // ceis: phone-calibrated geometry (1.5 px/dp at the 720px screenshot scale):
    // 64dp rows, 20dp icon slot, 22/16dp asymmetric padding, 19dp gutter, 61dp
    // divider inset, 22/18sp text, 7x11dp chevron. The glyph draws centered in the
    // slot at its own visible size (see settingsGlyphSize); the slot keeps the label
    // column aligned across rows.
    io.github.ceis.ui.muse.MuseRow(
        rowHeight = 64.dp, horizontalPadding = 16.dp, verticalPadding = 0.dp,
        startPadding = 22.dp, endPadding = 16.dp,
        iconSize = 20.dp, iconGlyphSize = settingsGlyphSize(iconRes), gutter = 19.dp, thinChevron = true,
        chevronSpec = io.github.ceis.ui.muse.SettingsChevronSpec,
        labelSize = 22.sp, valueSize = 18.sp,
        title = title, iconPainter = painterResource(id = iconRes), value = value, onClick = onClick,
    )
}

// ceis: the supplied PNGs carry transparent padding, so a fixed box renders a smaller
// glyph. Each size below is 26dp of visible glyph (the user's call after on-device
// review; his spec range was 26-30dp) divided by the icon's own alpha content fraction,
// measured from the PNGs; the PNGs are unmodified.
private fun settingsGlyphSize(@DrawableRes iconRes: Int): androidx.compose.ui.unit.Dp = when (iconRes) {
    R.drawable.nm_settings_connectors -> 39.dp
    R.drawable.nm_settings_wallet -> 38.2.dp
    R.drawable.nm_settings_secure_credentials_store -> 37.6.dp
    R.drawable.nm_settings_permissions -> 26.dp
    R.drawable.nm_settings_messaging_channels -> 29.dp
    R.drawable.nm_settings_devices -> 29.7.dp
    R.drawable.nm_settings_notifications -> 37.9.dp
    R.drawable.nm_settings_appearance -> 37.6.dp
    R.drawable.nm_settings_app_lock -> 38.2.dp
    R.drawable.nm_settings_default_assistant -> 37.6.dp
    R.drawable.nm_settings_add_to_home_screen -> 38.2.dp
    R.drawable.nm_settings_redeem_referral_code -> 26.dp
    R.drawable.nm_settings_data_controls -> 37.6.dp
    R.drawable.nm_settings_report_an_issue -> 38.2.dp
    R.drawable.nm_settings_help_and_support -> 28.5.dp
    R.drawable.nm_settings_app_updates -> 28.5.dp
    R.drawable.nm_settings_legal_info -> 33.dp
    else -> 20.dp
}

/**
 * The allowance card at the top of Settings. It follows the reference's two-section
 * shape, but every figure is a real account field: section 1 is the lifetime
 * allowance pool (which never resets, as the account page's own copy says), section 2
 * is today's share of the grant, shown only when the relay enforces a daily cap.
 * There is no weekly reset and no second balance in the data, so neither is shown.
 */
@Composable
private fun SettingsUsageCard(
    account: CeisCloud.Account,
    onUpgradeClick: () -> Unit,
) {
    // ceis: section 1, the pool. Money-priced relays measure it in dollars, older
    // token relays in tokens; an unlimited account has no pool to show.
    val money = account.pricesInMoney
    val tokenLimited = !money && account.granted > 0
    val limited = account.limited || tokenLimited
    val usedFraction: Float = when {
        !limited -> 0f
        money -> account.spendFraction
        else -> (account.used.toFloat() / account.granted.toFloat()).coerceIn(0f, 1f)
    }
    val pctText = if (limited) {
        stringResource(R.string.nm_settings_allowance_used_pct, (usedFraction * 100).toInt())
    } else {
        stringResource(R.string.nm_settings_allowance_unlimited)
    }
    val subtitleText = if (limited) {
        stringResource(R.string.nm_settings_allowance_no_reset)
    } else {
        stringResource(R.string.nm_settings_allowance_no_ceiling)
    }
    // ceis: section 2, today's share. The relay enforces it in tokens and reports it
    // whether or not the pool is money-priced; members have no daily cap.
    val showToday = account.dailyCap > 0 && !account.unlimited
    val todayFraction = if (showToday) {
        (account.usedToday.toFloat() / account.dailyCap.toFloat()).coerceIn(0f, 1f)
    } else 0f
    val todayLeft = (account.dailyCap - account.usedToday).coerceAtLeast(0)

    io.github.ceis.ui.muse.MuseCard(inset = 16.dp, radius = 20.dp) {
        Column(Modifier.padding(horizontal = 16.dp)) {
            Spacer(Modifier.height(16.dp))
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                Text(
                    text = stringResource(R.string.nm_settings_allowance_title),
                    fontSize = 14.sp,
                    fontWeight = androidx.compose.ui.text.font.FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    text = pctText,
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            Text(
                text = subtitleText,
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(top = 4.dp),
            )
            if (limited) {
                Spacer(Modifier.height(16.dp))
                UsageBar(fraction = usedFraction)
            }
            if (showToday) {
                Spacer(Modifier.height(18.dp))
                Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        text = stringResource(R.string.nm_settings_allowance_today),
                        fontSize = 14.sp,
                        fontWeight = androidx.compose.ui.text.font.FontWeight.Medium,
                        color = MaterialTheme.colorScheme.onSurface,
                        modifier = Modifier.weight(1f),
                    )
                    Text(
                        text = stringResource(
                            R.string.nm_settings_allowance_used_with_left,
                            (todayFraction * 100).toInt(),
                            java.text.NumberFormat.getIntegerInstance().format(todayLeft),
                        ),
                        fontSize = 12.sp,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }
                Text(
                    text = stringResource(R.string.nm_settings_allowance_resets_midnight),
                    fontSize = 12.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    modifier = Modifier.padding(top = 4.dp),
                )
                Spacer(Modifier.height(12.dp))
                UsageBar(fraction = todayFraction)
            }
            Spacer(Modifier.height(18.dp))
            io.github.ceis.ui.muse.MuseRowDivider(inset = 0.dp, color = SettingsDivider)
            Spacer(Modifier.height(12.dp))
            Text(
                text = stringResource(R.string.nm_settings_upgrade),
                fontSize = 16.sp,
                color = io.github.ceis.ui.home.MuseTones.action,
                modifier = Modifier.clickable(onClick = onUpgradeClick),
            )
            Spacer(Modifier.height(16.dp))
        }
    }
}

// ceis: card tokens measured against the Muse reference (720px, 1.5 px/dp):
// 9px bar = 6dp, fully rounded; track #E7E7E7, fill #0463D1 (we keep our brand
// #005ABF); title ~13sp Medium, small text ~10-12sp, hairline divider directly
// above the left-aligned Upgrade text action, 16dp card padding.
/** A usage progress bar: the track in the hairline grey, the fill in the brand primary. */
@Composable
private fun UsageBar(fraction: Float) {
    androidx.compose.foundation.layout.Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(6.dp)
            .clip(androidx.compose.foundation.shape.RoundedCornerShape(6.dp))
            .background(io.github.ceis.ui.theme.CeisColors.border),
    ) {
        androidx.compose.foundation.layout.Box(
            modifier = Modifier
                .fillMaxHeight()
                .fillMaxWidth(fraction.coerceIn(0f, 1f))
                .background(io.github.ceis.ui.theme.CeisColors.primary),
        )
    }
}

// ceis: the Settings page's measured geometry against the Muse reference, calibrated
// on the user's phone (1.5 px/dp at the 720px screenshot scale): 64dp rows, 20dp glyphs,
// 16dp card inset, 20dp radius, 16dp gaps, 22/16dp row padding, 19dp gutter, 61dp divider
// inset, 26sp title, 22/18sp row text, 7x11dp chevron. Keep in sync with MuseChrome's
// pixel-fit params.
private val SettingsDivider = io.github.ceis.ui.theme.CeisColors.border

/**
 * Build the GitHub Issues "new bug report" URL with the body pre-filled
 * from the existing bug-report template. Platform / OS version / app
 * version / device model are injected so the report arrives ready to
 * triage instead of asking the user to fill in environment details.
 *
 * URL shape:
 *   https://github.com/OpenMinis/OpenMinis/issues/new
 *     ?template=bug_report.md
 *     &title=[Bug]
 *     &body=<percent-encoded markdown>
 *
 * The body is a Markdown template with sections for Problem Summary,
 * Basic Information (table — auto-filled), Steps to Reproduce, Error
 * Details (fenced code block), Expected Behavior, and Additional
 * Information.
 */
// ceis: the repository uses an issue form (app_bug_report.yml), which
// takes its fields as query parameters; `body` is ignored by forms.
fun buildBugReportUrl(): String {
    val osVersion = android.os.Build.VERSION.RELEASE
    val sdkInt = android.os.Build.VERSION.SDK_INT
    val versionName = com.openminis.app.BuildConfig.VERSION_NAME
    val versionCode = com.openminis.app.BuildConfig.VERSION_CODE
    val manufacturer = android.os.Build.MANUFACTURER
    val model = android.os.Build.MODEL

    // Body matches the spec template. Triple-backtick fences are written
    // as "```" — they survive percent-encoding cleanly. Indentation here
    // is significant: trimIndent() removes the common Kotlin indentation
    // but preserves the Markdown structure as-is.
    val body = """
        ## 📝 Problem Summary

        <!-- Briefly describe the issue you encountered -->


        ## 📱 Basic Information

        | Field | Value |
        |-------|-------|
        | Platform | Android |
        | OS Version | Android $osVersion (API $sdkInt) |
        | ceis Version | $versionName (build $versionCode) |
        | Device Model | $manufacturer $model |

        ## 🔁 Steps to Reproduce

        1.
        2.
        3.

        ## ❌ Error Details

        ```
        paste error here
        ```

        ## ✅ Expected Behavior



        ## 🗂️ Additional Information

    """.trimIndent()

    val encodedBody = java.net.URLEncoder.encode(body, "UTF-8")
    // Title carries a "[Bug] " prefix with a trailing space so the cursor
    // lands after it on GitHub's page; encode the space as %20 explicitly
    // since URLEncoder turns spaces into '+' which GitHub also accepts but
    // the spec calls for the literal "[Bug] " form.
    val title = java.net.URLEncoder.encode("[Bug] ", "UTF-8")
    // ceis: the repository uses an issue form (app_bug_report.yml), which
    // takes its fields as query parameters; `body` is ignored by forms.
    val version = java.net.URLEncoder.encode("$versionName ($versionCode)", "UTF-8")
    val device = java.net.URLEncoder.encode("Android $osVersion (API $sdkInt), $manufacturer $model", "UTF-8")
    return "https://github.com/nano-muse/ceis/issues/new" +
        "?template=app_bug_report.yml" +
        "&title=$title" +
        "&version=$version" +
        "&device=$device" +
        "&body=$encodedBody"
}
